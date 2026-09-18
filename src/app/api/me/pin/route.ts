import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId, hashPassword, verifyPassword } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });

  const body = await req.json().catch(() => null);
  const currentPin = typeof body?.currentPin === "string" ? body.currentPin : "";
  const newPin = typeof body?.newPin === "string" ? body.newPin : "";

  if (!/^\d{4}$/.test(newPin)) {
    return NextResponse.json({ error: "새 PIN은 숫자 4자리여야 합니다." }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user || !(await verifyPassword(currentPin, user.pin))) {
    return NextResponse.json({ error: "현재 PIN이 올바르지 않습니다." }, { status: 401 });
  }

  const pinHash = await hashPassword(newPin);
  await prisma.user.update({ where: { id: userId }, data: { pin: pinHash } });

  return NextResponse.json({ ok: true });
}
