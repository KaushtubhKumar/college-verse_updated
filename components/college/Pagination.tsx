"use client";
import { useRouter, useSearchParams } from "next/navigation";

interface Props { page: number; totalPages: number; }

export default function Pagination({ page, totalPages }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();

  function goTo(p: number) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", String(p));
    router.push(`/?${params.toString()}`);
  }

  const pages = Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
    if (totalPages <= 7) return i + 1;
    if (page <= 4) return i + 1;
    if (page >= totalPages - 3) return totalPages - 6 + i;
    return page - 3 + i;
  });

  return (
    <div className="flex items-center justify-center gap-2 mt-10 font-mono-label">
      <button onClick={() => goTo(page - 1)} disabled={page <= 1} className="px-4 py-2 rounded-full border border-line text-xs font-medium text-charcoal hover:bg-paper-dim disabled:opacity-40 disabled:cursor-not-allowed transition-colors">← Prev</button>
      {pages.map((p) => (
        <button key={p} onClick={() => goTo(p)} className={`w-9 h-9 rounded-full text-xs font-semibold transition-colors ${p === page ? "bg-ink-900 text-paper" : "border border-line text-charcoal hover:bg-paper-dim"}`}>{p}</button>
      ))}
      <button onClick={() => goTo(page + 1)} disabled={page >= totalPages} className="px-4 py-2 rounded-full border border-line text-xs font-medium text-charcoal hover:bg-paper-dim disabled:opacity-40 disabled:cursor-not-allowed transition-colors">Next →</button>
    </div>
  );
}
