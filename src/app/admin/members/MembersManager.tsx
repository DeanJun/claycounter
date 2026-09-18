"use client";

import { useEffect, useState } from "react";

type Member = { id: string; name: string; role: string };

export function MembersManager() {
  const [members, setMembers] = useState<Member[]>([]);
  const [name, setName] = useState("");
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function load() {
    const res = await fetch("/api/admin/members");
    if (res.ok) {
      const data: Member[] = await res.json();
      setMembers([...data].sort((a, b) => a.name.localeCompare(b.name, "ko")));
    }
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

  async function onRemove(id: string) {
    setRemovingId(id);
    setError(null);
    try {
      const res = await fetch(`/api/admin/members/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "오류가 발생했습니다.");
        return;
      }
      await load();
    } finally {
      setRemovingId(null);
    }
  }

  async function onRename(m: Member) {
    const newName = window.prompt("새 이름을 입력하세요", m.name);
    if (!newName || newName.trim() === m.name) return;
    setBusyId(m.id);
    setError(null);
    try {
      const res = await fetch(`/api/admin/members/${m.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "오류가 발생했습니다.");
        return;
      }
      await load();
    } finally {
      setBusyId(null);
    }
  }

  async function onResetPin(m: Member) {
    if (!window.confirm(`${m.name}님의 PIN을 0000으로 초기화할까요?`)) return;
    setBusyId(m.id);
    setError(null);
    try {
      const res = await fetch(`/api/admin/members/${m.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resetPin: true }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "오류가 발생했습니다.");
        return;
      }
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-4">
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
          {loading ? "등록 중..." : "추가"}
        </button>
      </form>
      {error && <p className="text-red-600 text-sm">{error}</p>}

      <div className="bg-white rounded-xl border border-neutral-200 divide-y divide-neutral-100 max-h-96 overflow-y-auto">
        {members.map((m) => (
          <div key={m.id} className="px-4 py-2.5 text-sm flex items-center justify-between gap-2">
            <span className="flex-1 min-w-0 truncate">
              {m.name} {m.role === "admin" && <span className="text-xs text-neutral-400">(관리자)</span>}
            </span>
            <div className="flex items-center gap-3 shrink-0">
              <button
                onClick={() => onRename(m)}
                disabled={busyId === m.id}
                className="text-xs text-neutral-500 disabled:opacity-50"
              >
                이름 수정
              </button>
              <button
                onClick={() => onResetPin(m)}
                disabled={busyId === m.id}
                className="text-xs text-neutral-500 disabled:opacity-50"
              >
                PIN 초기화
              </button>
              {m.role !== "admin" && (
                <button
                  onClick={() => onRemove(m.id)}
                  disabled={removingId === m.id}
                  className="text-xs text-red-600 disabled:opacity-50"
                >
                  {removingId === m.id ? "제거 중..." : "제거"}
                </button>
              )}
            </div>
          </div>
        ))}
        {members.length === 0 && (
          <p className="px-4 py-3 text-sm text-neutral-400">회원이 없습니다.</p>
        )}
      </div>
    </div>
  );
}
