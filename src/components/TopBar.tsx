"use client";

import { useRouter } from "next/navigation";

export function TopBar({ title }: { title: string }) {
  const router = useRouter();

  return (
    <div className="flex items-center gap-3 py-3">
      <button
        onClick={() => router.back()}
        className="text-sm text-neutral-500 px-2 py-1 -ml-2"
        aria-label="뒤로가기"
      >
        ← 뒤로
      </button>
      <h1 className="flex-1 text-lg font-semibold truncate">{title}</h1>
      <button
        onClick={() => router.push("/")}
        className="text-sm text-neutral-500 px-2 py-1"
        aria-label="홈으로"
      >
        홈
      </button>
    </div>
  );
}
