"use client";

import { useEffect, useState } from "react";

type Target = {
  targetNumber: number;
  firstResult: "hit" | "miss";
  secondResult: "hit" | "miss" | null;
};

type Slot = {
  order: number;
  roundId: string;
  shooterId: string;
  shooterName: string;
  targets: Target[];
};

type Position = { targetNumber: number; slotOrder: number; phase: "first" | "second" } | null;

type SquadData = {
  id: string;
  status: string;
  slots: Slot[];
  position: Position;
};

type ActiveTarget = { roundId: string; slotOrder: number; targetNumber: number };

function finalCell(target: Target | undefined): "hit" | "miss" | "empty" {
  if (!target) return "empty";
  if (target.firstResult === "hit") return "hit";
  // 재격 결과가 아직 없으면 일단 미스로 표시 (나중에 칸을 눌러 정정 가능)
  return target.secondResult ?? "miss";
}

function hitCount(slot: Slot): number {
  return slot.targets.filter((t) => finalCell(t) === "hit").length;
}

export function SquadRecorder({ squadId }: { squadId: string }) {
  const [data, setData] = useState<SquadData | null>(null);
  const [busy, setBusy] = useState(false);
  // 스코어보드에서 이미 기록된 칸을 눌러 정정할 때 사용.
  const [correction, setCorrection] = useState<ActiveTarget | null>(null);

  async function load() {
    const res = await fetch(`/api/admin/squads/${squadId}`);
    if (res.ok) setData(await res.json());
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [squadId]);

  async function onTap(target: ActiveTarget, phase: "first" | "second", result: "hit" | "miss") {
    if (!data || busy) return;
    const { roundId, slotOrder, targetNumber } = target;
    const slot = data.slots.find((s) => s.order === slotOrder);
    if (!slot) return;

    setBusy(true);

    // optimistic local update
    const nextTargets = slot.targets.filter((t) => t.targetNumber !== targetNumber);
    if (phase === "first") {
      nextTargets.push({ targetNumber, firstResult: result, secondResult: null });
    } else {
      nextTargets.push({ targetNumber, firstResult: "miss", secondResult: result });
    }
    const optimisticSlots = data.slots.map((s) =>
      s.order === slotOrder ? { ...s, targets: nextTargets } : s
    );
    setData({ ...data, slots: optimisticSlots });

    try {
      const res = await fetch(`/api/admin/squads/${squadId}/shot`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roundId, targetNumber, phase, result }),
      });
      const respData = await res.json();
      if (res.ok) {
        setData((prev) =>
          prev
            ? {
                ...prev,
                slots: optimisticSlots,
                position: respData.position,
                status: respData.completed ? "completed" : prev.status,
              }
            : prev
        );
        setCorrection(null);
      } else {
        await load();
      }
    } finally {
      setBusy(false);
    }
  }

  if (!data) return <p className="text-sm text-neutral-500">불러오는 중...</p>;

  const currentSlot = data.position
    ? data.slots.find((s) => s.order === data.position!.slotOrder)
    : null;

  const correctionSlot = correction
    ? data.slots.find((s) => s.order === correction.slotOrder)
    : null;

  // correction 모드면 그 칸을, 아니면 현재 진행 위치를 대상으로 버튼 동작.
  const active: ActiveTarget | null = correction
    ? correction
    : data.position && currentSlot
    ? { roundId: currentSlot.roundId, slotOrder: data.position.slotOrder, targetNumber: data.position.targetNumber }
    : null;
  const activeSlot = correction ? correctionSlot : currentSlot;

  return (
    <div className="flex flex-col min-h-full">
      <div className="flex-1 overflow-x-auto pb-4">
        <table className="text-xs border-collapse w-full">
          <thead>
            <tr>
              <th className="text-left p-1 sticky left-0 bg-neutral-50">사수</th>
              {Array.from({ length: 25 }, (_, i) => i + 1).map((n) => (
                <th key={n} className="p-1 w-7 text-center">
                  {n}
                </th>
              ))}
              <th className="p-1 text-center">Hit</th>
            </tr>
          </thead>
          <tbody>
            {data.slots.map((slot) => (
              <tr key={slot.order}>
                <td className="p-1 sticky left-0 bg-white font-medium whitespace-nowrap">
                  {slot.shooterName}
                </td>
                {Array.from({ length: 25 }, (_, i) => i + 1).map((n) => {
                  const cell = finalCell(slot.targets.find((t) => t.targetNumber === n));
                  const isCurrent = active?.slotOrder === slot.order && active?.targetNumber === n;
                  const clickable = cell !== "empty";
                  return (
                    <td key={n} className="p-0.5">
                      <button
                        type="button"
                        disabled={!clickable}
                        onClick={() =>
                          clickable &&
                          setCorrection({ roundId: slot.roundId, slotOrder: slot.order, targetNumber: n })
                        }
                        className={`w-7 h-7 flex items-center justify-center rounded ${
                          cell === "hit"
                            ? "bg-green-500"
                            : cell === "miss"
                            ? "bg-red-500"
                            : "bg-neutral-100"
                        } ${isCurrent ? "ring-2 ring-blue-500" : ""}`}
                      />
                    </td>
                  );
                })}
                <td className="p-1 text-center font-semibold">{hitCount(slot)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {active && activeSlot ? (
        <div className="sticky bottom-0 bg-white border-t shadow-[0_-2px_8px_rgba(0,0,0,0.06)] p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] space-y-3">
          <div className="flex items-center justify-center gap-3 text-center">
            <span className="text-2xl font-bold">{activeSlot.shooterName}</span>
            <span className="text-base text-neutral-500">타겟 {active.targetNumber}/25</span>
            {correction && (
              <span className="text-base font-semibold text-amber-600">정정 모드</span>
            )}
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => onTap(active, "first", "hit")}
              disabled={busy}
              className="bg-green-600 text-white rounded-lg py-5 text-lg font-bold disabled:opacity-30 active:scale-95 transition-transform"
            >
              초격명중
            </button>
            <button
              onClick={() => onTap(active, "first", "miss")}
              disabled={busy}
              className="bg-red-600 text-white rounded-lg py-5 text-lg font-bold disabled:opacity-30 active:scale-95 transition-transform"
            >
              초격미스
            </button>
            <button
              onClick={() => onTap(active, "second", "hit")}
              disabled={busy}
              className="bg-green-700 text-white rounded-lg py-5 text-lg font-bold disabled:opacity-30 active:scale-95 transition-transform"
            >
              재격명중
            </button>
            <button
              onClick={() => onTap(active, "second", "miss")}
              disabled={busy}
              className="bg-red-700 text-white rounded-lg py-5 text-lg font-bold disabled:opacity-30 active:scale-95 transition-transform"
            >
              재격미스
            </button>
          </div>
          {correction && (
            <button
              onClick={() => setCorrection(null)}
              className="w-full text-sm text-neutral-500 underline"
            >
              취소하고 원래 진행으로 돌아가기
            </button>
          )}
        </div>
      ) : (
        <div className="sticky bottom-0 bg-white border-t p-6 text-center">
          <p className="text-2xl font-bold">기록 완료</p>
        </div>
      )}
    </div>
  );
}
