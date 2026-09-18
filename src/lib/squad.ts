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

/**
 * 슬롯들의 기존 Target 기록으로부터 현재 진행 위치(다음 입력해야 할 사수/타겟)를 계산.
 * 초격미스 후 재격 결과가 아직 없어도(pending) 진행을 막지 않고 다음 사수/타겟으로 넘어간다.
 * 재격은 나중에 스코어보드에서 해당 칸을 눌러 정정하듯 채워 넣는다.
 */
export function computeSquadPosition(slots: SquadSlotLike[]): SquadPosition {
  const sorted = [...slots].sort((a, b) => a.order - b.order);

  for (let targetNumber = 1; targetNumber <= 25; targetNumber++) {
    for (const slot of sorted) {
      const target = slot.targets.find((t) => t.targetNumber === targetNumber);
      if (!target) {
        return { targetNumber, slotOrder: slot.order, phase: "first" };
      }
    }
  }

  return null;
}
