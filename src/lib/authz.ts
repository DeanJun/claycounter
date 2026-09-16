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
