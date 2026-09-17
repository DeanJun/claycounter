import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyPassword, signSession, setSessionCookie } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const name = typeof body?.name === "string" ? body.name.trim() : "";
  const pin = typeof body?.pin === "string" ? body.pin : "";

  if (!name || !pin) {
    return NextResponse.json({ error: "이름과 PIN이 필요합니다." }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { name } });
  if (!user || !(await verifyPassword(pin, user.pin))) {
    return NextResponse.json({ error: "이름 또는 PIN이 올바르지 않습니다." }, { status: 401 });
  }

  const token = signSession({ userId: user.id });
  await setSessionCookie(token);

  return NextResponse.json({ id: user.id, name: user.name });
}
