"use client";
import { useEffect, useState, useCallback, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { formatFees, formatPackage, cn } from "@/lib/utils";
import SealBadge from "@/components/ui/SealBadge";
import { useSavedComparisonsStore } from "@/stores/saved-comparisons.store";
import type { College } from "@/types";

interface CompareCollege extends College {
  courses: NonNullable<College["courses"]>;
  placement: NonNullable<College["placement"]> | null;
}

type FactorKey = "placement" | "fees" | "roi" | "location" | "rating";

const FACTOR_META: Record<FactorKey, { label: string; desc: string; icon: string }> = {
  placement: { label: "Placements",  desc: "Avg package & rate",    icon: "M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" },
  fees:      { label: "Low Fees",    desc: "Affordable tuition",    icon: "M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" },
  roi:       { label: "ROI",         desc: "Package ÷ fees",        icon: "M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" },
  location:  { label: "Location",    desc: "City preference",       icon: "M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z|M15 11a3 3 0 11-6 0 3 3 0 016 0z" },
  rating:    { label: "Rating",      desc: "Overall score",         icon: "M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" },
};

function FactorIcon({ icon, className }: { icon: string; className?: string }) {
  const paths = icon.split("|");
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      {paths.map((p, i) => <path key={i} d={p} />)}
    </svg>
  );
}

