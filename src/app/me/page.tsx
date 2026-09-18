import { redirect } from "next/navigation";
import { getCurrentUserId } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { computeRoundStats } from "@/lib/scoring";
import { DISCIPLINE_LABELS, type Discipline } from "@/lib/discipline";

function formatDateTime(date: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}년 ${pad(date.getMonth() + 1)}월 ${pad(date.getDate())}일 ${pad(
    date.getHours()
  )}시 ${pad(date.getMinutes())}분`;
}

export default async function MyRecordsPage() {
  const userId = await getCurrentUserId();
  if (!userId) redirect("/login");

  const rounds = await prisma.round.findMany({
    where: { shooterId: userId },
    orderBy: { date: "desc" },
    include: { targets: { orderBy: { targetNumber: "asc" } } },
  });

  return (
    <main className="min-h-screen p-6 max-w-2xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold">내 기록</h1>

      {rounds.length === 0 && (
        <p className="text-sm text-neutral-500">아직 기록이 없습니다.</p>
      )}

      <ul className="space-y-3">
        {rounds.map((r) => {
          const stats = computeRoundStats(
            r.targets.map((t) => ({
              targetNumber: t.targetNumber,
              station: t.station,
              firstResult: t.firstResult as "hit" | "miss",
              secondResult: t.secondResult as "hit" | "miss" | null,
            }))
          );
          const discipline = r.discipline as Discipline;

          return (
            <li key={r.id} className="bg-white rounded-lg shadow p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-semibold">{formatDateTime(r.date)}</span>
                <span className="text-sm text-neutral-500">
                  {DISCIPLINE_LABELS[discipline] ?? discipline}
                </span>
              </div>
              <div className="grid grid-cols-4 gap-2 text-center text-sm">
                <div>
                  <div className="text-lg font-bold">{stats.score}/25</div>
                  <div className="text-neutral-500">점수</div>
                </div>
                <div>
                  <div className="text-lg font-bold">{stats.overallPct.toFixed(0)}%</div>
                  <div className="text-neutral-500">전체 명중률</div>
                </div>
                <div>
                  <div className="text-lg font-bold">{stats.firstBarrelPct.toFixed(0)}%</div>
                  <div className="text-neutral-500">초격명중률</div>
                </div>
                <div>
                  <div className="text-lg font-bold">{stats.recoveryPct.toFixed(0)}%</div>
                  <div className="text-neutral-500">재격성공률</div>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </main>
  );
}
