"use client";
import { useEffect, useState, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { formatFees, formatPackage, cn } from "@/lib/utils";
import SealBadge from "@/components/ui/SealBadge";
import type { College } from "@/types";

interface CompareCollege extends College {
  courses: NonNullable<College["courses"]>;
  placement: NonNullable<College["placement"]> | null;
}

type FactorKey = "placement" | "fees" | "roi" | "location" | "rating";

const FACTOR_ICONS: Record<FactorKey, string> = {
  placement: "M20 7h-3V5a2 2 0 00-2-2H9a2 2 0 00-2 2v2H4a1 1 0 00-1 1v11a1 1 0 001 1h16a1 1 0 001-1V8a1 1 0 00-1-1zM9 5h6v2H9V5z",
  fees:      "M12 2a10 10 0 110 20 10 10 0 010-20zm0 4v2m0 8v2m-3-9.5c0-1.1 1.34-2 3-2s3 .9 3 2-1.34 2-3 2-3 .9-3 2 1.34 2 3 2 3-.9 3-2",
  roi:       "M3 17l5-5 4 4 8-8M14 8h6v6",
  location:  "M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z|M15 11a3 3 0 11-6 0 3 3 0 016 0z",
  rating:    "M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z",
};

const FACTOR_META: Record<FactorKey, { label: string; desc: string; unit?: string }> = {
  placement: { label: "Placements", desc: "Avg package & placement rate" },
  fees:      { label: "Low Fees",   desc: "Affordable tuition" },
  roi:       { label: "ROI",        desc: "Package ÷ fees ratio" },
  location:  { label: "Location",   desc: "City & state preference" },
  rating:    { label: "Rating",     desc: "Overall college rating" },
};

function FactorIcon({ factor, className }: { factor: FactorKey; className?: string }) {
  const paths = FACTOR_ICONS[factor].split("|");
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      {paths.map((p, i) => <path key={i} d={p} />)}
    </svg>
  );
}

const DEFAULT_PRIORITIES: FactorKey[] = ["placement", "roi", "fees", "rating", "location"];

const ROW_GROUPS = [
  {
    title: "Overview",
    rows: [
      { label: "Type",       key: (c: CompareCollege) => c.type },
      { label: "Location",   key: (c: CompareCollege) => c.location },
      { label: "Est.",       key: (c: CompareCollege) => c.established ? String(c.established) : "—" },
      { label: "NAAC Grade", key: (c: CompareCollege) => c.naacGrade || "—" },
      { label: "NIRF Rank",  key: (c: CompareCollege) => c.nirfRank ? `#${c.nirfRank}` : "—" },
    ],
  },
  {
    title: "Fees / year",
    rows: [
      { label: "Minimum",  key: (c: CompareCollege) => formatFees(c.feesMin) },
      { label: "Maximum",  key: (c: CompareCollege) => formatFees(c.feesMax) },
      { label: "Rating",   key: (c: CompareCollege) => `${c.rating.toFixed(1)} / 5` },
      { label: "Courses",  key: (c: CompareCollege) => `${c.courses.length} offered` },
    ],
  },
  {
    title: "Placements",
    rows: [
      { label: "Avg Package",     key: (c: CompareCollege) => c.placement ? formatPackage(c.placement.avgPackage) : "—" },
      { label: "Highest Package", key: (c: CompareCollege) => c.placement ? formatPackage(c.placement.highestPackage) : "—" },
      { label: "Placement Rate",  key: (c: CompareCollege) => c.placement ? `${c.placement.placementRate}%` : "—" },
    ],
  },
];

function normalize(value: number, min: number, max: number) {
  if (max === min) return 0.5;
  return (value - min) / (max - min);
}

const PRIORITY_WEIGHTS = [0.35, 0.25, 0.20, 0.12, 0.08];

