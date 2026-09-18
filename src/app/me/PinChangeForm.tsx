"use client";

import { useState } from "react";

export function PinChangeForm() {
  const [open, setOpen] = useState(false);
  const [currentPin, setCurrentPin] = useState("");
  const [newPin, setNewPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setDone(false);
    setLoading(true);
    try {
      const res = await fetch("/api/me/pin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPin, newPin }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "오류가 발생했습니다.");
        return;
      }
      setCurrentPin("");
      setNewPin("");
      setDone(true);
    } finally {
      setLoading(false);
    }
  }

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="text-sm text-neutral-400">
        PIN 변경
      </button>
    );
  }

  return (
    <form
      onSubmit={onSubmit}
      className="bg-white rounded-xl border border-neutral-200 p-4 space-y-2"
    >
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-neutral-500">PIN 변경</span>
        <button type="button" onClick={() => setOpen(false)} className="text-xs text-neutral-400">
          닫기
        </button>
      </div>
      <input
        className="w-full border border-neutral-300 rounded-lg px-3 py-2 text-sm tracking-widest"
        type="password"
        inputMode="numeric"
        placeholder="현재 PIN"
        value={currentPin}
        onChange={(e) => setCurrentPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
        minLength={4}
        maxLength={4}
        required
      />
      <input
        className="w-full border border-neutral-300 rounded-lg px-3 py-2 text-sm tracking-widest"
        type="password"
        inputMode="numeric"
        placeholder="새 PIN 4자리"
        value={newPin}
        onChange={(e) => setNewPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
        minLength={4}
        maxLength={4}
        required
      />
      {error && <p className="text-red-600 text-xs">{error}</p>}
      {done && <p className="text-green-600 text-xs">변경되었습니다.</p>}
      <button
        type="submit"
        disabled={loading}
        className="w-full bg-neutral-900 text-white rounded-lg py-2 text-sm font-medium disabled:opacity-50"
      >
        {loading ? "변경 중..." : "변경"}
      </button>
    </form>
  );
}
