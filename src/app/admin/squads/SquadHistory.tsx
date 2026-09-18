"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { DISCIPLINE_LABELS, type Discipline } from "@/lib/discipline";

type SquadSummary = {
  id: string;
  date: string;
  status: string;
  discipline: Discipline;
  shooters: string[];
};

function formatDateTime(iso: string) {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}년 ${pad(d.getMonth() + 1)}월 ${pad(d.getDate())}일 ${pad(
    d.getHours()
  )}시 ${pad(d.getMinutes())}분`;
}

export function SquadHistory() {
  const [squads, setSquads] = useState<SquadSummary[]>([]);

  useEffect(() => {
    fetch("/api/admin/squads")
      .then((res) => (res.ok ? res.json() : []))
      .then(setSquads);
  }, []);

  return (
    <div className="bg-white rounded-xl border border-neutral-200 divide-y divide-neutral-100">
      {squads.map((s) => (
        <Link
          key={s.id}
          href={`/admin/squad/${s.id}`}
          className="block px-4 py-3 text-sm hover:bg-neutral-50"
        >
          <div className="flex items-center justify-between">
            <span className="font-medium">{DISCIPLINE_LABELS[s.discipline]}</span>
            <span
              className={`text-xs ${
                s.status === "completed" ? "text-neutral-400" : "text-green-600"
              }`}
            >
              {s.status === "completed" ? "완료" : "진행중"}
            </span>
          </div>
          <div className="text-neutral-500 text-xs mt-0.5">
            {formatDateTime(s.date)} · {s.shooters.join(", ")}
          </div>
        </Link>
      ))}
      {squads.length === 0 && (
        <p className="px-4 py-3 text-sm text-neutral-400">기록이 없습니다.</p>
      )}
    </div>
  );
}