function computeWeightedScores(colleges: CompareCollege[], priorities: FactorKey[]) {
  const fees    = colleges.map((c) => c.feesMax);
  const pkgs    = colleges.map((c) => c.placement?.avgPackage ?? 0);
  const rates   = colleges.map((c) => c.placement?.placementRate ?? 0);
  const rois    = colleges.map((c) => c.placement ? c.placement.avgPackage / Math.max(c.feesMax, 1) : 0);
  const ratings = colleges.map((c) => c.rating);

  const minFee = Math.min(...fees), maxFee = Math.max(...fees);
  const minPkg = Math.min(...pkgs), maxPkg = Math.max(...pkgs);
  const minRate = Math.min(...rates), maxRate = Math.max(...rates);
  const minRoi = Math.min(...rois), maxRoi = Math.max(...rois);
  const minRat = Math.min(...ratings), maxRat = Math.max(...ratings);

  return colleges.map((c, i) => {
    const factorScores: Record<FactorKey, number> = {
      fees:      1 - normalize(fees[i], minFee, maxFee),
      placement: (normalize(pkgs[i], minPkg, maxPkg) + normalize(rates[i], minRate, maxRate)) / 2,
      roi:       normalize(rois[i], minRoi, maxRoi),
      rating:    normalize(ratings[i], minRat, maxRat),
      location:  0.5,
    };
    const total = priorities.reduce((sum, factor, rank) => sum + factorScores[factor] * PRIORITY_WEIGHTS[rank], 0);
    return { id: c.id, total, factorScores };
  });
}

