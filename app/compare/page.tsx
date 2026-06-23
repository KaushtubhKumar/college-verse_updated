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

const FACTOR_META: Record<FactorKey, { label: string; icon: string; desc: string }> = {
  placement: { label: "Placements", icon: "💼", desc: "Avg package & placement rate" },
  fees:      { label: "Low Fees",   icon: "💰", desc: "Affordable tuition" },
  roi:       { label: "ROI",        icon: "📈", desc: "Package vs fees ratio" },
  location:  { label: "Location",   icon: "📍", desc: "City & state preference" },
  rating:    { label: "Rating",     icon: "⭐", desc: "Overall college rating" },
};

const DEFAULT_PRIORITIES: FactorKey[] = ["placement", "roi", "fees", "rating", "location"];

const ROW_DEFS = [
  { label: "Type",            key: (c: CompareCollege) => c.type },
  { label: "Location",        key: (c: CompareCollege) => c.location },
  { label: "Established",     key: (c: CompareCollege) => c.established ? String(c.established) : "—" },
  { label: "NAAC Grade",      key: (c: CompareCollege) => c.naacGrade || "—" },
  { label: "NIRF Rank",       key: (c: CompareCollege) => c.nirfRank ? `#${c.nirfRank}` : "—" },
  { label: "Rating",          key: (c: CompareCollege) => `${c.rating.toFixed(1)} ★` },
  { label: "Fees (min/yr)",   key: (c: CompareCollege) => formatFees(c.feesMin) },
  { label: "Fees (max/yr)",   key: (c: CompareCollege) => formatFees(c.feesMax) },
  { label: "Avg Package",     key: (c: CompareCollege) => c.placement ? formatPackage(c.placement.avgPackage) : "—" },
  { label: "Highest Package", key: (c: CompareCollege) => c.placement ? formatPackage(c.placement.highestPackage) : "—" },
  { label: "Placement Rate",  key: (c: CompareCollege) => c.placement ? `${c.placement.placementRate}%` : "—" },
  { label: "Courses Offered", key: (c: CompareCollege) => String(c.courses.length) },
];

const SECTION_TITLES: Record<number, string> = { 0: "General", 4: "Ratings", 6: "Fees", 8: "Placements" };

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

  const minFee = Math.min(...fees),  maxFee = Math.max(...fees);
  const minPkg = Math.min(...pkgs),  maxPkg = Math.max(...pkgs);
  const minRate= Math.min(...rates), maxRate= Math.max(...rates);
  const minRoi = Math.min(...rois),  maxRoi = Math.max(...rois);
  const minRat = Math.min(...ratings), maxRat = Math.max(...ratings);

  return colleges.map((c, i) => {
    const factorScores: Record<FactorKey, number> = {
      fees:      1 - normalize(fees[i], minFee, maxFee),
      placement: (normalize(pkgs[i], minPkg, maxPkg) + normalize(rates[i], minRate, maxRate)) / 2,
      roi:       normalize(rois[i], minRoi, maxRoi),
      rating:    normalize(ratings[i], minRat, maxRat),
      location:  0.5,
    };
    const total = priorities.reduce((sum, factor, rank) => {
      return sum + factorScores[factor] * PRIORITY_WEIGHTS[rank];
    }, 0);
    return { id: c.id, total, factorScores };
  });
}

