"use client";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState,useEffect } from "react";
import { useCompareStore } from "@/stores/compare.store";
import { formatFees, formatPackage, cn } from "@/lib/utils";
import SealBadge from "@/components/ui/SealBadge";
import type { College } from "@/types";

interface Props {
  college: College;
  savedIds?: string[];
  onSaveToggle?: (id: string, saved: boolean) => void;
}

const TYPE_LABEL: Record<string, string> = { PUBLIC: "Government", PRIVATE: "Private", DEEMED: "Deemed" };
const TYPE_CLASSES: Record<string, string> = {
  PUBLIC: "bg-teal-100 text-teal-700",
  PRIVATE: "bg-ink-200/60 text-ink-800",
  DEEMED: "bg-clay-100 text-clay-600",
};

export default function CollegeCard({ college, savedIds = [], onSaveToggle }: Props) {
  const { data: session } = useSession();
  const router = useRouter();
  const { addCollege, removeCollege, isInCompare } = useCompareStore();
  const [saving, setSaving] = useState(false);

  // const isSaved = savedIds.includes(college.id);
  const [localSaved, setLocalSaved] = useState(savedIds.includes(college.id));
  const inCompare = isInCompare(college.id);

  // Add this useEffect in CollegeCard after the useState:
useEffect(() => {
  setLocalSaved(savedIds.includes(college.id));
}, [savedIds, college.id]);

  async function handleSave(e: React.MouseEvent) {
    e.preventDefault();
    if (!session) { router.push("/login"); return; }
    setSaving(true);
    try {
   if (localSaved) {
  await fetch(`/api/saved/${college.id}`, { method: "DELETE" });
  setLocalSaved(false);
  onSaveToggle?.(college.id, false);
} else {
  await fetch("/api/saved", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ collegeId: college.id }),
  });
  setLocalSaved(true);
  onSaveToggle?.(college.id, true);
}
    } finally {
      setSaving(false);
    }
  }

  function handleCompare(e: React.MouseEvent) {
    e.preventDefault();
    if (inCompare) {
      removeCollege(college.id);
    } else {
      addCollege({ id: college.id, name: college.name, slug: college.slug });
    }
  }

  const recruiters = college.placement?.topRecruiters
    ? (JSON.parse(college.placement.topRecruiters) as string[]).slice(0, 3)
    : [];

  return (
    <Link href={`/college/${college.slug}`} className="group block h-full">
      <div className="relative bg-white rounded-[1.25rem] border border-line hover:border-gold-500/60 hover:shadow-[0_8px_28px_-12px_rgba(20,31,60,0.25)] transition-all duration-200 overflow-hidden h-full flex flex-col">
        {/* Header */}
        <div className="px-5 pt-5 pb-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <h3 className="font-display font-semibold text-charcoal text-lg leading-snug group-hover:text-ink-800 transition-colors line-clamp-2">{college.name}</h3>
              <p className="text-sm text-muted mt-1 flex items-center gap-1.5">
                <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                {college.location}
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {college.nirfRank && <SealBadge label={`#${college.nirfRank}`} tone="gold" size="sm" title={`NIRF Rank ${college.nirfRank}`} />}
              <button onClick={handleSave} disabled={saving} className="p-1.5 rounded-full hover:bg-paper-dim transition-colors" title={isSaved ? "Remove from saved" : "Save college"}>
                <svg className={cn("w-5 h-5 transition-colors", localSaved ? "fill-clay-600 stroke-clay-600" : "fill-none stroke-ink-400 hover:stroke-clay-600")} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" /></svg>
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2 mt-3 flex-wrap">
            <span className={cn("text-xs font-semibold px-2.5 py-1 rounded-full", TYPE_CLASSES[college.type])}>{TYPE_LABEL[college.type]}</span>
            {college.naacGrade && <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-paper-dim text-ink-800 border border-line">NAAC {college.naacGrade}</span>}
          </div>
        </div>

        {/* Stats */}
        <div className="px-5 py-4 grid grid-cols-3 gap-3 border-y border-line bg-paper/60">
          <div className="text-center">
            <div className="flex items-center justify-center gap-1">
              <svg className="w-3.5 h-3.5 text-gold-500 fill-gold-500" viewBox="0 0 24 24"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" /></svg>
              <span className="text-sm font-bold text-charcoal tabular">{college.rating.toFixed(1)}</span>
            </div>
            <p className="text-[11px] text-muted mt-0.5 font-mono-label">{college.totalRatings.toLocaleString()} reviews</p>
          </div>
          <div className="text-center border-x border-line">
            <p className="text-sm font-bold text-charcoal tabular">{formatFees(college.feesMin)}</p>
            <p className="text-[11px] text-muted mt-0.5 font-mono-label">fees / yr</p>
          </div>
          <div className="text-center">
            <p className="text-sm font-bold text-teal-700 tabular">
              {college.placement ? formatPackage(college.placement.avgPackage) : "—"}
            </p>
            <p className="text-[11px] text-muted mt-0.5 font-mono-label">avg package</p>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3.5 flex items-center justify-between mt-auto gap-2">
          <div className="flex gap-1 flex-wrap min-w-0">
            {recruiters.map((r) => (
              <span key={r} className="text-[11px] bg-paper-dim text-muted border border-line px-2 py-0.5 rounded-full truncate">{r}</span>
            ))}
          </div>
          <button
            onClick={handleCompare}
            className={cn("text-xs font-semibold px-3 py-1.5 rounded-full border transition-colors flex-shrink-0",
              inCompare
                ? "bg-ink-900 text-paper border-ink-900"
                : "border-ink-700/30 text-ink-800 hover:bg-ink-900 hover:text-paper hover:border-ink-900"
            )}
          >
            {inCompare ? "✓ Added" : "+ Compare"}
          </button>
        </div>
      </div>
    </Link>
  );
}
