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

  return (
    <main className="min-h-screen px-4 py-6 max-w-md mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">{user.name}님</h1>
        <LogoutButton />
      </div>

      <div className="space-y-2">
        {isAdmin ? (
          <Link
            href="/admin"
            className="block bg-white border border-neutral-200 rounded-xl p-4 text-base font-medium"
          >
            관리자
          </Link>
        ) : (
          <Link
            href="/me"
            className="block bg-white border border-neutral-200 rounded-xl p-4 text-base font-medium"
          >
            내 기록
          </Link>
        )}
      </div>
    </main>
  );
}
