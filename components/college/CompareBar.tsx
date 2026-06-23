"use client";
import { useCompareStore } from "@/stores/compare.store";
import Link from "next/link";

export default function CompareBar() {
  const { colleges, removeCollege, clear } = useCompareStore();

  if (colleges.length === 0) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-ink-950 border-t border-ink-700 shadow-[0_-12px_30px_-10px_rgba(0,0,0,0.4)]">
      <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-sm font-mono-label font-semibold text-gold-500">Compare ({colleges.length}/3)</span>
          {colleges.map((c) => (
            <div key={c.id} className="flex items-center gap-1.5 bg-ink-800 border border-ink-700 rounded-full px-3 py-1">
              <span className="text-sm text-paper font-medium max-w-32 truncate">{c.name}</span>
              <button onClick={() => removeCollege(c.id)} className="text-ink-400 hover:text-gold-500 text-base leading-none" aria-label={`Remove ${c.name}`}>×</button>
            </div>
          ))}
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
          <button onClick={clear} className="text-sm text-ink-400 hover:text-clay-600 transition-colors">Clear</button>
          <Link
            href={`/compare?ids=${colleges.map((c) => c.id).join(",")}`}
            className="bg-gold-500 hover:bg-gold-600 text-ink-950 text-sm font-semibold px-5 py-2 rounded-full transition-colors"
          >
            Compare now →
          </Link>
        </div>
      </div>
    </div>
  );
}
