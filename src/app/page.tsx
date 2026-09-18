import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUserId } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { LogoutButton } from "@/components/LogoutButton";

export default async function Home() {
  const userId = await getCurrentUserId();
  if (!userId) redirect("/login");

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { memberships: { include: { club: true } } },
  });

  if (!user) redirect("/login");

  const isAdmin = user.memberships.some((m) => m.role === "admin");

  // 일반 유저는 경기에 참여만 하므로 버튼 없이 바로 본인 기록 화면으로.
  if (!isAdmin) redirect("/me");

  return (
    <main className="min-h-full px-4 py-6 max-w-md mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">{user.name}님</h1>
        <LogoutButton />
      </div>

      <div className="space-y-2">
        <Link
          href="/admin/squad/new"
          className="block bg-white border border-neutral-200 rounded-xl p-4 text-base font-medium"
        >
          경기 시작
        </Link>
        <Link
          href="/admin/members"
          className="block bg-white border border-neutral-200 rounded-xl p-4 text-base font-medium"
        >
          회원 추가/제거
        </Link>
        <Link
          href="/admin/squads"
          className="block bg-white border border-neutral-200 rounded-xl p-4 text-base font-medium"
        >
          최근 기록
        </Link>
      </div>
    </main>
  );
}
