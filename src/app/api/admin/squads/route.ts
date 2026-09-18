import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/auth";
import { getAdminClubId } from "@/lib/authz";
import { isDiscipline } from "@/lib/discipline";

export async function GET() {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });

  const clubId = await getAdminClubId(userId);
  if (!clubId) return NextResponse.json({ error: "관리자 권한이 없습니다." }, { status: 403 });

  const squads = await prisma.squad.findMany({
    where: { clubId },
    orderBy: { createdAt: "desc" },
    take: 20,
    include: {
      slots: {
        orderBy: { order: "asc" },
        include: { round: { include: { shooter: { select: { name: true } } } } },
      },
    },
  });

  return NextResponse.json(
    squads.map((s) => ({
      id: s.id,
      date: s.date,
      status: s.status,
      discipline: s.discipline,
      shooters: s.slots.map((slot) => slot.round.shooter.name),
    }))
  );
}

export async function POST(req: NextRequest) {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });

  const clubId = await getAdminClubId(userId);
  if (!clubId) return NextResponse.json({ error: "관리자 권한이 없습니다." }, { status: 403 });

  const body = await req.json().catch(() => null);
  const memberIds: unknown = body?.memberIds;
  const discipline: unknown = body?.discipline;

  if (!Array.isArray(memberIds) || memberIds.length < 1 || memberIds.length > 6) {
    return NextResponse.json({ error: "사수는 1~6명이어야 합니다." }, { status: 400 });
  }
  if (!memberIds.every((id) => typeof id === "string")) {
    return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }
  if (!isDiscipline(discipline)) {
    return NextResponse.json({ error: "종목을 선택해주세요." }, { status: 400 });
  }

  const memberships = await prisma.clubMembership.findMany({
    where: { clubId, userId: { in: memberIds as string[] } },
  });
  if (memberships.length !== memberIds.length) {
    return NextResponse.json({ error: "클럽에 속하지 않은 사수가 포함되어 있습니다." }, { status: 400 });
  }

  const squad = await prisma.$transaction(async (tx) => {
    const created = await tx.squad.create({
      data: { clubId, date: new Date(), discipline, enteredById: userId, status: "in_progress" },
    });

    for (let i = 0; i < memberIds.length; i++) {
      const shooterId = memberIds[i] as string;
      const round = await tx.round.create({
        data: { shooterId, clubId, date: new Date(), discipline, enteredById: userId },
      });
      await tx.squadSlot.create({
        data: { squadId: created.id, order: i + 1, roundId: round.id },
      });
    }

    return created;
  });

  return NextResponse.json({ id: squad.id });
}
