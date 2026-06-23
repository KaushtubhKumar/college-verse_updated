import { getCommunities } from "@/services/community.service";
import Link from "next/link";

export default async function CommunitiesPage() {
  const communities = await getCommunities();

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="mb-8">
        <p className="font-mono-label text-[11px] tracking-[0.2em] uppercase text-gold-600 mb-2">Live discussion rooms</p>
        <h1 className="font-display text-3xl font-semibold text-charcoal">Communities</h1>
        <p className="text-muted mt-2">Real-time rooms for every stream — ask questions, share experiences, help others.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {communities.map((c: typeof communities[number]) => (
          <Link
            key={c.id}
            href={`/community/${c.slug}`}
            className="group bg-white rounded-2xl border border-line hover:border-gold-500/60 hover:shadow-[0_8px_28px_-14px_rgba(20,31,60,0.25)] transition-all p-5 flex items-start gap-4"
          >
            <span className="w-11 h-11 rounded-full bg-ink-950 flex items-center justify-center text-xl flex-shrink-0">{c.icon}</span>
            <div className="flex-1 min-w-0">
              <h2 className="font-display font-semibold text-charcoal group-hover:text-ink-800 transition-colors">{c.subject}</h2>
              <p className="text-sm text-muted mt-1 line-clamp-2">{c.description}</p>
              <div className="flex items-center gap-3 mt-3">
                <span className="text-xs text-ink-800 font-mono-label font-semibold bg-paper-dim px-2.5 py-1 rounded-full">
                  {(c as typeof c & { _count: { questions: number } })._count.questions} questions
                </span>
                <span className="text-xs text-teal-700 font-medium flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-teal-600 animate-pulse inline-block" />
                  Live
                </span>
              </div>
            </div>
            <svg className="w-5 h-5 text-ink-400 group-hover:text-gold-600 transition-colors flex-shrink-0 mt-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        ))}
      </div>
    </div>
  );
}
