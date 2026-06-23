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

const FACTOR_META: Record<FactorKey, { label: string; desc: string }> = {
  placement: { label: "Placements", desc: "Avg package & placement rate" },
  fees:      { label: "Low fees",   desc: "Affordable tuition" },
  roi:       { label: "ROI",        desc: "Package vs fees ratio" },
  location:  { label: "Location",   desc: "City & state preference" },
  rating:    { label: "Rating",     desc: "Overall college rating" },
};

function FactorIcon({ factor, className }: { factor: FactorKey; className?: string }) {
  const d = FACTOR_ICONS[factor];
  const paths = d.split("|");
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      {paths.map((p, i) => <path key={i} d={p} />)}
    </svg>
  );
}

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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink-950/60 backdrop-blur-sm">
      <div className="bg-paper rounded-3xl shadow-2xl w-full max-w-md border border-line">
        <div className="p-6 border-b border-line">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-display text-lg font-semibold text-charcoal">Your priorities</h2>
              <p className="text-sm text-muted mt-0.5">Drag or use arrows to rank what matters most</p>
            </div>
            <button onClick={onClose} className="text-muted hover:text-charcoal p-1 transition-colors">
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
                  dragOver === i ? "border-gold-500 bg-gold-100/50 scale-[1.02]" : "border-line bg-white hover:border-gold-500/40",
                  dragging === i ? "opacity-40" : ""
                )}
              >
                <span className={cn(
                  "w-7 h-7 rounded-full flex items-center justify-center text-xs font-mono-label font-bold flex-shrink-0",
                  i === 0 ? "bg-gold-500 text-ink-950" :
                  i === 1 ? "bg-gold-300 text-ink-950" :
                  i === 2 ? "bg-paper-dim text-ink-800 border border-line" :
                  "bg-paper-dim text-muted border border-line"
                )}>{i + 1}</span>
                <span className="w-8 h-8 rounded-xl bg-ink-950 text-gold-500 flex items-center justify-center flex-shrink-0">
                  <FactorIcon factor={factor} className="w-4 h-4" />
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-charcoal">{meta.label}</p>
                  <p className="text-xs text-muted">{meta.desc}</p>
                </div>
                <span className="text-xs font-mono-label text-muted flex-shrink-0">{Math.round(PRIORITY_WEIGHTS[i] * 100)}%</span>
                <div className="flex flex-col gap-0.5 flex-shrink-0">
                  <button onClick={() => moveUp(i)} disabled={i === 0} className="text-ink-400 hover:text-ink-800 disabled:opacity-20 transition-colors">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 15l7-7 7 7"/></svg>
                  </button>
                  <button onClick={() => moveDown(i)} disabled={i === local.length - 1} className="text-ink-400 hover:text-ink-800 disabled:opacity-20 transition-colors">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7"/></svg>
                  </button>
                </div>
                <svg className="w-4 h-4 text-ink-200 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
                  <circle cx="9" cy="6" r="1.5"/><circle cx="15" cy="6" r="1.5"/>
                  <circle cx="9" cy="12" r="1.5"/><circle cx="15" cy="12" r="1.5"/>
                  <circle cx="9" cy="18" r="1.5"/><circle cx="15" cy="18" r="1.5"/>
                </svg>
              </div>
            );
          })}
        </div>
        <div className="p-6 pt-0 flex gap-3">
          <button onClick={() => setLocal([...DEFAULT_PRIORITIES])} className="flex-1 py-2.5 rounded-xl border border-line text-sm text-muted hover:bg-paper-dim transition-colors">
            Reset defaults
          </button>
          <button onClick={() => { onSave(local); onClose(); }} className="flex-1 py-2.5 rounded-xl bg-ink-950 text-paper text-sm font-semibold hover:bg-ink-900 transition-colors">
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
    if (!ids.length) { setLoading(false); setColleges([]); return; }
    const controller = new AbortController();
    setLoading(true);
    fetch(`/api/compare?ids=${ids.join(",")}`, { signal: controller.signal })
      .then((r) => r.json())
      .then((d) => {
        const cols: CompareCollege[] = d.colleges || [];
        setColleges(cols);
        if (cols.length >= 2) {
          const computed = computeWeightedScores(cols, DEFAULT_PRIORITIES);
          setScores(computed);
          const best = computed.reduce((a, b) => b.total > a.total ? b : a);
          setBestFitId(best.id);
        } else {
          setScores([]);
          setBestFitId(null);
        }
      })
      .catch((err) => {
        if (err.name !== "AbortError") console.error("Failed to load compare data", err);
      })
      .finally(() => setLoading(false));
    return () => controller.abort();
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

        {/* Best Fit panel */}
        {canAnalyse && (
          <div className="bg-ink-950 rounded-3xl px-6 sm:px-7 py-6 mb-8 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-gold-500/[0.06] rounded-full -translate-y-1/3 translate-x-1/4 pointer-events-none" />

            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-5 relative">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-gold-500 text-lg leading-none">✦</span>
                  <h2 className="font-display text-lg font-semibold text-white">Best fit for you</h2>
                </div>
                <p className="text-sm text-ink-300 mb-3">Ranked by what matters most to you, in order</p>
                <div className="flex flex-wrap gap-2">
                  {priorities.map((f, i) => (
                    <span key={f} className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-full bg-ink-900 border border-ink-700 text-ink-200">
                      <span className="font-mono-label font-bold text-gold-400">{i + 1}</span>
                      <FactorIcon factor={f} className="w-3.5 h-3.5 text-gold-500" />
                      {FACTOR_META[f].label}
                    </span>
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <button
                  onClick={() => setShowPrefs(true)}
                  className="inline-flex items-center gap-1.5 text-xs font-medium text-ink-300 hover:text-white border border-ink-700 hover:border-ink-500 px-3.5 py-2.5 rounded-xl transition-colors"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
                  Edit priorities
                </button>
              </div>
            </div>

            {/* Winner callout + score bars */}
            {scores.length > 0 && (() => {
              const winner = colleges.find((c) => c.id === bestFitId);
              const winnerScore = scores.find((s) => s.id === bestFitId);
              return (
                <div className="mt-5 pt-5 border-t border-ink-800 relative">
                  {winner && (
                    <div className="flex items-center gap-3 mb-5 p-3.5 pr-4 bg-gold-500/10 border border-gold-500/25 rounded-2xl">
                      <SealBadge label="★" tone="gold" size="md" />
                      <div className="min-w-0 flex-1">
                        <p className="text-[11px] font-mono-label uppercase tracking-wide text-gold-400 mb-0.5">Top match</p>
                        <p className="font-display font-semibold text-white text-base truncate">{winner.name}</p>
                      </div>
                      {winnerScore && (
                        <span className="font-mono-label font-bold text-gold-400 text-lg flex-shrink-0">{Math.round(winnerScore.total * 100)}%</span>
                      )}
                    </div>
                  )}
                  <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${col}, 1fr)` }}>
                    {colleges.map((c) => {
                      const s = scores.find((x) => x.id === c.id);
                      const pct = s ? Math.round(s.total * 100) : 0;
                      const isBest = bestFitId === c.id;
                      return (
                        <div key={c.id}>
                          <div className="flex items-center justify-between mb-1.5">
                            <span className={cn("text-xs truncate", isBest ? "text-white font-semibold" : "text-ink-300")}>{c.name.split(" ").slice(0,3).join(" ")}</span>
                            <span className={cn("text-xs font-mono-label font-bold flex-shrink-0 ml-2", isBest ? "text-gold-400" : "text-ink-400")}>{pct}%</span>
                          </div>
                          <div className="h-2 bg-ink-800 rounded-full overflow-hidden">
                            <div
                              className={cn("h-full rounded-full transition-all duration-700", isBest ? "bg-gold-500" : "bg-ink-600")}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })()}

            {/* Get AI verdict button */}
            {bestFitId && !verdict && !verdictLoading && (
              <div className="mt-5 pt-5 border-t border-ink-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <p className="text-sm text-ink-300">Want a detailed breakdown with pros & cons for each college?</p>
                <button
                  onClick={handleGetVerdict}
                  className="inline-flex items-center justify-center gap-2 text-sm font-semibold text-ink-950 bg-gold-500 hover:bg-gold-600 px-5 py-2.5 rounded-xl transition-all hover:scale-[1.02] active:scale-[0.98] flex-shrink-0"
                >
                  <span className="text-base leading-none">✦</span> Get AI verdict
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
        <div className="grid gap-4 mb-6 mt-8" style={{ gridTemplateColumns: `200px repeat(${col}, 1fr)` }}>
          <div className="hidden sm:block" />
          {colleges.map((c) => {
            const isBest = bestFitId === c.id;
            const s = scores.find((x) => x.id === c.id);
            return (
              <div
                key={c.id}
                className={cn(
                  "relative text-white rounded-2xl p-6 text-center transition-all flex flex-col",
                  isBest ? "bg-ink-950 ring-2 ring-gold-500 shadow-[0_12px_32px_-8px_rgba(186,138,51,0.35)]" : "bg-ink-900"
                )}
              >
                {isBest && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                    <SealBadge label="★" tone="gold" size="sm" title="Best fit for you" />
                  </div>
                )}
                {isBest && <p className="text-[10px] font-mono-label font-semibold uppercase tracking-widest text-gold-500 mb-2 mt-1.5">Best fit</p>}
                <h2 className={cn("font-display font-semibold text-base leading-snug mb-1.5", !isBest && "mt-1")}>{c.name}</h2>
                <p className="text-ink-200 text-xs mb-4 flex items-center justify-center gap-1">
                  <svg className="w-3 h-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
                  {c.location}
                </p>
                {s && (
                  <div className="mb-4">
                    <p className={cn("font-mono-label font-bold text-2xl leading-none", isBest ? "text-gold-400" : "text-white")}>{Math.round(s.total * 100)}%</p>
                    <p className="text-[11px] text-ink-300 mt-1">match score</p>
                  </div>
                )}
                <Link href={`/college/${c.slug}`} className="mt-auto inline-flex items-center justify-center gap-1 text-xs font-medium bg-white/10 hover:bg-white/20 px-3 py-2 rounded-full transition-colors">
                  View details <span aria-hidden="true">→</span>
                </Link>
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
                  <div className="bg-paper-dim border-b border-t border-line px-5 py-2.5">
                    <span className="text-xs font-mono-label font-semibold uppercase tracking-widest text-muted">{SECTION_TITLES[i]}</span>
                  </div>
                )}
                <div
                  className="grid items-center border-b border-line last:border-0 hover:bg-gold-100/20 transition-colors"
                  style={{ gridTemplateColumns: `200px repeat(${col}, 1fr)` }}
                >
                  <div className="px-5 py-4">
                    <span className="text-sm text-muted font-medium">{row.label}</span>
                  </div>
                  {colleges.map((c) => {
                    const val = row.key(c);
                    const isBest = bestFitId === c.id;
                    return (
                      <div key={c.id} className={cn("px-4 py-4 text-center border-l border-line", isBest && "bg-gold-100/30")}>
                        <span className={cn("text-sm tabular", isBest ? "font-bold text-ink-900" : "font-semibold text-charcoal")}>{val}</span>
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