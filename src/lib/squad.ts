export type SquadTarget = {
  targetNumber: number;
  firstResult: "hit" | "miss";
  secondResult: "hit" | "miss" | null;
};

export type SquadSlotLike = {
  order: number;
  roundId: string;
  targets: SquadTarget[];
};

export type SquadPosition = {
  targetNumber: number;
  slotOrder: number;
  phase: "first" | "second";
} | null; // null = squad complete (25 targets x all slots done)

/** 슬롯들의 기존 Target 기록으로부터 현재 진행 위치(다음 입력해야 할 사수/타겟/phase)를 계산. */
export function computeSquadPosition(slots: SquadSlotLike[]): SquadPosition {
  const sorted = [...slots].sort((a, b) => a.order - b.order);

  for (let targetNumber = 1; targetNumber <= 25; targetNumber++) {
    for (const slot of sorted) {
      const target = slot.targets.find((t) => t.targetNumber === targetNumber);
      if (!target) {
        return { targetNumber, slotOrder: slot.order, phase: "first" };
      }
      if (target.firstResult === "miss" && target.secondResult === null) {
        return { targetNumber, slotOrder: slot.order, phase: "second" };
      }
    }
  }

  return null;
}
