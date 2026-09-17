import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword, signSession, setSessionCookie } from "@/lib/auth";

export async function POST(req: NextRequest) {
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

  const user = await prisma.$transaction(async (tx) => {
    const created = await tx.user.create({
      data: { name, pin: pinHash },
    });

    const personalClub = await tx.club.create({
      data: { name: `${name}의 개인 기록`, isPersonal: true },
    });

    await tx.clubMembership.create({
      data: { userId: created.id, clubId: personalClub.id, role: "admin" },
    });

    return created;
  });

  const token = signSession({ userId: user.id });
  await setSessionCookie(token);

  return NextResponse.json({ id: user.id, name: user.name });
}