// ── Preferences Modal ─────────────────────────────────────────────────────────
function PreferencesModal({ priorities, onSave, onClose }: {
  priorities: FactorKey[];
  onSave: (p: FactorKey[]) => void;
  onClose: () => void;
}) {
  const [local, setLocal] = useState<FactorKey[]>([...priorities]);
  const [dragging, setDragging] = useState<number | null>(null);
  const [dragOver, setDragOver] = useState<number | null>(null);

  function handleDragStart(i: number) { setDragging(i); }
  function handleDragOver(e: React.DragEvent, i: number) { e.preventDefault(); setDragOver(i); }
  function handleDrop(i: number) {
    if (dragging === null || dragging === i) return;
    const next = [...local];
    const [item] = next.splice(dragging, 1);
    next.splice(i, 0, item);
    setLocal(next); setDragging(null); setDragOver(null);
  }
  function moveUp(i: number) {
    if (i === 0) return;
    const next = [...local]; [next[i-1], next[i]] = [next[i], next[i-1]]; setLocal(next);
  }
  function moveDown(i: number) {
    if (i === local.length - 1) return;
    const next = [...local]; [next[i], next[i+1]] = [next[i+1], next[i]]; setLocal(next);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink-950/70 backdrop-blur-sm">
      <div className="bg-paper rounded-3xl shadow-2xl w-full max-w-md border border-line overflow-hidden">
        <div className="px-6 pt-6 pb-5 border-b border-line">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="font-display text-xl font-semibold text-charcoal leading-tight">What matters most?</h2>
              <p className="text-sm text-muted mt-1">Drag to reorder · top = highest weight</p>
            </div>
            <button onClick={onClose} className="mt-1 text-muted hover:text-charcoal transition-colors flex-shrink-0">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/></svg>
            </button>
          </div>
        </div>
        <div className="p-4 space-y-1.5">
          {local.map((factor, i) => (
            <div
              key={factor}
              draggable
              onDragStart={() => handleDragStart(i)}
              onDragOver={(e) => handleDragOver(e, i)}
              onDrop={() => handleDrop(i)}
              onDragEnd={() => { setDragging(null); setDragOver(null); }}
              className={cn(
                "flex items-center gap-3 px-4 py-3 rounded-2xl border-2 cursor-grab active:cursor-grabbing select-none transition-all",
                dragOver === i ? "border-gold-500 bg-gold-100/60 scale-[1.02]" : "border-line bg-white hover:border-gold-500/30",
                dragging === i && "opacity-30"
              )}
            >
              {/* rank number */}
              <span className={cn(
                "w-8 h-8 rounded-full flex items-center justify-center text-sm font-mono-label font-black flex-shrink-0",
                i === 0 ? "bg-gold-500 text-ink-950" :
                i === 1 ? "bg-ink-950 text-gold-400" :
                "bg-paper-dim text-muted border border-line"
              )}>{i + 1}</span>
              {/* label — large & readable */}
              <div className="flex-1 min-w-0">
                <p className="font-display font-semibold text-base text-charcoal leading-tight">{FACTOR_META[factor].label}</p>
                <p className="text-xs text-muted">{FACTOR_META[factor].desc}</p>
              </div>
              {/* weight chip */}
              <span className="text-xs font-mono-label font-bold text-gold-600 bg-gold-100 px-2 py-0.5 rounded-full flex-shrink-0">
                {Math.round(PRIORITY_WEIGHTS[i] * 100)}%
              </span>
              {/* up/down */}
              <div className="flex flex-col gap-0.5 flex-shrink-0">
                <button onClick={() => moveUp(i)} disabled={i === 0} className="text-ink-200 hover:text-ink-800 disabled:opacity-20 transition-colors">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 15l7-7 7 7"/></svg>
                </button>
                <button onClick={() => moveDown(i)} disabled={i === local.length - 1} className="text-ink-200 hover:text-ink-800 disabled:opacity-20 transition-colors">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7"/></svg>
                </button>
              </div>
              {/* drag handle */}
              <svg className="w-4 h-4 text-ink-200 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
                <circle cx="9" cy="6" r="1.5"/><circle cx="15" cy="6" r="1.5"/>
                <circle cx="9" cy="12" r="1.5"/><circle cx="15" cy="12" r="1.5"/>
                <circle cx="9" cy="18" r="1.5"/><circle cx="15" cy="18" r="1.5"/>
              </svg>
            </div>
          ))}
        </div>
        <div className="px-4 pb-4 flex gap-3">
          <button onClick={() => setLocal([...DEFAULT_PRIORITIES])} className="flex-1 py-3 rounded-2xl border border-line text-sm text-muted hover:bg-paper-dim transition-colors font-medium">
            Reset
          </button>
          <button onClick={() => { onSave(local); onClose(); }} className="flex-1 py-3 rounded-2xl bg-charcoal text-paper text-sm font-bold hover:bg-ink-800 transition-colors">
            Apply & re-rank
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Verdict Panel ─────────────────────────────────────────────────────────────
interface Verdict {
  winner: string; winnerName: string; summary: string;
  breakdown: { collegeName: string; pros: string[]; cons: string[] }[];
  finalTake: string;
}

function VerdictPanel({ verdict, loading, onClose }: { verdict: Verdict | null; loading: boolean; onClose: () => void }) {
  if (!loading && !verdict) return null;
  return (
    <div className="mt-4 border border-charcoal/20 rounded-3xl bg-charcoal text-paper p-6 relative overflow-hidden">
      <div className="absolute -top-12 -right-12 w-40 h-40 rounded-full bg-gold-500/8 pointer-events-none" />
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <span className="text-gold-500 text-lg">✦</span>
          <h3 className="font-display font-semibold text-lg text-paper">AI Verdict</h3>
          <span className="text-[10px] bg-gold-500/20 text-gold-400 px-2 py-0.5 rounded-full font-mono-label tracking-wide">Gemini</span>
        </div>
        <button onClick={onClose} className="text-ink-400 hover:text-paper transition-colors">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/></svg>
        </button>
      </div>
      {loading && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-ink-300 text-sm">
            <svg className="w-4 h-4 animate-spin text-gold-400" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
            Analysing against your priorities…
          </div>
          <div className="space-y-2 animate-pulse">{[3,4,2].map((w,i)=><div key={i} className={`h-3.5 bg-ink-800 rounded w-${w}/4`}/>)}</div>
        </div>
      )}
      {verdict && !loading && (
        <div className="space-y-5">
          <div className="flex items-center gap-3 p-4 bg-gold-500/10 border border-gold-500/25 rounded-2xl">
            <SealBadge label="★" tone="gold" size="md" />
            <div>
              <p className="text-[10px] text-gold-400 font-mono-label uppercase tracking-widest mb-0.5">Best fit</p>
              <p className="font-display font-semibold text-base text-paper">{verdict.winnerName}</p>
            </div>
          </div>
          <p className="text-ink-200 text-sm leading-relaxed">{verdict.summary}</p>
          <div className="space-y-3">
            {verdict.breakdown.map((b) => (
              <div key={b.collegeName} className="bg-ink-900 rounded-2xl p-4">
                <p className="text-[10px] font-mono-label font-semibold text-ink-300 uppercase tracking-widest mb-3">{b.collegeName}</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-xs text-teal-400 font-semibold mb-1.5">Strengths</p>
                    {b.pros.map((p, i) => <p key={i} className="text-xs text-ink-200 flex gap-1.5 mb-1"><span className="text-teal-400 flex-shrink-0">+</span>{p}</p>)}
                  </div>
                  <div>
                    <p className="text-xs text-clay-100 font-semibold mb-1.5">Weaknesses</p>
                    {b.cons.map((c, i) => <p key={i} className="text-xs text-ink-200 flex gap-1.5 mb-1"><span className="text-clay-100 flex-shrink-0">−</span>{c}</p>)}
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="border-t border-ink-800 pt-4">
            <p className="text-[10px] text-gold-400 font-mono-label uppercase tracking-widest mb-2">Final take</p>
            <p className="text-sm text-ink-100 leading-relaxed">{verdict.finalTake}</p>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function ComparePage() {
  const searchParams = useSearchParams();
  const ids = (searchParams.get("ids") || "").split(",").filter(Boolean).slice(0, 3);

  const [colleges, setColleges] = useState<CompareCollege[]>([]);
  const [loading, setLoading] = useState(true);
  const [showPrefs, setShowPrefs] = useState(false);
  const [priorities, setPriorities] = useState<FactorKey[]>([...DEFAULT_PRIORITIES]);
  const [scores, setScores] = useState<{ id: string; total: number; factorScores: Record<FactorKey, number> }[]>([]);
  const [bestFitId, setBestFitId] = useState<string | null>(null);
  const [verdict, setVerdict] = useState<Verdict | null>(null);
  const [verdictLoading, setVerdictLoading] = useState(false);

  const runAnalysis = useCallback((prefs: FactorKey[], cols: CompareCollege[]) => {
    if (cols.length < 2) return;
    const computed = computeWeightedScores(cols, prefs);
    setScores(computed);
    setBestFitId(computed.reduce((a, b) => b.total > a.total ? b : a).id);
    setVerdict(null);
  }, []);

  useEffect(() => {
    if (!ids.length) { setLoading(false); setColleges([]); return; }
    const controller = new AbortController();
    setLoading(true);
    fetch(`/api/compare?ids=${ids.join(",")}`, { signal: controller.signal })
      .then(r => r.json())
      .then(d => {
        const cols: CompareCollege[] = d.colleges || [];
        setColleges(cols);
        if (cols.length >= 2) {
          const computed = computeWeightedScores(cols, DEFAULT_PRIORITIES);
          setScores(computed);
          setBestFitId(computed.reduce((a, b) => b.total > a.total ? b : a).id);
        }
      })
      .catch(err => { if (err.name !== "AbortError") console.error(err); })
      .finally(() => setLoading(false));
    return () => controller.abort();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams.toString()]);

  async function handleGetVerdict() {
    if (!colleges.length) return;
    setVerdictLoading(true); setVerdict(null);
    try {
      const res = await fetch("/api/compare/verdict", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          colleges: colleges.map(c => ({
            id: c.id, name: c.name, location: c.location, type: c.type,
            feesMin: c.feesMin, feesMax: c.feesMax, rating: c.rating,
            naacGrade: c.naacGrade, nirfRank: c.nirfRank,
            avgPackage: c.placement?.avgPackage ?? null,
            highestPackage: c.placement?.highestPackage ?? null,
            placementRate: c.placement?.placementRate ?? null,
            topRecruiters: c.placement?.topRecruiters ? JSON.parse(c.placement.topRecruiters) : [],
          })),
          priorities: priorities.map((f, i) => ({ factor: FACTOR_META[f].label, weight: PRIORITY_WEIGHTS[i], rank: i + 1 })),
          scores: scores.map(s => ({ collegeName: colleges.find(c => c.id === s.id)?.name ?? s.id, score: s.total })),
        }),
      });
      const data = await res.json();
      if (data.verdict) setVerdict(data.verdict);
    } catch { console.error("Verdict failed"); }
    finally { setVerdictLoading(false); }
  }

  const canAnalyse = colleges.length >= 2;
  const col = colleges.length;

  if (!ids.length) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-24 text-center">
        <p className="font-mono-label text-xs tracking-widest uppercase text-muted mb-4">Nothing here yet</p>
        <h1 className="font-display text-3xl font-semibold text-charcoal mb-3">Add colleges to compare</h1>
        <p className="text-muted mb-8">Browse the listings and tap "Compare" on up to 3 colleges.</p>
        <Link href="/" className="inline-flex items-center gap-2 bg-charcoal text-paper px-6 py-3 rounded-full font-semibold hover:bg-ink-800 transition-colors text-sm">
          Browse colleges →
        </Link>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-12 animate-pulse space-y-4">
        <div className="h-8 bg-paper-dim rounded w-48" />
        <div className="grid grid-cols-3 gap-4">{[1,2,3].map(i=><div key={i} className="h-48 bg-paper-dim rounded-3xl"/>)}</div>
      </div>
    );
  }

  return (
    <>
      {showPrefs && (
        <PreferencesModal
          priorities={priorities}
          onSave={p => { setPriorities(p); runAnalysis(p, colleges); }}
          onClose={() => setShowPrefs(false)}
        />
      )}

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">

        {/* ── Page header ── */}
        <div className="flex items-end justify-between gap-4 pb-4 border-b border-line">
          <div>
            <p className="font-mono-label text-[10px] tracking-[0.3em] uppercase text-gold-600 mb-2">Head-to-head</p>
            <h1 className="font-display text-3xl font-semibold text-charcoal">Compare colleges</h1>
          </div>
          <Link href="/" className="text-sm font-medium text-muted hover:text-charcoal transition-colors underline underline-offset-4 decoration-line mb-1">
            + Add college
          </Link>
        </div>

        {/* ── Priority strip ── */}
        {canAnalyse && (
          <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6">
            {/* priority pills */}
            <div className="flex-1 flex flex-wrap gap-2 items-center">
              <span className="text-xs font-mono-label text-muted uppercase tracking-widest mr-1">Ranked by</span>
              {priorities.map((f, i) => (
                <span
                  key={f}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-semibold transition-all",
                    i === 0
                      ? "bg-charcoal text-gold-400 ring-1 ring-charcoal"
                      : i === 1
                      ? "bg-paper-dim text-charcoal ring-1 ring-line"
                      : "bg-transparent text-muted ring-1 ring-line line-through decoration-muted/60"
                  )}
                >
                  <FactorIcon factor={f} className={cn("w-3.5 h-3.5 flex-shrink-0", i === 0 ? "text-gold-500" : "")} />
                  {FACTOR_META[f].label}
                  {i < 2 && (
                    <span className={cn("text-[10px] font-mono-label font-black", i === 0 ? "text-gold-500" : "text-ink-400")}>
                      {Math.round(PRIORITY_WEIGHTS[i] * 100)}%
                    </span>
                  )}
                </span>
              ))}
            </div>
            {/* edit button — prominent */}
            <button
              onClick={() => setShowPrefs(true)}
              className="flex-shrink-0 inline-flex items-center gap-2 bg-paper border-2 border-charcoal text-charcoal px-4 py-2.5 rounded-full text-sm font-bold hover:bg-charcoal hover:text-paper transition-all group"
            >
              <svg className="w-3.5 h-3.5 transition-transform group-hover:rotate-45" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4"/>
              </svg>
              Edit priorities
            </button>
          </div>
        )}

        {/* ── College cards header ── */}
        <div className="grid gap-3" style={{ gridTemplateColumns: `160px repeat(${col}, 1fr)` }}>
          <div />
          {colleges.map((c) => {
            const isBest = bestFitId === c.id;
            const s = scores.find(x => x.id === c.id);
            return (
              <div
                key={c.id}
                className={cn(
                  "rounded-3xl p-5 flex flex-col transition-all relative overflow-hidden",
                  isBest
                    ? "bg-charcoal text-paper ring-2 ring-gold-500 shadow-[0_20px_40px_-12px_rgba(12,18,38,0.4)]"
                    : "bg-paper-dim text-charcoal border border-line"
                )}
              >
                {isBest && (
                  <>
                    {/* subtle grain on best card */}
                    <div className="absolute inset-0 opacity-[0.04]" style={{backgroundImage:"url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")", backgroundSize:"120px"}} />
                    <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                      <SealBadge label="★" tone="gold" size="sm" />
                    </div>
                  </>
                )}
                {isBest && <p className="text-[9px] font-mono-label font-black uppercase tracking-[0.25em] text-gold-500 mb-2 mt-3 text-center">Best fit</p>}
                <h2 className={cn("font-display font-semibold text-sm leading-snug mb-1 text-center", !isBest && "mt-1")}>{c.name}</h2>
                <p className={cn("text-[11px] text-center mb-4", isBest ? "text-ink-300" : "text-muted")}>{c.location}</p>
                {s && (
                  <div className="mt-auto text-center">
                    <p className={cn("font-display font-black text-3xl leading-none", isBest ? "text-gold-400" : "text-charcoal")}>
                      {Math.round(s.total * 100)}<span className="text-base font-semibold">%</span>
                    </p>
                    <p className={cn("text-[10px] font-mono-label uppercase tracking-widest mt-1", isBest ? "text-ink-400" : "text-muted")}>match</p>
                  </div>
                )}
                <Link
                  href={`/college/${c.slug}`}
                  className={cn(
                    "mt-4 text-center text-[11px] font-semibold py-2 rounded-full transition-colors",
                    isBest
                      ? "bg-white/10 text-paper hover:bg-white/20"
                      : "bg-paper border border-line text-muted hover:text-charcoal"
                  )}
                >
                  View profile →
                </Link>
              </div>
            );
          })}
        </div>

        {/* ── Comparison table ── */}
        <div className="rounded-2xl border border-line overflow-hidden">
          {ROW_GROUPS.map((group, gi) => (
            <div key={group.title} className={gi > 0 ? "border-t-2 border-charcoal/8" : ""}>
              {/* Section header */}
              <div className="grid" style={{ gridTemplateColumns: `160px repeat(${col}, 1fr)` }}>
                <div className="bg-paper-dim px-4 py-3 border-r border-line flex items-center">
                  <span className="font-mono-label text-[10px] font-black uppercase tracking-[0.2em] text-charcoal">{group.title}</span>
                </div>
                {colleges.map((c) => {
                  const isBest = bestFitId === c.id;
                  return (
                    <div key={c.id} className={cn("bg-paper-dim py-3 border-r border-line last:border-r-0 flex items-center justify-center px-2", isBest && "bg-gold-100/40")}>
                      <span className={cn("text-[10px] font-mono-label font-bold truncate", isBest ? "text-gold-700" : "text-muted")}>
                        {isBest ? "★ top match" : c.name.split(" ").slice(0,2).join(" ")}
                      </span>
                    </div>
                  );
                })}
              </div>
              {/* Rows */}
              {group.rows.map((row, ri) => (
                <div key={row.label} className="grid border-t border-line/60" style={{ gridTemplateColumns: `160px repeat(${col}, 1fr)` }}>
                  <div className="px-4 py-3 flex items-center border-r border-line">
                    <span className="text-xs text-muted font-medium">{row.label}</span>
                  </div>
                  {colleges.map((c) => {
                    const val = row.key(c);
                    const isBest = bestFitId === c.id;
                    return (
                      <div
                        key={c.id}
                        className={cn(
                          "px-3 py-3 text-center border-r border-line/60 last:border-r-0",
                          isBest ? "bg-gold-100/20" : ri % 2 === 1 ? "bg-paper-dim/30" : ""
                        )}
                      >
                        <span className={cn("text-sm tabular leading-tight", isBest ? "font-bold text-charcoal" : "font-medium text-charcoal/80")}>{val}</span>
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          ))}
        </div>

        {/* ── Recruiters ── */}
        <div className="rounded-2xl border border-line overflow-hidden">
          <div className="grid border-b-2 border-charcoal/8" style={{ gridTemplateColumns: `160px repeat(${col}, 1fr)` }}>
            <div className="bg-paper-dim px-4 py-3 border-r border-line">
              <span className="font-mono-label text-[10px] font-black uppercase tracking-[0.2em] text-charcoal">Recruiters</span>
            </div>
            {colleges.map((c) => {
              const isBest = bestFitId === c.id;
              return (
                <div key={c.id} className={cn("bg-paper-dim py-3 border-r border-line last:border-r-0 flex items-center justify-center", isBest && "bg-gold-100/40")}>
                  <span className={cn("text-[10px] font-mono-label font-bold", isBest ? "text-gold-700" : "text-muted")}>
                    {isBest ? "★ top match" : c.name.split(" ").slice(0,2).join(" ")}
                  </span>
                </div>
              );
            })}
          </div>
          <div className="grid" style={{ gridTemplateColumns: `160px repeat(${col}, 1fr)` }}>
            <div className="px-4 py-4 border-r border-line flex items-start pt-4">
              <span className="text-xs text-muted font-medium">Top companies</span>
            </div>
            {colleges.map((c) => {
              const rs = c.placement?.topRecruiters ? JSON.parse(c.placement.topRecruiters) as string[] : [];
              const isBest = bestFitId === c.id;
              return (
                <div key={c.id} className={cn("p-3 border-r border-line last:border-r-0", isBest ? "bg-gold-100/20" : "")}>
                  <div className="flex flex-wrap gap-1.5">
                    {rs.map((r) => (
                      <span key={r} className={cn(
                        "text-[11px] px-2 py-0.5 rounded-full font-medium",
                        isBest ? "bg-teal-100 text-teal-700" : "bg-paper-dim text-muted"
                      )}>{r}</span>
                    ))}
                    {rs.length === 0 && <span className="text-xs text-muted italic">No data</span>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── AI Verdict trigger ── */}
        {canAnalyse && !verdict && !verdictLoading && (
          <div className="flex items-center justify-between gap-4 rounded-2xl border border-line bg-paper p-5">
            <div>
              <p className="font-display font-semibold text-charcoal text-base">Want a full breakdown?</p>
              <p className="text-sm text-muted mt-0.5">Pros, cons, and a final recommendation based on your priorities.</p>
            </div>
            <button
              onClick={handleGetVerdict}
              className="flex-shrink-0 inline-flex items-center gap-2 bg-charcoal text-paper text-sm font-bold px-5 py-3 rounded-xl hover:bg-ink-800 transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              <span className="text-gold-400">✦</span> Get AI verdict
            </button>
          </div>
        )}

        <VerdictPanel
          verdict={verdict}
          loading={verdictLoading}
          onClose={() => { setVerdict(null); setVerdictLoading(false); }}
        />
      </div>
    </>
  );
}