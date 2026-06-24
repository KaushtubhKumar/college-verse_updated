import { getCommunities } from "@/services/community.service";
import Link from "next/link";

// SVG icon paths per slug
const ICONS: Record<string, string> = {
  cse:            "M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4",
  mba:            "M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z",
  medical:        "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01",
  mechanical:     "M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z",
  law:            "M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3",
  design:         "M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z",
  "data-science": "M9 3H5a2 2 0 00-2 2v4m6-6h10a2 2 0 012 2v4M9 3v10m0 0h10M9 13H5a2 2 0 00-2 2v4a2 2 0 002 2h4m0-6v6m0 0h10a2 2 0 002-2v-4a2 2 0 00-2-2H13",
  civil:          "M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4",
};

// Each card has a distinct paper-light identity — no dark gradients
// accent = left border + icon bg tint; numColor = big question count colour
const CARD_STYLES: Record<string, {
  border: string;      // left border color (Tailwind inline style)
  iconBg: string;      // icon swatch bg class
  iconColor: string;   // icon stroke class
  tagBg: string;       // small tag bg
  tagText: string;     // small tag text
  numColor: string;    // large number colour
  hoverBg: string;     // hover bg class
}> = {
  cse: {
    border: "#BA8A33",
    iconBg: "bg-gold-100",
    iconColor: "text-gold-700",
    tagBg: "bg-gold-100",
    tagText: "text-gold-700",
    numColor: "text-gold-600",
    hoverBg: "hover:bg-gold-100/30",
  },
  mba: {
    border: "#2F6F62",
    iconBg: "bg-teal-100",
    iconColor: "text-teal-700",
    tagBg: "bg-teal-100",
    tagText: "text-teal-700",
    numColor: "text-teal-600",
    hoverBg: "hover:bg-teal-100/20",
  },
  medical: {
    border: "#A14E3C",
    iconBg: "bg-clay-100",
    iconColor: "text-clay-600",
    tagBg: "bg-clay-100",
    tagText: "text-clay-600",
    numColor: "text-clay-600",
    hoverBg: "hover:bg-clay-100/30",
  },
  mechanical: {
    border: "#1D2D54",
    iconBg: "bg-ink-200/40",
    iconColor: "text-ink-800",
    tagBg: "bg-ink-200/60",
    tagText: "text-ink-800",
    numColor: "text-ink-700",
    hoverBg: "hover:bg-ink-200/20",
  },
  law: {
    border: "#9C6B1F",
    iconBg: "bg-gold-100",
    iconColor: "text-gold-700",
    tagBg: "bg-gold-100",
    tagText: "text-gold-700",
    numColor: "text-gold-600",
    hoverBg: "hover:bg-gold-100/20",
  },
  design: {
    border: "#A14E3C",
    iconBg: "bg-clay-100",
    iconColor: "text-clay-600",
    tagBg: "bg-clay-100",
    tagText: "text-clay-600",
    numColor: "text-clay-600",
    hoverBg: "hover:bg-clay-100/20",
  },
  "data-science": {
    border: "#2F6F62",
    iconBg: "bg-teal-100",
    iconColor: "text-teal-700",
    tagBg: "bg-teal-100",
    tagText: "text-teal-700",
    numColor: "text-teal-600",
    hoverBg: "hover:bg-teal-100/20",
  },
  civil: {
    border: "#1D2D54",
    iconBg: "bg-ink-200/40",
    iconColor: "text-ink-800",
    tagBg: "bg-ink-200/60",
    tagText: "text-ink-800",
    numColor: "text-ink-700",
    hoverBg: "hover:bg-ink-200/20",
  },
};

const DEFAULT_STYLE = CARD_STYLES["cse"];

export default async function CommunitiesPage() {
  const communities = await getCommunities();

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">

      {/* ── Page header ── */}
      <div className="mb-12 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-5 pb-8 border-b border-line">
        <div>
          <p className="font-mono-label text-[10px] tracking-[0.3em] uppercase text-gold-600 mb-3">
            Student discussions
          </p>
          <h1 className="font-display text-5xl font-semibold text-charcoal leading-[1.05] tracking-tight">
            Communities
          </h1>
          <p className="text-muted mt-3 max-w-sm leading-relaxed text-[15px]">
            Real questions. Real students. Organised by subject.
          </p>
        </div>
        {/* Live count — editorial pill */}
        <div className="flex-shrink-0 flex items-center gap-3 self-start sm:self-auto">
          <div className="flex items-center gap-2 border border-line rounded-full px-4 py-2">
            <span className="w-2 h-2 rounded-full bg-teal-600 animate-pulse" />
            <span className="font-mono-label text-xs font-bold text-charcoal tabular">
              {communities.length} rooms
            </span>
            <span className="text-xs text-muted">active</span>
          </div>
        </div>
      </div>

      {/* ── Card grid ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-px bg-line rounded-2xl overflow-hidden border border-line">
        {communities.map((c: typeof communities[number], idx: number) => {
          const iconPath = ICONS[c.slug] ?? ICONS["cse"];
          const style = CARD_STYLES[c.slug] ?? DEFAULT_STYLE;
          const count = (c as typeof c & { _count: { questions: number } })._count.questions;

          return (
            <Link
              key={c.id}
              href={`/community/${c.slug}`}
              className={`group relative bg-paper flex flex-col p-6 transition-colors duration-150 ${style.hoverBg} focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-gold-500`}
              style={{ borderLeft: `3px solid ${style.border}` }}
            >
              {/* top row: icon swatch + live badge */}
              <div className="flex items-start justify-between mb-5">
                <div className={`w-10 h-10 rounded-xl ${style.iconBg} flex items-center justify-center flex-shrink-0`}>
                  <svg
                    className={`w-5 h-5 ${style.iconColor}`}
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={1.6}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    viewBox="0 0 24 24"
                  >
                    <path d={iconPath} />
                  </svg>
                </div>
                <span className={`inline-flex items-center gap-1.5 text-[10px] font-mono-label font-bold px-2.5 py-1 rounded-full ${style.tagBg} ${style.tagText}`}>
                  <span className="w-1.5 h-1.5 rounded-full bg-current opacity-70 animate-pulse" />
                  LIVE
                </span>
              </div>

              {/* subject name */}
              <h2 className="font-display font-semibold text-lg text-charcoal leading-snug mb-1 group-hover:text-ink-800 transition-colors">
                {c.subject}
              </h2>

              {/* description */}
              <p className="text-[13px] text-muted leading-relaxed line-clamp-2 flex-1 mb-5">
                {c.description}
              </p>

              {/* footer: big editorial number + enter cta */}
              <div className="flex items-end justify-between mt-auto">
                <div>
                  <p className={`font-display font-black text-4xl leading-none tabular ${style.numColor}`}>
                    {count}
                  </p>
                  <p className="text-[10px] font-mono-label text-muted uppercase tracking-widest mt-1">
                    {count === 1 ? "question" : "questions"}
                  </p>
                </div>
                <span className="inline-flex items-center gap-1 text-xs font-semibold text-muted group-hover:text-charcoal transition-all group-hover:gap-2">
                  Enter room
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </span>
              </div>

              {/* index number — editorial watermark */}
              <span className="absolute top-4 right-5 font-mono-label text-[11px] font-bold text-line tabular select-none">
                {String(idx + 1).padStart(2, "0")}
              </span>
            </Link>
          );
        })}
      </div>

      {/* bottom note */}
      <p className="text-center text-xs text-muted mt-8">
        All rooms are moderated · Visible to all CollegeVerse students
      </p>
    </div>
  );
}