// ── Preferences Modal ──────────────────────────────────────────────────────────
function PreferencesModal({
  priorities,
  onSave,
  onClose,
}: {
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
    setLocal(next);
    setDragging(null);
    setDragOver(null);
  }
  function moveUp(i: number) {
    if (i === 0) return;
    const next = [...local];
    [next[i-1], next[i]] = [next[i], next[i-1]];
    setLocal(next);
  }
  function moveDown(i: number) {
    if (i === local.length - 1) return;
    const next = [...local];
    [next[i], next[i+1]] = [next[i+1], next[i]];
    setLocal(next);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md">
        <div className="p-6 border-b border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-gray-900">Your priorities</h2>
              <p className="text-sm text-gray-500 mt-0.5">Drag or use arrows to rank what matters most</p>
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/></svg>
            </button>
          </div>
        </div>
        <div className="p-6 space-y-2">
          {local.map((factor, i) => {
            const meta = FACTOR_META[factor];
            return (
              <div
                key={factor}
                draggable
                onDragStart={() => handleDragStart(i)}
                onDragOver={(e) => handleDragOver(e, i)}
                onDrop={() => handleDrop(i)}
                onDragEnd={() => { setDragging(null); setDragOver(null); }}
                className={cn(
                  "flex items-center gap-3 p-3.5 rounded-2xl border-2 transition-all cursor-grab active:cursor-grabbing select-none",
                  dragOver === i ? "border-indigo-400 bg-indigo-50 scale-[1.02]" : "border-gray-100 bg-gray-50 hover:border-gray-200",
                  dragging === i ? "opacity-40" : ""
                )}
              >
                <span className={cn(
                  "w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0",
                  i === 0 ? "bg-indigo-700 text-white" :
                  i === 1 ? "bg-indigo-500 text-white" :
                  i === 2 ? "bg-indigo-300 text-indigo-900" :
                  "bg-gray-200 text-gray-600"
                )}>{i + 1}</span>
                <span className="text-xl flex-shrink-0">{meta.icon}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900">{meta.label}</p>
                  <p className="text-xs text-gray-400">{meta.desc}</p>
                </div>
                <span className="text-xs font-mono text-gray-400 flex-shrink-0">{Math.round(PRIORITY_WEIGHTS[i] * 100)}%</span>
                <div className="flex flex-col gap-0.5 flex-shrink-0">
                  <button onClick={() => moveUp(i)} disabled={i === 0} className="text-gray-300 hover:text-gray-600 disabled:opacity-20 transition-colors">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 15l7-7 7 7"/></svg>
                  </button>
                  <button onClick={() => moveDown(i)} disabled={i === local.length - 1} className="text-gray-300 hover:text-gray-600 disabled:opacity-20 transition-colors">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7"/></svg>
                  </button>
                </div>
                <svg className="w-4 h-4 text-gray-300 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
                  <circle cx="9" cy="6" r="1.5"/><circle cx="15" cy="6" r="1.5"/>
                  <circle cx="9" cy="12" r="1.5"/><circle cx="15" cy="12" r="1.5"/>
                  <circle cx="9" cy="18" r="1.5"/><circle cx="15" cy="18" r="1.5"/>
                </svg>
              </div>
            );
          })}
        </div>
        <div className="p-6 pt-0 flex gap-3">
          <button onClick={() => setLocal([...DEFAULT_PRIORITIES])} className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 transition-colors">
            Reset defaults
          </button>
          <button onClick={() => { onSave(local); onClose(); }} className="flex-1 py-2.5 rounded-xl bg-indigo-700 text-white text-sm font-semibold hover:bg-indigo-800 transition-colors">
            Save & analyse
          </button>
        </div>
      </div>
    </div>
  );
}

// ── LLM Verdict Panel ──────────────────────────────────────────────────────────
interface Verdict {
  winner: string;
  winnerName: string;
  summary: string;
  breakdown: { collegeName: string; pros: string[]; cons: string[] }[];
  finalTake: string;
}

