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

function finalCell(target: Target | undefined): "hit" | "miss" | "pending" | "empty" {
  if (!target) return "empty";
  if (target.firstResult === "hit") return "hit";
  if (target.secondResult === null) return "pending";
  return target.secondResult;
}

function hitCount(slot: Slot): number {
  return slot.targets.filter((t) => finalCell(t) === "hit").length;
}

export function SquadRecorder({ squadId }: { squadId: string }) {
  const [data, setData] = useState<SquadData | null>(null);
  const [busy, setBusy] = useState(false);

  async function load() {
    const res = await fetch(`/api/admin/squads/${squadId}`);
    if (res.ok) setData(await res.json());
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [squadId]);

  async function onTap(result: "hit" | "miss") {
    if (!data || !data.position || busy) return;
    const { targetNumber, slotOrder, phase } = data.position;
    const slot = data.slots.find((s) => s.order === slotOrder);
    if (!slot) return;

    setBusy(true);

    // optimistic local update
    const nextTargets = slot.targets.filter((t) => t.targetNumber !== targetNumber);
    if (phase === "first") {
      nextTargets.push({ targetNumber, firstResult: result, secondResult: null });
    } else {
      const existing = slot.targets.find((t) => t.targetNumber === targetNumber);
      nextTargets.push({
        targetNumber,
        firstResult: "miss",
        secondResult: result,
      });
      void existing;
    }
    const optimisticSlots = data.slots.map((s) =>
      s.order === slotOrder ? { ...s, targets: nextTargets } : s
    );
    setData({ ...data, slots: optimisticSlots });

    try {
      const res = await fetch(`/api/admin/squads/${squadId}/shot`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roundId: slot.roundId, targetNumber, phase, result }),
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

  return (
    <div className="flex flex-col min-h-screen">
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
                  const isCurrent =
                    data.position?.slotOrder === slot.order &&
                    data.position?.targetNumber === n;
                  return (
                    <td key={n} className="p-0.5">
                      <div
                        className={`w-7 h-7 flex items-center justify-center rounded ${
                          cell === "hit"
                            ? "bg-green-500"
                            : cell === "miss"
                            ? "bg-red-500"
                            : cell === "pending"
                            ? "bg-yellow-300"
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

      {data.position && currentSlot ? (
        <div className="sticky bottom-0 bg-white border-t shadow-[0_-2px_8px_rgba(0,0,0,0.06)] p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] space-y-3">
          <div className="flex items-center justify-center gap-3 text-center">
            <span className="text-2xl font-bold">{currentSlot.shooterName}</span>
            <span className="text-base text-neutral-500">
              타겟 {data.position.targetNumber}/25
            </span>
            <span className="text-base font-semibold">
              {data.position.phase === "first" ? "초격" : "재격"}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => onTap("hit")}
              disabled={busy || data.position.phase !== "first"}
              className="bg-green-600 text-white rounded-lg py-5 text-lg font-bold disabled:opacity-30 active:scale-95 transition-transform"
            >
              초격명중
            </button>
            <button
              onClick={() => onTap("miss")}
              disabled={busy || data.position.phase !== "first"}
              className="bg-red-600 text-white rounded-lg py-5 text-lg font-bold disabled:opacity-30 active:scale-95 transition-transform"
            >
              초격미스
            </button>
            <button
              onClick={() => onTap("hit")}
              disabled={busy || data.position.phase !== "second"}
              className="bg-green-700 text-white rounded-lg py-5 text-lg font-bold disabled:opacity-30 active:scale-95 transition-transform"
            >
              재격명중
            </button>
            <button
              onClick={() => onTap("miss")}
              disabled={busy || data.position.phase !== "second"}
              className="bg-red-700 text-white rounded-lg py-5 text-lg font-bold disabled:opacity-30 active:scale-95 transition-transform"
            >
              재격미스
            </button>
          </div>
        </div>
      ) : (
        <div className="sticky bottom-0 bg-white border-t p-6 text-center">
          <p className="text-2xl font-bold">기록 완료</p>
        </div>
      )}
    </div>
  );
}
