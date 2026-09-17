import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/auth";
import { getAdminClubId } from "@/lib/authz";
import { stationOf } from "@/lib/scoring";
import { computeSquadPosition } from "@/lib/squad";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });

  const clubId = await getAdminClubId(userId);
  if (!clubId) return NextResponse.json({ error: "관리자 권한이 없습니다." }, { status: 403 });

  const body = await req.json().catch(() => null);
  const roundId = typeof body?.roundId === "string" ? body.roundId : "";
  const targetNumber = Number(body?.targetNumber);
  const phase = body?.phase;
  const result = body?.result;

  if (
    !roundId ||
    !Number.isInteger(targetNumber) ||
    targetNumber < 1 ||
    targetNumber > 25 ||
    (phase !== "first" && phase !== "second") ||
    (result !== "hit" && result !== "miss")
  ) {
    return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }

  const squad = await prisma.squad.findUnique({
    where: { id },
    include: {
      slots: {
        orderBy: { order: "asc" },
        include: { round: { include: { targets: true } } },
      },
    },
  });

  if (!squad || squad.clubId !== clubId) {
    return NextResponse.json({ error: "기록을 찾을 수 없습니다." }, { status: 404 });
  }

  const slot = squad.slots.find((s) => s.roundId === roundId);
  if (!slot) {
    return NextResponse.json({ error: "잘못된 사수입니다." }, { status: 400 });
  }

  const station = stationOf(targetNumber);

  if (phase === "first") {
    await prisma.target.upsert({
      where: { roundId_targetNumber: { roundId, targetNumber } },
      create: { roundId, targetNumber, station, firstResult: result, secondResult: null },
      update: { firstResult: result, secondResult: null },
    });
  } else {
    const existing = slot.round.targets.find((t) => t.targetNumber === targetNumber);
    if (!existing || existing.firstResult !== "miss") {
      return NextResponse.json({ error: "재격 대상이 아닙니다." }, { status: 400 });
    }
    await prisma.target.update({
      where: { roundId_targetNumber: { roundId, targetNumber } },
      data: { secondResult: result },
    });
  }

  const refreshed = await prisma.squad.findUniqueOrThrow({
    where: { id },
    include: {
      slots: {
        orderBy: { order: "asc" },
        include: { round: { include: { targets: true } } },
      },
    },
  });

  const slotsForPosition = refreshed.slots.map((s) => ({
    order: s.order,
    roundId: s.roundId,
    targets: s.round.targets.map((t) => ({
      targetNumber: t.targetNumber,
      firstResult: t.firstResult as "hit" | "miss",
      secondResult: t.secondResult as "hit" | "miss" | null,
    })),
  }));

  const position = computeSquadPosition(slotsForPosition);

  if (!position && refreshed.status !== "completed") {
    await prisma.squad.update({ where: { id }, data: { status: "completed" } });
  }

  return NextResponse.json({ position, completed: !position });
}
