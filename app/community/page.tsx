import { getCommunities } from "@/services/community.service";
import Link from "next/link";

// SVG path data per community slug — no emoji
const ICONS: Record<string, string> = {
  cse:           "M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4",
  mba:           "M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z",
  medical:       "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01",
  mechanical:    "M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z",
  law:           "M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3",
  design:        "M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z",
  "data-science":"M9 3H5a2 2 0 00-2 2v4m6-6h10a2 2 0 012 2v4M9 3v10m0 0h10M9 13H5a2 2 0 00-2 2v4a2 2 0 002 2h4m0-6v6m0 0h10a2 2 0 002-2v-4a2 2 0 00-2-2H13",
  civil:         "M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4",
};

// Accent stripe per community — subtle left border colour identity
const ACCENTS: Record<string, string> = {
  cse:           "border-l-[3px] border-l-gold-500",
  mba:           "border-l-[3px] border-l-teal-600",
  medical:       "border-l-[3px] border-l-clay-600",
  mechanical:    "border-l-[3px] border-l-ink-700",
  law:           "border-l-[3px] border-l-gold-700",
  design:        "border-l-[3px] border-l-clay-600",
  "data-science":"border-l-[3px] border-l-teal-600",
  civil:         "border-l-[3px] border-l-ink-700",
};

export default async function CommunitiesPage() {
  const communities = await getCommunities();

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      {/* Page header */}
      <div className="mb-10">
        <p className="font-mono-label text-[10px] tracking-[0.25em] uppercase text-gold-600 mb-3">Real-time discussion</p>
        <h1 className="font-display text-4xl font-semibold text-charcoal leading-tight">Communities</h1>
        <p className="text-muted mt-3 max-w-lg leading-relaxed">
          Subject-specific rooms where students share experiences, ask questions, and get real answers — live.
        </p>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {communities.map((c: typeof communities[number]) => {
          const iconPath = ICONS[c.slug] ?? ICONS["cse"];
          const accent = ACCENTS[c.slug] ?? "";
          const count = (c as typeof c & { _count: { questions: number } })._count.questions;

          return (
            <Link
              key={c.id}
              href={`/community/${c.slug}`}
              className={`group relative bg-white rounded-2xl border border-line ${accent} hover:shadow-[0_6px_24px_-8px_rgba(20,31,60,0.18)] hover:-translate-y-[1px] transition-all duration-200 p-5 flex items-start gap-4 overflow-hidden`}
            >
              {/* Subtle hover sheen */}
              <div className="absolute inset-0 bg-gradient-to-br from-gold-100/0 to-gold-100/0 group-hover:from-gold-100/20 group-hover:to-transparent transition-all duration-300 rounded-2xl pointer-events-none" />

              {/* Icon */}
              <div className="w-10 h-10 rounded-xl bg-ink-950 flex items-center justify-center flex-shrink-0 relative">
                <svg className="w-5 h-5 text-gold-400" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                  <path d={iconPath} />
                </svg>
              </div>

              <div className="flex-1 min-w-0 relative">
                <div className="flex items-start justify-between gap-2">
                  <h2 className="font-display font-semibold text-charcoal group-hover:text-ink-800 transition-colors leading-snug">{c.subject}</h2>
                </div>
                <p className="text-sm text-muted mt-1 line-clamp-2 leading-relaxed">{c.description}</p>

                <div className="flex items-center gap-3 mt-3.5">
                  <span className="text-xs font-mono-label font-semibold text-ink-800 bg-paper-dim px-2.5 py-1 rounded-full tabular">
                    {count} {count === 1 ? "question" : "questions"}
                  </span>
                  <span className="flex items-center gap-1.5 text-xs font-medium text-teal-700">
                    <span className="w-1.5 h-1.5 rounded-full bg-teal-600 animate-pulse" />
                    Live
                  </span>
                </div>
              </div>

              <svg className="w-4 h-4 text-ink-200 group-hover:text-gold-500 group-hover:translate-x-0.5 transition-all flex-shrink-0 mt-1 relative" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
