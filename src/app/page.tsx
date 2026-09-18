import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUserId } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

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
    <main className="min-h-screen p-8 max-w-2xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold">안녕하세요, {user.name}님</h1>

      <section>
        <h2 className="font-semibold mb-2">소속 클럽</h2>
        <ul className="space-y-1">
          {user.memberships.map((m) => (
            <li key={m.club.id} className="text-sm">
              {m.club.name} ({m.role}
              {m.club.isPersonal ? ", 개인" : ""})
            </li>
          ))}
        </ul>
      </section>

      <div className="flex gap-4">
        <Link href="/me" className="inline-block underline text-sm">
          내 기록 보기
        </Link>
        {isAdmin && (
          <Link href="/admin" className="inline-block underline text-sm">
            관리자 페이지로 이동
          </Link>
        )}
      </div>
    </main>
  );
}
