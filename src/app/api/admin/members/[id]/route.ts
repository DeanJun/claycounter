import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId, hashPassword } from "@/lib/auth";
import { getAdminClubId } from "@/lib/authz";

const RESET_PIN = "0000";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });

  const clubId = await getAdminClubId(userId);
  if (!clubId) return NextResponse.json({ error: "관리자 권한이 없습니다." }, { status: 403 });

  const membership = await prisma.clubMembership.findUnique({
    where: { userId_clubId: { userId: id, clubId } },
  });
  if (!membership) {
    return NextResponse.json({ error: "회원을 찾을 수 없습니다." }, { status: 404 });
  }

  const body = await req.json().catch(() => null);
  const name = typeof body?.name === "string" ? body.name.trim() : undefined;
  const resetPin = body?.resetPin === true;

  if (name === undefined && !resetPin) {
    return NextResponse.json({ error: "변경할 내용이 없습니다." }, { status: 400 });
  }

  if (name !== undefined) {
    if (!name) {
      return NextResponse.json({ error: "이름을 입력해주세요." }, { status: 400 });
    }
    const existing = await prisma.user.findUnique({ where: { name } });
    if (existing && existing.id !== id) {
      return NextResponse.json({ error: "이미 사용 중인 이름입니다." }, { status: 409 });
    }
  }

  const data: { name?: string; pin?: string } = {};
  if (name !== undefined) data.name = name;
  if (resetPin) data.pin = await hashPassword(RESET_PIN);

  const updated = await prisma.user.update({ where: { id }, data });

  return NextResponse.json({ id: updated.id, name: updated.name });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });

  const clubId = await getAdminClubId(userId);
  if (!clubId) return NextResponse.json({ error: "관리자 권한이 없습니다." }, { status: 403 });

  const membership = await prisma.clubMembership.findUnique({
    where: { userId_clubId: { userId: id, clubId } },
  });
  if (!membership) {
    return NextResponse.json({ error: "회원을 찾을 수 없습니다." }, { status: 404 });
  }
  if (membership.role === "admin") {
    return NextResponse.json({ error: "관리자는 제거할 수 없습니다." }, { status: 400 });
  }

  await prisma.clubMembership.delete({ where: { id: membership.id } });

  return NextResponse.json({ ok: true });
}
