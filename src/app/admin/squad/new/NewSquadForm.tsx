"use client";

import { useEffect, useState } from "react";
import { DISCIPLINES, DISCIPLINE_LABELS, type Discipline } from "@/lib/discipline";

type Member = { id: string; name: string; role: string };

export function NewSquadForm() {
  const [members, setMembers] = useState<Member[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [discipline, setDiscipline] = useState<Discipline>("trap");
  const [error, setError] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);

  useEffect(() => {
    fetch("/api/admin/members")
      .then((res) => (res.ok ? res.json() : []))
      .then((data: Member[]) =>
        setMembers([...data].sort((a, b) => a.name.localeCompare(b.name, "ko")))
      );
  }, []);

  function toggleSelected(id: string) {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : prev.length < 6 ? [...prev, id] : prev
    );
  }

  async function onStart() {
    if (selected.length === 0) return;
    setStarting(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/squads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ memberIds: selected, discipline }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "오류가 발생했습니다.");
        return;
      }
      window.location.href = `/admin/squad/${data.id}`;
    } finally {
      setStarting(false);
    }
  }

  return (
    <div className="space-y-6 pb-6">
      <section className="space-y-2">
        <h2 className="text-sm font-semibold text-neutral-500">종목</h2>
        <div className="grid grid-cols-3 gap-2">
          {DISCIPLINES.map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => setDiscipline(d)}
              className={`rounded-lg py-3 text-sm font-medium border ${
                discipline === d
                  ? "bg-neutral-900 text-white border-neutral-900"
                  : "bg-white text-neutral-700 border-neutral-300"
              }`}
            >
              {DISCIPLINE_LABELS[d]}
            </button>
          ))}
        </div>
      </section>

      <section className="space-y-2">
        <h2 className="text-sm font-semibold text-neutral-500">
          사수 선택 ({selected.length}/6, 클릭한 순서대로 기록)
        </h2>
        <div className="bg-white rounded-xl border border-neutral-200 divide-y divide-neutral-100 max-h-80 overflow-y-auto">
          {members.map((m) => {
            const idx = selected.indexOf(m.id);
            const isSelected = idx !== -1;
            return (
              <button
                key={m.id}
                type="button"
                onClick={() => toggleSelected(m.id)}
                className={`w-full flex items-center justify-between px-4 py-3 text-sm text-left ${
                  isSelected ? "bg-neutral-50" : ""
                }`}
              >
                <span>{m.name}</span>
                {isSelected && (
                  <span className="w-6 h-6 rounded-full bg-neutral-900 text-white text-xs flex items-center justify-center">
                    {idx + 1}
                  </span>
                )}
              </button>
            );
          })}
          {members.length === 0 && (
            <p className="px-4 py-3 text-sm text-neutral-400">등록된 회원이 없습니다.</p>
          )}
        </div>
      </section>

      {error && <p className="text-red-600 text-sm">{error}</p>}

      <button
        onClick={onStart}
        disabled={selected.length === 0 || starting}
        className="w-full bg-neutral-900 text-white rounded-lg py-4 text-base font-semibold disabled:opacity-40"
      >
        {starting ? "생성 중..." : `기록 시작 (${selected.length}명)`}
      </button>
    </div>
  );
}
