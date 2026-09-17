"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Member = { id: string; name: string; role: string; createdAt: string };
type SquadSummary = { id: string; date: string; status: string; shooters: string[] };

export function AdminDashboard() {
  const [members, setMembers] = useState<Member[]>([]);
  const [squads, setSquads] = useState<SquadSummary[]>([]);
  const [name, setName] = useState("");
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const [starting, setStarting] = useState(false);

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

  function toggleSelected(id: string) {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : prev.length < 6 ? [...prev, id] : prev
    );
  }

  async function onStartSquad() {
    if (selected.length === 0) return;
    setStarting(true);
    try {
      const res = await fetch("/api/admin/squads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ memberIds: selected }),
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
    <div className="space-y-10">
      <section className="space-y-3">
        <h2 className="font-semibold">기록 시작 — 사수 선택 (1~6명, 순서대로 클릭)</h2>
        <ul className="space-y-1">
          {members.map((m) => {
            const idx = selected.indexOf(m.id);
            return (
              <li key={m.id}>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={idx !== -1}
                    onChange={() => toggleSelected(m.id)}
                  />
                  {m.name}
                  {idx !== -1 && (
                    <span className="text-xs text-neutral-500">순번 {idx + 1}</span>
                  )}
                </label>
              </li>
            );
          })}
        </ul>
        <button
          onClick={onStartSquad}
          disabled={selected.length === 0 || starting}
          className="bg-neutral-900 text-white rounded px-4 py-2 text-sm disabled:opacity-50"
        >
          {starting ? "생성 중..." : `기록 시작 (${selected.length}명)`}
        </button>
      </section>

      <section className="space-y-3">
        <h2 className="font-semibold">회원 리스트</h2>
        <ul className="space-y-1 text-sm">
          {members.map((m) => (
            <li key={m.id}>
              {m.name} {m.role === "admin" ? "(관리자)" : ""}
            </li>
          ))}
          {members.length === 0 && <li className="text-neutral-500">회원이 없습니다.</li>}
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="font-semibold">회원가입 (관리자가 등록)</h2>
        <form onSubmit={onAddMember} className="flex flex-wrap gap-2 items-start">
          <input
            className="border rounded px-3 py-2 text-sm"
            placeholder="이름"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
          <input
            className="border rounded px-3 py-2 text-sm tracking-widest"
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
            className="bg-neutral-900 text-white rounded px-4 py-2 text-sm disabled:opacity-50"
          >
            {loading ? "등록 중..." : "회원 등록"}
          </button>
        </form>
        {error && <p className="text-red-600 text-sm">{error}</p>}
      </section>

      <section className="space-y-3">
        <h2 className="font-semibold">최근 기록</h2>
        <ul className="space-y-1 text-sm">
          {squads.map((s) => (
            <li key={s.id}>
              <Link href={`/admin/squad/${s.id}`} className="underline">
                {new Date(s.date).toLocaleString()} — {s.shooters.join(", ")} (
                {s.status === "completed" ? "완료" : "진행중"})
              </Link>
            </li>
          ))}
          {squads.length === 0 && <li className="text-neutral-500">기록이 없습니다.</li>}
        </ul>
      </section>
    </div>
  );
}
