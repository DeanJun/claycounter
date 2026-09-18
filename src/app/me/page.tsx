import { redirect } from "next/navigation";
import { getCurrentUserId } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { computeRoundStats, type RoundStats } from "@/lib/scoring";
import { DISCIPLINE_LABELS, type Discipline } from "@/lib/discipline";
import { TopBar } from "@/components/TopBar";
import { LogoutButton } from "@/components/LogoutButton";
import { PinChangeForm } from "./PinChangeForm";

function formatDateTime(date: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}년 ${pad(date.getMonth() + 1)}월 ${pad(date.getDate())}일 ${pad(
    date.getHours()
  )}시 ${pad(date.getMinutes())}분`;
}

function average(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

function StatGrid({
  stats,
  scoreLabel,
  scoreDisplay,
}: {
  stats: Pick<RoundStats, "overallPct" | "firstBarrelPct" | "recoveryPct">;
  scoreLabel: string;
  scoreDisplay: string;
}) {
  return (
    <div className="grid grid-cols-4 gap-2 text-center text-sm">
      <div>
        <div className="text-lg font-bold">{scoreDisplay}</div>
        <div className="text-neutral-500">{scoreLabel}</div>
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
  );
}

export default async function MyRecordsPage() {
  const userId = await getCurrentUserId();
  if (!userId) redirect("/login");

  const allRounds = await prisma.round.findMany({
    where: { shooterId: userId },
    orderBy: { date: "desc" },
    include: { targets: { orderBy: { targetNumber: "asc" } } },
  });

  const rounds = allRounds
    .filter((r) => r.targets.length > 0)
    .map((r) => ({
      ...r,
      stats: computeRoundStats(
        r.targets.map((t) => ({
          targetNumber: t.targetNumber,
          station: t.station,
          firstResult: t.firstResult as "hit" | "miss",
          secondResult: t.secondResult as "hit" | "miss" | null,
        }))
      ),
    }));

  const summary = {
    score: average(rounds.map((r) => r.stats.score)),
    overallPct: average(rounds.map((r) => r.stats.overallPct)),
    firstBarrelPct: average(rounds.map((r) => r.stats.firstBarrelPct)),
    recoveryPct: average(rounds.map((r) => r.stats.recoveryPct)),
  };

  return (
    <main className="min-h-full px-4 pb-8 max-w-2xl mx-auto">
      <TopBar title="내 기록" showBack={false} showHome={false} right={<LogoutButton />} />

      <div className="mb-4">
        <PinChangeForm />
      </div>

      {rounds.length === 0 ? (
        <p className="text-sm text-neutral-400 mt-4">아직 기록이 없습니다.</p>
      ) : (
        <div className="space-y-6">
          <section className="bg-white rounded-xl border border-neutral-200 p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-neutral-500">전체 통합 (평균)</span>
              <span className="text-xs text-neutral-400">{rounds.length}회차</span>
            </div>
            <StatGrid
              stats={summary}
              scoreLabel="평균 점수"
              scoreDisplay={`${summary.score.toFixed(1)}/25`}
            />
          </section>

          <section className="space-y-2">
            <h2 className="text-sm font-semibold text-neutral-500">회차별 기록</h2>
            <ul className="space-y-2">
              {rounds.map((r) => {
                const discipline = r.discipline as Discipline;
                return (
                  <li key={r.id} className="bg-white rounded-xl border border-neutral-200 p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-sm">{formatDateTime(r.date)}</span>
                      <span className="text-xs text-neutral-400">
                        {DISCIPLINE_LABELS[discipline] ?? discipline}
                      </span>
                    </div>
                    <StatGrid stats={r.stats} scoreLabel="점수" scoreDisplay={`${r.stats.score}/25`} />
                  </li>
                );
              })}
            </ul>
          </section>
        </div>
      )}
    </main>
  );
}
