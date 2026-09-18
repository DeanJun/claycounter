"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { DISCIPLINE_LABELS, type Discipline } from "@/lib/discipline";

type Member = { id: string; name: string; role: string; createdAt: string };
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

export function AdminDashboard() {
  const [members, setMembers] = useState<Member[]>([]);
  const [squads, setSquads] = useState<SquadSummary[]>([]);
  const [name, setName] = useState("");
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function load() {
    const [membersRes, squadsRes] = await Promise.all([
      fetch("/api/admin/members"),
      fetch("/api/admin/squads"),
    ]);
    if (membersRes.ok) setMembers(await membersRes.json());
    if (squadsRes.ok) setSquads(await squadsRes.json());
  }

  useEffect(() => {
    load();
  }, []);

  async function onAddMember(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/admin/members", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, pin }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "오류가 발생했습니다.");
        return;
      }
      setName("");
      setPin("");
      await load();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-8">
      <Link
        href="/admin/squad/new"
        className="block text-center bg-neutral-900 text-white rounded-lg py-4 text-base font-semibold"
      >
        + 기록 시작
      </Link>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-neutral-500">회원 리스트</h2>
        <div className="bg-white rounded-xl border border-neutral-200 divide-y divide-neutral-100">
          {members.map((m) => (
            <div key={m.id} className="px-4 py-2.5 text-sm flex items-center justify-between">
              <span>{m.name}</span>
              {m.role === "admin" && (
                <span className="text-xs text-neutral-400">관리자</span>
              )}
            </div>
          ))}
          {members.length === 0 && (
            <p className="px-4 py-3 text-sm text-neutral-400">회원이 없습니다.</p>
          )}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-neutral-500">회원가입 (관리자가 등록)</h2>
        <form
          onSubmit={onAddMember}
          className="bg-white rounded-xl border border-neutral-200 p-4 flex flex-wrap gap-2 items-start"
        >
          <input
            className="border border-neutral-300 rounded-lg px-3 py-2 text-sm flex-1 min-w-[8rem]"
            placeholder="이름"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
          <input
            className="border border-neutral-300 rounded-lg px-3 py-2 text-sm tracking-widest w-32"
            type="password"
            inputMode="numeric"
            placeholder="PIN 4자리"
            value={pin}
            onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
            minLength={4}
            maxLength={4}
            required
          />
          <button
            type="submit"
            disabled={loading}
            className="bg-neutral-900 text-white rounded-lg px-4 py-2 text-sm font-medium disabled:opacity-50"
          >
            {loading ? "등록 중..." : "등록"}
          </button>
        </form>
        {error && <p className="text-red-600 text-sm">{error}</p>}
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-neutral-500">최근 기록</h2>
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
      </section>
    </div>
  );
}
