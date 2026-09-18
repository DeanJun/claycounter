export const DISCIPLINES = ["trap", "american_random", "american_00"] as const;
export type Discipline = (typeof DISCIPLINES)[number];

export const DISCIPLINE_LABELS: Record<Discipline, string> = {
  trap: "트랩",
  american_random: "아메랜덤",
  american_00: "아메0도",
};

export function isDiscipline(value: unknown): value is Discipline {
  return typeof value === "string" && (DISCIPLINES as readonly string[]).includes(value);
}
