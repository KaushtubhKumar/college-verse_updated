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
  const { comparisons, remove } = use