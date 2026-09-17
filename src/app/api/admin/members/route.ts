import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/auth";
import { getCurrentUserId } from "@/lib/auth";
import { getAdminClubId } from "@/lib/authz";

export async function GET() {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });

  const clubId = await getAdminClubId(userId);
  if (!clubId) return NextResponse.json({ error: "관리자 권한이 없습니다." }, { status: 403 });

  const memberships = await prisma.clubMembership.findMany({
    where: { clubId },
    include: { user: { select: { id: true, name: true, createdAt: true } } },
    orderBy: { user: { createdAt: "asc" } },
  });

  return NextResponse.json(
    memberships.map((m) => ({
      id: m.user.id,
      name: m.user.name,
      role: m.role,
      createdAt: m.user.createdAt,
    }))
  );
}

export async function POST(req: NextRequest) {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });

  const clubId = await getAdminClubId(userId);
  if (!clubId) return NextResponse.json({ error: "관리자 권한이 없습니다." }, { status: 403 });

  const body = await req.json().catch(() => null);
  const name = typeof body?.name === "string" ? body.name.trim() : "";
  const pin = typeof body?.pin === "string" ? body.pin : "";

  if (!name || !/^\d{4}$/.test(pin)) {
    return NextResponse.json(
      { error: "이름과 4자리 숫자 PIN이 필요합니다." },
      { status: 400 }
    );
  }

  const existing = await prisma.user.findUnique({ where: { name } });
  if (existing) {
    return NextResponse.json({ error: "이미 사용 중인 이름입니다." }, { status: 409 });
  }

  const pinHash = await hashPassword(pin);

  const created = await prisma.$transaction(async (tx) => {
    const user = await tx.user.create({ data: { name, pin: pinHash } });
    await tx.clubMembership.create({
      data: { userId: user.id, clubId, role: "member" },
    });
    return user;
  });

  return NextResponse.json({ id: created.id, name: created.name });
}
