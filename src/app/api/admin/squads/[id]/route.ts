import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/auth";
import { getAdminClubId } from "@/lib/authz";
import { computeSquadPosition } from "@/lib/squad";
import { isDiscipline } from "@/lib/discipline";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });

  const clubId = await getAdminClubId(userId);
  if (!clubId) return NextResponse.json({ error: "관리자 권한이 없습니다." }, { status: 403 });

  const squad = await prisma.squad.findUnique({
    where: { id },
    include: {
      slots: {
        orderBy: { order: "asc" },
        include: {
          round: {
            include: {
              shooter: { select: { id: true, name: true } },
              targets: { orderBy: { targetNumber: "asc" } },
            },
          },
        },
      },
    },
  });

  if (!squad || squad.clubId !== clubId) {
    return NextResponse.json({ error: "기록을 찾을 수 없습니다." }, { status: 404 });
  }

  const slots = squad.slots.map((slot) => ({
    order: slot.order,
    roundId: slot.roundId,
    shooterId: slot.round.shooter.id,
    shooterName: slot.round.shooter.name,
    targets: slot.round.targets.map((t) => ({
      targetNumber: t.targetNumber,
      firstResult: t.firstResult as "hit" | "miss",
      secondResult: t.secondResult as "hit" | "miss" | null,
    })),
  }));

  const position = computeSquadPosition(slots);

  return NextResponse.json({
    id: squad.id,
    status: squad.status,
    discipline: squad.discipline,
    slots,
    position,
  });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });

  const clubId = await getAdminClubId(userId);
  if (!clubId) return NextResponse.json({ error: "관리자 권한이 없습니다." }, { status: 403 });

  const squad = await prisma.squad.findUnique({ where: { id }, select: { clubId: true } });
  if (!squad || squad.clubId !== clubId) {
    return NextResponse.json({ error: "기록을 찾을 수 없습니다." }, { status: 404 });
  }

  const body = await req.json().catch(() => null);
  const discipline = body?.discipline;
  if (!isDiscipline(discipline)) {
    return NextResponse.json({ error: "잘못된 종목입니다." }, { status: 400 });
  }

  await prisma.$transaction([
    prisma.squad.update({ where: { id }, data: { discipline } }),
    prisma.round.updateMany({
      where: { slot: { squadId: id } },
      data: { discipline },
    }),
  ]);

  return NextResponse.json({ ok: true, discipline });
}