function VerdictPanel({
  verdict,
  loading,
  onClose,
}: {
  verdict: Verdict | null;
  loading: boolean;
  onClose: () => void;
}) {
  if (!loading && !verdict) return null;

  return (
    <div className="mt-6 bg-ink-950 rounded-3xl p-6 text-white relative overflow-hidden">
      <div className="absolute top-0 right-0 w-48 h-48 bg-gold-500/5 rounded-full -translate-y-1/2 translate-x-1/2 pointer-events-none" />
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2.5">
          <span className="text-xl">✦</span>
          <h3 className="font-bold text-lg text-white">AI Verdict</h3>
          <span className="text-xs bg-gold-500/20 text-gold-400 px-2 py-0.5 rounded-full font-mono">Powered by Gemini</span>
        </div>
        <button onClick={onClose} className="text-ink-400 hover:text-white transition-colors">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/></svg>
        </button>
      </div>
      {loading && (
        <div className="space-y-4">
          <div className="flex items-center gap-3 text-ink-300 text-sm">
            <svg className="w-4 h-4 animate-spin text-gold-400" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
            </svg>
            Analysing colleges against your priorities...
          </div>
          <div className="space-y-2 animate-pulse">
            <div className="h-4 bg-ink-800 rounded w-3/4" />
            <div className="h-4 bg-ink-800 rounded w-full" />
            <div className="h-4 bg-ink-800 rounded w-5/6" />
          </div>
        </div>
      )}
      {verdict && !loading && (
        <div className="space-y-5">
          <div className="flex items-center gap-3 p-4 bg-gold-500/10 border border-gold-500/30 rounded-2xl">
            <SealBadge label="★" tone="gold" size="md" />
            <div>
              <p className="text-xs text-gold-400 font-mono uppercase tracking-wide mb-0.5">Best fit for you</p>
              <p className="font-bold text-white text-base">{verdict.winnerName}</p>
            </div>
          </div>
          <p className="text-ink-200 text-sm leading-relaxed">{verdict.summary}</p>
          <div className="space-y-3">
            {verdict.breakdown.map((b) => (
              <div key={b.collegeName} className="bg-ink-900 rounded-2xl p-4">
                <p className="text-xs font-semibold text-ink-300 uppercase tracking-wide mb-3">{b.collegeName}</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-xs text-green-400 font-semibold mb-1.5">Strengths</p>
                    <ul className="space-y-1">
                      {b.pros.map((p, i) => (
                        <li key={i} className="text-xs text-ink-200 flex items-start gap-1.5">
                          <span className="text-green-400 mt-0.5 flex-shrink-0">+</span>{p}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <p className="text-xs text-rose-400 font-semibold mb-1.5">Weaknesses</p>
                    <ul className="space-y-1">
                      {b.cons.map((c, i) => (
                        <li key={i} className="text-xs text-ink-200 flex items-start gap-1.5">
                          <span className="text-rose-400 mt-0.5 flex-shrink-0">−</span>{c}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="border-t border-ink-800 pt-4">
            <p className="text-xs text-gold-400 font-mono uppercase tracking-wide mb-2">Final take</p>
            <p className="text-sm text-ink-100 leading-relaxed">{verdict.finalTake}</p>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────────
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
    const best = computed.reduce((a, b) => b.total > a.total ? b : a);
    setBestFitId(best.id);
    setVerdict(null);
  }, []);

  useEffect(() => {
    if (!ids.length) { setLoading(false); return; }
    fetch(`/api/compare?ids=${ids.join(",")}`)
      .then((r) => r.json())
      .then((d) => {
        const cols: CompareCollege[] = d.colleges || [];
        setColleges(cols);
        if (cols.length >= 2) {
          const computed = computeWeightedScores(cols, DEFAULT_PRIORITIES);
          setScores(computed);
          const best = computed.reduce((a, b) => b.total > a.total ? b : a);
          setBestFitId(best.id);
        }
      })
      .finally(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams.toString()]);

  async function handleGetVerdict() {
    if (!colleges.length || !priorities.length) return;
    setVerdictLoading(true);
    setVerdict(null);
    const payload = {
      colleges: colleges.map((c) => ({
        id: c.id,
        name: c.name,
        location: c.location,
        type: c.type,
        feesMin: c.feesMin,
        feesMax: c.feesMax,
        rating: c.rating,
        naacGrade: c.naacGrade,
        nirfRank: c.nirfRank,
        avgPackage: c.placement?.avgPackage ?? null,
        highestPackage: c.placement?.highestPackage ?? null,
        placementRate: c.placement?.placementRate ?? null,
        topRecruiters: c.placement?.topRecruiters ? JSON.parse(c.placement.topRecruiters) : [],
      })),
      priorities: priorities.map((f, i) => ({
        factor: FACTOR_META[f].label,
        weight: PRIORITY_WEIGHTS[i],
        rank: i + 1,
      })),
      scores: scores.map((s) => {
        const col = colleges.find((c) => c.id === s.id);
        return { collegeName: col?.name ?? s.id, score: s.total };
      }),
    };
    try {
      const res = await fetch("/api/compare/verdict", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data.verdict) setVerdict(data.verdict);
    } catch {
      console.error("Verdict failed");
    } finally {
      setVerdictLoading(false);
    }
  }

  const canAnalyse = colleges.length >= 2;

  if (!ids.length) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-24 text-center">
        <div className="w-16 h-16 rounded-full bg-ink-950 mx-auto mb-5 flex items-center justify-center">
          <svg className="w-7 h-7 text-gold-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 6l3 1m0 0l-3 9a5 5 0 006 0l-3-9m0 0l3.75-1m3 0l3-1m0 0l3 9a5 5 0 006 0l-3-9m0 0l-3.75-1M9 18h6" /></svg>
        </div>
        <h1 className="font-display text-2xl font-semibold text-charcoal mb-3">Nothing to compare yet</h1>
        <p className="text-muted mb-6">Add colleges to compare from the listings page.</p>
        <Link href="/" className="bg-ink-900 text-paper px-6 py-3 rounded-full font-medium hover:bg-ink-800 transition-colors">Browse colleges</Link>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-12">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-paper-dim rounded w-48" />
          <div className="grid grid-cols-3 gap-4">
            {[1,2,3].map(i => <div key={i} className="h-64 bg-paper-dim rounded-2xl" />)}
          </div>
        </div>
      </div>
    );
  }

  const col = colleges.length;

  return (
    <>
      {showPrefs && (
        <PreferencesModal
          priorities={priorities}
          onSave={(p) => { setPriorities(p); runAnalysis(p, colleges); }}
          onClose={() => setShowPrefs(false)}
        />
      )}

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <h1 className="font-display text-2xl font-semibold text-charcoal">Compare colleges</h1>
          <Link href="/" className="text-sm text-ink-800 hover:text-gold-600 font-medium">← Add more</Link>
        </div>

        {/* Best Fit CTA */}
        {canAnalyse && (
          <div className="bg-ink-950 rounded-2xl px-6 py-4 mb-6">
            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
              <div className="flex-1">
                <p className="text-sm font-semibold text-white mb-1">Best fit for you</p>
                <div className="flex flex-wrap gap-1.5">
                  {priorities.map((f, i) => (
                    <span key={f} className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-ink-800 text-ink-200">
                      <span className="font-bold text-gold-400">#{i+1}</span>
                      {FACTOR_META[f].icon} {FACTOR_META[f].label}
                    </span>
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <button
                  onClick={() => setShowPrefs(true)}
                  className="text-xs text-ink-300 hover:text-white border border-ink-700 hover:border-ink-500 px-3 py-2 rounded-xl transition-colors"
                >
                  ✏️ Edit priorities
                </button>
                <button
                  onClick={() => {
                    if (!bestFitId) {
                      runAnalysis(priorities, colleges);
                    } else {
                      setShowPrefs(true);
                    }
                  }}
                  className="inline-flex items-center gap-2 bg-gold-500 hover:bg-gold-600 text-ink-950 font-bold text-sm px-5 py-2.5 rounded-xl ring-4 ring-gold-700/30 transition-all hover:scale-[1.02] active:scale-[0.98]"
                >
                  ✦ Best fit for U
                </button>
              </div>
            </div>

            {/* Score bars — shown after analysis */}
            {scores.length > 0 && (
              <div className="mt-4 pt-4 border-t border-ink-800 grid gap-2" style={{ gridTemplateColumns: `repeat(${col}, 1fr)` }}>
                {colleges.map((c) => {
                  const s = scores.find((x) => x.id === c.id);
                  const pct = s ? Math.round(s.total * 100) : 0;
                  const isBest = bestFitId === c.id;
                  return (
                    <div key={c.id}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-ink-300 truncate">{c.name.split(" ").slice(0,3).join(" ")}</span>
                        <span className={cn("text-xs font-bold", isBest ? "text-gold-400" : "text-ink-300")}>{pct}%</span>
                      </div>
                      <div className="h-1.5 bg-ink-800 rounded-full overflow-hidden">
                        <div
                          className={cn("h-full rounded-full transition-all duration-700", isBest ? "bg-gold-500" : "bg-ink-600")}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Get AI verdict button */}
            {bestFitId && !verdict && !verdictLoading && (
              <div className="mt-4 pt-4 border-t border-ink-800 flex items-center justify-between gap-4">
                <p className="text-xs text-ink-400">Want a detailed explanation with pros & cons from AI?</p>
                <button
                  onClick={handleGetVerdict}
                  className="text-xs font-semibold text-gold-400 hover:text-gold-300 border border-gold-500/30 hover:border-gold-500/60 px-4 py-2 rounded-xl transition-colors flex items-center gap-1.5"
                >
                  ✦ Get AI verdict
                </button>
              </div>
            )}
          </div>
        )}

        {/* AI Verdict panel */}
        <VerdictPanel
          verdict={verdict}
          loading={verdictLoading}
          onClose={() => { setVerdict(null); setVerdictLoading(false); }}
        />

        {/* College headers */}
        <div className="grid gap-4 mb-6 mt-6" style={{ gridTemplateColumns: `200px repeat(${col}, 1fr)` }}>
          <div />
          {colleges.map((c) => {
            const isBest = bestFitId === c.id;
            const s = scores.find((x) => x.id === c.id);
            return (
              <div
                key={c.id}
                className={cn(
                  "relative text-white rounded-2xl p-5 text-center transition-all",
                  isBest ? "bg-ink-950 ring-4 ring-gold-500" : "bg-ink-900"
                )}
              >
                {isBest && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <SealBadge label="★" tone="gold" size="sm" title="Best fit for you" />
                  </div>
                )}
                <h2 className="font-display font-semibold text-base leading-snug mb-2 mt-1">{c.name}</h2>
                <p className="text-ink-200 text-xs mb-3">{c.location}</p>
                {isBest && <p className="text-[11px] font-mono uppercase tracking-wide text-gold-500 mb-2">Best fit for U</p>}
                {s && (
                  <p className="text-xs text-ink-300 mb-2">Match score: <span className={cn("font-bold", isBest ? "text-gold-400" : "text-white")}>{Math.round(s.total * 100)}%</span></p>
                )}
                <Link href={`/college/${c.slug}`} className="inline-block text-xs bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-full transition-colors">View details →</Link>
              </div>
            );
          })}
        </div>

        {/* Comparison rows */}
        <div className="bg-white rounded-2xl border border-line overflow-hidden">
          {ROW_DEFS.map((row, i) => {
            const sectionStart = i in SECTION_TITLES;
            return (
              <div key={row.label}>
                {sectionStart && (
                  <div className="bg-paper-dim border-b border-t border-line px-5 py-2">
                    <span className="text-xs font-mono-label font-semibold uppercase tracking-widest text-muted">{SECTION_TITLES[i]}</span>
                  </div>
                )}
                <div
                  className="grid items-center border-b border-line last:border-0 hover:bg-gold-100/30 transition-colors"
                  style={{ gridTemplateColumns: `200px repeat(${col}, 1fr)` }}
                >
                  <div className="px-5 py-3.5">
                    <span className="text-sm text-muted font-medium">{row.label}</span>
                  </div>
                  {colleges.map((c) => {
                    const val = row.key(c);
                    return (
                      <div key={c.id} className={cn("px-4 py-3.5 text-center border-l border-line", bestFitId === c.id && "bg-gold-100/40")}>
                        <span className="text-sm font-semibold text-charcoal tabular">{val}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {/* Recruiters */}
        <div className="mt-6 bg-white rounded-2xl border border-line p-6">
          <h3 className="font-display text-base font-semibold text-charcoal mb-4">Top recruiters</h3>
          <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${col}, 1fr)` }}>
            {colleges.map((c) => {
              const rs = c.placement?.topRecruiters ? JSON.parse(c.placement.topRecruiters) as string[] : [];
              return (
                <div key={c.id}>
                  <p className="text-sm font-semibold text-charcoal mb-2 truncate">{c.name.split(" ").slice(0, 3).join(" ")}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {rs.map((r) => (
                      <span key={r} className="text-xs bg-teal-100 text-teal-700 px-2 py-0.5 rounded-full">{r}</span>
                    ))}
                    {rs.length === 0 && <span className="text-xs text-muted">—</span>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </>
  );
}
