import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/auth";
import { getAdminClubId } from "@/lib/authz";

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