const ALL_FACTORS: FactorKey[] = ["placement", "roi", "fees", "rating", "location"];
const DEFAULT_PRIORITIES: FactorKey[] = ["placement", "roi", "fees", "rating", "location"];
const PRIORITY_WEIGHTS = [0.35, 0.25, 0.20, 0.12, 0.08];

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
    title: "Academics & Fees",
    rows: [
      { label: "Fees (min / yr)", key: (c: CompareCollege) => formatFees(c.feesMin) },
      { label: "Fees (max / yr)", key: (c: CompareCollege) => formatFees(c.feesMax) },
      { label: "Rating",          key: (c: CompareCollege) => `${c.rating.toFixed(1)} / 5` },
      { label: "Courses",         key: (c: CompareCollege) => `${c.courses.length} offered` },
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

function computeWeightedScores(colleges: CompareCollege[], priorities: FactorKey[]) {
  const fees    = colleges.map(c => c.feesMax);
  const pkgs    = colleges.map(c => c.placement?.avgPackage ?? 0);
  const rates   = colleges.map(c => c.placement?.placementRate ?? 0);
  const rois    = colleges.map(c => c.placement ? c.placement.avgPackage / Math.max(c.feesMax, 1) : 0);
  const ratings = colleges.map(c => c.rating);

  const [minFee, maxFee] = [Math.min(...fees), Math.max(...fees)];
  const [minPkg, maxPkg] = [Math.min(...pkgs), Math.max(...pkgs)];
  const [minRate, maxRate] = [Math.min(...rates), Math.max(...rates)];
  const [minRoi, maxRoi] = [Math.min(...rois), Math.max(...rois)];
  const [minRat, maxRat] = [Math.min(...ratings), Math.max(...ratings)];

  return colleges.map((c, i) => {
    const s: Record<FactorKey, number> = {
      fees:      1 - normalize(fees[i], minFee, maxFee),
      placement: (normalize(pkgs[i], minPkg, maxPkg) + normalize(rates[i], minRate, maxRate)) / 2,
      roi:       normalize(rois[i], minRoi, maxRoi),
      rating:    normalize(ratings[i], minRat, maxRat),
      location:  0.5,
    };
    const total = priorities.reduce((sum, f, rank) => sum + s[f] * PRIORITY_WEIGHTS[rank], 0);
    return { id: c.id, total, factorScores: s };
  });
}

function SaveComparisonPanel({ colleges, ids }: { colleges: CompareCollege[]; ids: string[] }) {
  const { save, remove, comparisons, hasComparison } = useSavedComparisonsStore();
  const [customName, setCustomName] = useState("");
  const [showPanel, setShowPanel] = useState(false);
  const [justSaved, setJustSaved] = useState(false);

  const alreadySaved = hasComparison(ids);
  const defaultName = colleges.map(c => c.name.split(" ").slice(0, 2).join(" ")).join(" vs ");
  const savedEntry = comparisons.find(c =>
    [...ids].sort().join(",") === [...c.ids].sort().join(",")
  );

  function handleSave() {
    save({ name: customName.trim() || defaultName, ids, names: colleges.map(c => c.name) });
    setJustSaved(true);
    setShowPanel(false);
    setTimeout(() => setJustSaved(false), 3000);
  }

  function handleRemove() {
    if (savedEntry) remove(savedEntry.id);
  }

  return (
    <div className="relative">
      {alreadySaved ? (
        <button
          onClick={handleRemove}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-teal-700 bg-teal-100 px-4 py-2 rounded-full hover:bg-teal-200 transition-colors"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7"/></svg>
          Saved
        </button>
      ) : (
        <button
          onClick={() => setShowPanel(true)}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-charcoal bg-paper border border-line px-4 py-2 rounded-full hover:border-charcoal transition-colors"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"/></svg>
          Save comparison
        </button>
      )}

      {justSaved && (
        <div className="absolute top-10 right-0 bg-charcoal text-paper text-xs font-medium px-3 py-2 rounded-xl shadow-lg whitespace-nowrap z-10">
          ✓ Comparison saved
        </div>
      )}

      {showPanel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink-950/60 backdrop-blur-sm">
          <div className="bg-paper rounded-2xl border border-line shadow-2xl w-full max-w-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display font-semibold text-charcoal">Save this comparison</h3>
              <button onClick={() => setShowPanel(false)} className="text-muted hover:text-charcoal transition-colors">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/></svg>
              </button>
            </div>
            <p className="text-xs text-muted mb-3">Give it a name so you can find it later</p>
            <input
              type="text"
              value={customName}
              onChange={e => setCustomName(e.target.value)}
              placeholder={defaultName}
              className="w-full border border-line rounded-xl px-3 py-2.5 text-sm text-charcoal placeholder:text-muted focus:outline-none focus:border-gold-500 mb-4 bg-white"
            />
            <div className="flex gap-2">
              <button onClick={() => setShowPanel(false)} className="flex-1 py-2.5 rounded-xl border border-line text-sm text-muted hover:bg-paper-dim transition-colors">
                Cancel
              </button>
              <button onClick={handleSave} className="flex-1 py-2.5 rounded-xl bg-charcoal text-paper text-sm font-semibold hover:bg-ink-800 transition-colors">
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function SavedComparisonsDrawer({ onClose }: { onClose: () => void }) {
  const { comparisons, remove } = useSavedComparisonsStore();
  const router = useRouter();

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-ink-950/60 backdrop-blur-sm">
      <div className="bg-paper rounded-2xl border border-line shadow-2xl w-full max-w-md max-h-[80vh] flex flex-col">
        <div className="px-5 py-4 border-b border-line flex items-center justify-between">
          <h3 className="font-display font-semibold text-charcoal">Saved comparisons</h3>
          <button onClick={onClose} className="text-muted hover:text-charcoal transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/></svg>
          </button>
        </div>
        <div className="overflow-y-auto flex-1 p-3 space-y-1.5">
          {comparisons.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted text-sm">No saved comparisons yet.</p>
              <p className="text-muted text-xs mt-1">Use "Save comparison" above.</p>
            </div>
          ) : comparisons.map(comp => (
            <div key={comp.id} className="flex items-center gap-3 p-3 rounded-xl hover:bg-paper-dim transition-colors group">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-charcoal truncate">{comp.name}</p>
                <p className="text-xs text-muted mt-0.5">{new Date(comp.savedAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}</p>
              </div>
              <button
                onClick={() => { router.push(`/compare?ids=${comp.ids.join(",")}`); onClose(); }}
                className="text-xs font-semibold text-gold-600 hover:text-gold-700 transition-colors flex-shrink-0"
              >
                View →
              </button>
              <button
                onClick={() => remove(comp.id)}
                className="text-muted hover:text-clay-600 transition-colors flex-shrink-0 opacity-0 group-hover:opacity-100"
                aria-label="Remove"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/></svg>
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function PrioritiesPanel({ priorities, onSave, onClose }: {
  priorities: FactorKey[];
  onSave: (p: FactorKey[]) => void;
  onClose: () => void;
}) {
  const [local, setLocal] = useState<FactorKey[]>([...priorities]);

  function toggle(f: FactorKey) {
    setLocal(prev =>
      prev.includes(f) ? prev.filter(x => x !== f) : [...prev, f]
    );
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-charcoal/50 backdrop-blur-sm">
      <div className="bg-paper rounded-2xl shadow-2xl w-full max-w-sm border border-line overflow-hidden">
        <div className="px-5 py-4 border-b border-line flex items-start justify-between gap-3">
          <div>
            <h2 className="font-display text-lg font-semibold text-charcoal">What matters most?</h2>
            <p className="text-xs text-muted mt-0.5">Reorder to change weighting</p>
          </div>
          <button onClick={onClose} className="mt-0.5 text-muted hover:text-charcoal transition-colors flex-shrink-0 p-1">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/></svg>
          </button>
        </div>

        <div className="p-4 space-y-2">
          {local.map((f, i) => {
            const meta = FACTOR_META[f];
            const weight = Math.round(PRIORITY_WEIGHTS[i] * 100);
            return (
              <div key={f} className="flex items-center gap-3 px-3 py-2.5 rounded-xl border border-line bg-white">
                <span className={cn(
                  "w-6 h-6 rounded-full text-xs font-mono-label font-black flex items-center justify-center flex-shrink-0",
                  i === 0 ? "bg-gold-500 text-white" :
                  i === 1 ? "bg-paper-dim text-charcoal border border-line" :
                  "bg-paper-dim text-muted border border-line"
                )}>{i + 1}</span>
                <FactorIcon icon={meta.icon} className={cn("w-4 h-4 flex-shrink-0", i === 0 ? "text-gold-600" : "text-muted")} />
                <div className="flex-1 min-w-0">
                  <p className={cn("text-sm font-semibold leading-tight", i === 0 ? "text-charcoal" : "text-charcoal/80")}>{meta.label}</p>
                  <p className="text-[11px] text-muted">{meta.desc}</p>
                </div>
                <span className={cn(
                  "text-xs font-mono-label font-bold px-1.5 py-0.5 rounded-md flex-shrink-0",
                  i === 0 ? "bg-gold-100 text-gold-700" : "bg-paper-dim text-muted"
                )}>{weight}%</span>
                <div className="flex flex-col gap-0 flex-shrink-0">
                  <button onClick={() => moveUp(i)} disabled={i === 0} className="text-ink-300 hover:text-charcoal disabled:opacity-20 p-0.5 transition-colors">
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 15l7-7 7 7"/></svg>
                  </button>
                  <button onClick={() => moveDown(i)} disabled={i === local.length - 1} className="text-ink-300 hover:text-charcoal disabled:opacity-20 p-0.5 transition-colors">
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7"/></svg>
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        <div className="px-4 pb-4 flex gap-2">
          <button onClick={() => setLocal([...DEFAULT_PRIORITIES])} className="flex-1 py-2.5 rounded-xl border border-line text-sm text-muted hover:bg-paper-dim transition-colors font-medium">
            Reset
          </button>
          <button onClick={() => { onSave(local); onClose(); }} className="flex-1 py-2.5 rounded-xl bg-gold-500 text-white text-sm font-bold hover:bg-gold-600 transition-colors">
            Apply
          </button>
        </div>
      </div>
    </div>
  );
}

interface Verdict {
  winner: string; winnerName: string; summary: string;
  breakdown: { collegeName: string; pros: string[]; cons: string[] }[];
  finalTake: string;
}

function VerdictPanel({ verdict, loading, onClose }: { verdict: Verdict | null; loading: boolean; onClose: () => void }) {
  if (!loading && !verdict) return null;
  return (
    <div className="rounded-2xl bg-charcoal text-paper p-6 relative overflow-hidden">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <span className="text-gold-500">✦</span>
          <h3 className="font-display font-semibold text-base text-paper">AI Verdict</h3>
          <span className="text-[10px] bg-gold-500/20 text-gold-400 px-2 py-0.5 rounded-full font-mono-label">Gemini</span>
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
          <div className="space-y-2 animate-pulse">
            <div className="h-3 bg-ink-800 rounded w-3/4"/><div className="h-3 bg-ink-800 rounded"/><div className="h-3 bg-ink-800 rounded w-5/6"/>
          </div>
        </div>
      )}
      {verdict && !loading && (
        <div className="space-y-5">
          <div className="flex items-center gap-3 p-4 bg-gold-500/10 border border-gold-500/25 rounded-xl">
            <SealBadge label="★" tone="gold" size="md" />
            <div>
              <p className="text-[10px] text-gold-400 font-mono-label uppercase tracking-widest mb-0.5">Best fit</p>
              <p className="font-display font-semibold text-base text-paper">{verdict.winnerName}</p>
            </div>
          </div>
          <p className="text-ink-200 text-sm leading-relaxed">{verdict.summary}</p>
          {verdict.breakdown.map(b => (
            <div key={b.collegeName} className="bg-ink-900 rounded-xl p-4">
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
          <div className="border-t border-ink-800 pt-4">
            <p className="text-[10px] text-gold-400 font-mono-label uppercase tracking-widest mb-2">Final take</p>
            <p className="text-sm text-ink-100 leading-relaxed">{verdict.finalTake}</p>
          </div>
        </div>
      )}
    </div>
  );
}

function ComparePageContent() {
  const searchParams = useSearchParams();
  const ids = (searchParams.get("ids") || "").split(",").filter(Boolean).slice(0, 3);

  const [colleges, setColleges] = useState<CompareCollege[]>([]);
  const [loading, setLoading] = useState(true);
  const [showPrefs, setShowPrefs] = useState(false);
  const [showSavedDrawer, setShowSavedDrawer] = useState(false);
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
    const ctrl = new AbortController();
    setLoading(true);
    fetch(`/api/compare?ids=${ids.join(",")}`, { signal: ctrl.signal })
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
      .catch(e => { if (e.name !== "AbortError") console.error(e); })
      .finally(() => setLoading(false));
    return () => ctrl.abort();
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
        <div className="h-7 bg-paper-dim rounded w-48" />
        <div className="grid grid-cols-3 gap-4">{[1,2,3].map(i=><div key={i} className="h-44 bg-paper-dim rounded-2xl"/>)}</div>
      </div>
    );
  }

  return (
    <>
      {showPrefs && (
        <PrioritiesPanel
          priorities={priorities}
          onSave={p => { setPriorities(p); runAnalysis(p, colleges); }}
          onClose={() => setShowPrefs(false)}
        />
      )}
      {showSavedDrawer && <SavedComparisonsDrawer onClose={() => setShowSavedDrawer(false)} />}

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-7">
        <div className="flex items-center justify-between gap-4 pb-5 border-b border-line">
          <div>
            <p className="font-mono-label text-[10px] tracking-[0.3em] uppercase text-gold-600 mb-1.5">Head-to-head</p>
            <h1 className="font-display text-3xl font-semibold text-charcoal">Compare colleges</h1>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {canAnalyse && <SaveComparisonPanel colleges={colleges} ids={ids} />}
            <button
              onClick={() => setShowSavedDrawer(true)}
              className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-charcoal border border-line px-3.5 py-2 rounded-full transition-colors hover:border-charcoal/30"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16"/></svg>
              History
            </button>
            <Link href="/" className="text-sm text-muted hover:text-charcoal transition-colors border border-line px-3.5 py-2 rounded-full hover:border-charcoal/30">
              + Add
            </Link>
          </div>
        </div>

        {canAnalyse && (
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="flex flex-wrap gap-2 items-center flex-1">
              <span className="text-[11px] font-mono-label text-muted uppercase tracking-widest mr-1 flex-shrink-0">Ranked by</span>

              {priorities.map((f, i) => {
                const meta = FACTOR_META[f];
                const isTop = i === 0;
                const isSecond = i === 1;
                return (
                  <span
                    key={f}
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-semibold border transition-all",
                      isTop
                        ? "bg-gold-500 text-white border-gold-500"
                        : isSecond
                        ? "bg-paper-dim text-charcoal border-line"
                        : "bg-transparent text-muted border-line/60 line-through decoration-muted/40"
                    )}
                  >
                    <FactorIcon
                      icon={meta.icon}
                      className={cn("w-3.5 h-3.5 flex-shrink-0", isTop ? "text-white" : isSecond ? "text-charcoal/70" : "text-muted")}
                    />
                    {meta.label}
                    {i <= 1 && (
                      <span className={cn(
                        "text-[10px] font-mono-label font-black ml-0.5",
                        isTop ? "text-white/80" : "text-muted"
                      )}>
                        {Math.round(PRIORITY_WEIGHTS[i] * 100)}%
                      </span>
                    )}
                  </span>
                );
              })}
            </div>

            <button
              onClick={() => setShowPrefs(true)}
              className="flex-shrink-0 inline-flex items-center gap-2 bg-paper-dim text-charcoal border border-line px-4 py-2 rounded-full text-sm font-semibold hover:bg-paper hover:border-charcoal/40 hover:shadow-sm transition-all"
            >
              <svg className="w-3.5 h-3.5 text-charcoal/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
              </svg>
              Edit priorities
            </button>
          </div>
        )}

        <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${col}, 1fr)` }}>
          {colleges.map((c) => {
            const isBest = bestFitId === c.id;
            const s = scores.find(x => x.id === c.id);
            const pct = s ? Math.round(s.total * 100) : null;

            return (
              <div
                key={c.id}
                className={cn(
                  "rounded-2xl p-5 flex flex-col gap-3 border-2 transition-all",
                  isBest
                    ? "border-gold-500 bg-gold-100/30 shadow-[0_4px_24px_-8px_rgba(186,138,51,0.25)]"
                    : "border-line bg-white hover:border-line/80"
                )}
              >
                <div className="flex items-start gap-2">
                  <div className="flex-1 min-w-0">
                    {isBest && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-mono-label font-black uppercase tracking-widest text-gold-700 bg-gold-100 px-2 py-0.5 rounded-full mb-2">
                        ★ Best fit
                      </span>
                    )}
                    <h2 className="font-display font-semibold text-base text-charcoal leading-snug">{c.name}</h2>
                    <p className="text-xs text-muted mt-1 flex items-center gap-1">
                      <svg className="w-3 h-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
                      {c.location}
                    </p>
                  </div>
                  {c.nirfRank && (
                    <span className="flex-shrink-0 text-[10px] font-mono-label font-black bg-paper-dim border border-line text-muted px-2 py-1 rounded-lg">
                      #{c.nirfRank}
                    </span>
                  )}
                </div>

                {pct !== null && (
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] text-muted font-mono-label uppercase tracking-widest">Match score</span>
                      <span className={cn("text-sm font-display font-black tabular", isBest ? "text-gold-600" : "text-charcoal")}>
                        {pct}%
                      </span>
                    </div>
                    <div className="h-2 rounded-full bg-paper-dim overflow-hidden">
                      <div
                        className={cn("h-full rounded-full transition-all duration-700", isBest ? "bg-gold-500" : "bg-ink-200")}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-3 gap-2 pt-1 border-t border-line">
                  <div>
                    <p className="text-[10px] text-muted">Fees / yr</p>
                    <p className="text-xs font-semibold text-charcoal tabular mt-0.5">{formatFees(c.feesMin)}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-muted">Avg pkg</p>
                    <p className="text-xs font-semibold text-teal-700 tabular mt-0.5">
                      {c.placement ? formatPackage(c.placement.avgPackage) : "—"}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] text-muted">Rating</p>
                    <p className="text-xs font-semibold text-charcoal tabular mt-0.5">{c.rating.toFixed(1)} ★</p>
                  </div>
                </div>

                <Link
                  href={`/college/${c.slug}`}
                  className={cn(
                    "text-center text-xs font-semibold py-2 rounded-xl transition-colors mt-auto",
                    isBest
                      ? "bg-gold-500 text-white hover:bg-gold-600"
                      : "bg-paper-dim text-muted hover:text-charcoal border border-line"
                  )}
                >
                  View profile →
                </Link>
              </div>
            );
          })}
        </div>

        <div className="rounded-2xl border border-line overflow-hidden">
          {ROW_GROUPS.map((group, gi) => (
            <div key={group.title} className={gi > 0 ? "border-t-2 border-line" : ""}>
              <div className="grid" style={{ gridTemplateColumns: `160px repeat(${col}, 1fr)` }}>
                <div className="bg-paper-dim px-4 py-2.5 border-r border-line flex items-center">
                  <span className="font-mono-label text-[10px] font-black uppercase tracking-[0.2em] text-charcoal">{group.title}</span>
                </div>
                {colleges.map(c => {
                  const isBest = bestFitId === c.id;
                  return (
                    <div key={c.id} className={cn("bg-paper-dim py-2.5 border-r border-line last:border-r-0 flex items-center justify-center px-2", isBest && "bg-gold-100/50")}>
                      <span className={cn("text-[10px] font-mono-label font-bold truncate", isBest ? "text-gold-700" : "text-muted")}>
                        {isBest ? "★ best fit" : c.name.split(" ").slice(0, 2).join(" ")}
                      </span>
                    </div>
                  );
                })}
              </div>
              {group.rows.map((row, ri) => (
                <div key={row.label} className="grid border-t border-line/50" style={{ gridTemplateColumns: `160px repeat(${col}, 1fr)` }}>
                  <div className="px-4 py-3 flex items-center border-r border-line">
                    <span className="text-xs text-muted">{row.label}</span>
                  </div>
                  {colleges.map(c => {
                    const isBest = bestFitId === c.id;
                    return (
                      <div key={c.id} className={cn("px-3 py-3 text-center border-r border-line/60 last:border-r-0", isBest ? "bg-gold-100/20" : ri % 2 === 1 ? "bg-paper-dim/30" : "")}>
                        <span className={cn("text-sm tabular", isBest ? "font-bold text-charcoal" : "text-charcoal/80")}>{row.key(c)}</span>
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          ))}
        </div>

        <div className="rounded-2xl border border-line overflow-hidden">
          <div className="grid border-b border-line" style={{ gridTemplateColumns: `160px repeat(${col}, 1fr)` }}>
            <div className="bg-paper-dim px-4 py-2.5 border-r border-line">
              <span className="font-mono-label text-[10px] font-black uppercase tracking-[0.2em] text-charcoal">Top recruiters</span>
            </div>
            {colleges.map(c => {
              const isBest = bestFitId === c.id;
              const rs = c.placement?.topRecruiters ? JSON.parse(c.placement.topRecruiters) as string[] : [];
              return (
                <div key={c.id} className={cn("px-3 py-3 border-r border-line last:border-r-0", isBest ? "bg-gold-100/20" : "bg-white")}>
                  <p className={cn("text-[10px] font-mono-label font-bold mb-2", isBest ? "text-gold-700" : "text-muted")}>
                    {isBest ? "★ best fit" : c.name.split(" ").slice(0,2).join(" ")}
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {rs.map(r => (
                      <span key={r} className={cn("text-[11px] px-2 py-0.5 rounded-full font-medium", isBest ? "bg-teal-100 text-teal-700" : "bg-paper-dim text-muted border border-line")}>{r}</span>
                    ))}
                    {rs.length === 0 && <span className="text-xs text-muted italic">No data</span>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {canAnalyse && !verdict && !verdictLoading && (
          <div className="flex items-center justify-between gap-4 rounded-2xl border border-line bg-white p-5">
            <div>
              <p className="font-display font-semibold text-charcoal">Want a full breakdown?</p>
              <p className="text-sm text-muted mt-0.5">Pros, cons, and a recommendation based on your priorities.</p>
            </div>
            <button
              onClick={handleGetVerdict}
              className="flex-shrink-0 inline-flex items-center gap-2 bg-charcoal text-paper text-sm font-bold px-5 py-3 rounded-xl hover:bg-ink-800 transition-all"
            >
              <span className="text-gold-400">✦</span> Get AI verdict
            </button>
          </div>
        )}
        <VerdictPanel verdict={verdict} loading={verdictLoading} onClose={() => { setVerdict(null); setVerdictLoading(false); }} />
      </div>
    </>
  );
}

export default function ComparePage() {
  return (
    <Suspense fallback={
      <div className="max-w-6xl mx-auto px-4 py-12 animate-pulse space-y-4">
        <div className="h-7 bg-paper-dim rounded w-48" />
        <div className="grid grid-cols-3 gap-4">
          {[1, 2, 3].map(i => <div key={i} className="h-44 bg-paper-dim rounded-2xl"/>)}
        </div>
      </div>
    }>
      <ComparePageContent />
    </Suspense>
  );
}