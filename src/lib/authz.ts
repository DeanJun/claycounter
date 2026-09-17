import { prisma } from "@/lib/prisma";

export type ClubRole = "admin" | "member";

/** club 단위 role 체크. 개인 사용자도 본인 개인 club의 admin이므로 동일 로직으로 처리됨. */
export async function getClubRole(
  userId: string,
  clubId: string
): Promise<ClubRole | null> {
  const membership = await prisma.clubMembership.findUnique({
    where: { userId_clubId: { userId, clubId } },
  });
  return (membership?.role as ClubRole | undefined) ?? null;
}

export async function requireClubAdmin(userId: string, clubId: string) {
  const role = await getClubRole(userId, clubId);
  if (role !== "admin") {
    throw new Error("FORBIDDEN");
  }
}

/** 사용자가 admin 권한을 가진 club 중 하나를 반환 (단일 클럽 운영 전제, 첫 번째 것 사용). */
export async function getAdminClubId(userId: string): Promise<string | null> {
  const membership = await prisma.clubMembership.findFirst({
    where: { userId, role: "admin" },
    select: { clubId: true },
  });
  return membership?.clubId ?? null;
}
