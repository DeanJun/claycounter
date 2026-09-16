export type ShotResult = "hit" | "miss";

export type TargetLike = {
  targetNumber: number;
  station: number;
  firstResult: ShotResult;
  secondResult: ShotResult | null;
};

export function finalResult(target: Pick<TargetLike, "firstResult" | "secondResult">): ShotResult {
  return target.firstResult === "hit" ? "hit" : (target.secondResult ?? "miss");
}

export function stationOf(targetNumber: number): number {
  return Math.ceil(targetNumber / 5);
}

export type RoundStats = {
  score: number; // 25점 만점, finalResult == hit 개수
  firstBarrelPct: number; // 초격명중률
  recoveryPct: number; // 재격성공률 (초격 미스 중 재격 hit 비율)
  overallPct: number; // 전체 명중률 (score / 25)
  byStation: Record<number, { hit: number; total: number; pct: number }>;
};

export function computeRoundStats(targets: TargetLike[]): RoundStats {
  const total = targets.length || 1;
  let score = 0;
  let firstHits = 0;
  let firstMisses = 0;
  let recoveries = 0;

  const byStation: Record<number, { hit: number; total: number }> = {};

  for (const t of targets) {
    const station = t.station ?? stationOf(t.targetNumber);
    byStation[station] ??= { hit: 0, total: 0 };
    byStation[station].total += 1;

    const result = finalResult(t);
    if (result === "hit") {
      score += 1;
      byStation[station].hit += 1;
    }

    if (t.firstResult === "hit") {
      firstHits += 1;
    } else {
      firstMisses += 1;
      if (t.secondResult === "hit") recoveries += 1;
    }
  }

  const firstAttempts = firstHits + firstMisses || 1;

  return {
    score,
    firstBarrelPct: (firstHits / firstAttempts) * 100,
    recoveryPct: firstMisses === 0 ? 0 : (recoveries / firstMisses) * 100,
    overallPct: (score / total) * 100,
    byStation: Object.fromEntries(
      Object.entries(byStation).map(([station, v]) => [
        station,
        { ...v, pct: v.total === 0 ? 0 : (v.hit / v.total) * 100 },
      ])
    ),
  };
}
