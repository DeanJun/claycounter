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
          <div key={m.id} className="px-4 py-2.5 text-sm flex items-center justify-between">
            <span>{m.name}</span>
            {m.role === "admin" ? (
              <span className="text-xs text-neutral-400">관리자</span>
            ) : (
              <button
                onClick={() => onRemove(m.id)}
                disabled={removingId === m.id}
                className="text-xs text-red-600 disabled:opacity-50"
              >
                {removingId === m.id ? "제거 중..." : "제거"}
              </button>
            )}
          </div>
        ))}
        {members.length === 0 && (
          <p className="px-4 py-3 text-sm text-neutral-400">회원이 없습니다.</p>
        )}
      </div>
    </div>
  );
}
