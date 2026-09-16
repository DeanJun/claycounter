import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword, signSession, setSessionCookie } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const name = typeof body?.name === "string" ? body.name.trim() : "";
  const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof body?.password === "string" ? body.password : "";

  if (!name || !email || password.length < 8) {
    return NextResponse.json(
      { error: "name, email, password(8자 이상)가 필요합니다." },
      { status: 400 }
    );
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json({ error: "이미 가입된 이메일입니다." }, { status: 409 });
  }

  const passwordHash = await hashPassword(password);

  const user = await prisma.$transaction(async (tx) => {
    const created = await tx.user.create({
      data: { name, email, password: passwordHash },
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

  return NextResponse.json({ id: user.id, name: user.name, email: user.email });
}
