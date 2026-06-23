"use client";
import { useState } from "react";
import Link from "next/link";
import { formatFees, formatPackage } from "@/lib/utils";

type Exam = "JEE_MAIN" | "JEE_ADVANCED" | "CAT" | "NEET" | "CLAT" | "GATE";
type Category = "GENERAL" | "OBC" | "SC" | "ST";

const EXAMS: { value: Exam; label: string; rankLabel: string; placeholder: string; hint: string }[] = [
  { value: "JEE_MAIN",     label: "JEE Main",     rankLabel: "CRL Rank",   placeholder: "e.g. 15000",   hint: "Enter your Common Rank List rank" },
  { value: "JEE_ADVANCED", label: "JEE Advanced", rankLabel: "AIR",        placeholder: "e.g. 2500",    hint: "Enter your All India Rank" },
  { value: "CAT",          label: "CAT",           rankLabel: "Percentile", placeholder: "e.g. 95.5",    hint: "Enter your percentile score (0–100)" },
  { value: "NEET",         label: "NEET",          rankLabel: "AIR",        placeholder: "e.g. 8000",    hint: "Enter your All India Rank" },
  { value: "CLAT",         label: "CLAT",          rankLabel: "AIR",        placeholder: "e.g. 500",     hint: "Enter your All India Rank" },
  { value: "GATE",         label: "GATE",          rankLabel: "AIR",        placeholder: "e.g. 1200",    hint: "Enter your All India Rank" },
];

const STATES = [
  "Andhra Pradesh","Bihar","Delhi","Gujarat","Haryana","Karnataka","Kerala",
  "Madhya Pradesh","Maharashtra","Odisha","Punjab","Rajasthan","Tamil Nadu",
  "Telangana","Uttar Pradesh","West Bengal",
];

const FEES_OPTIONS = [
  { label: "Any fees", value: "" },
  { label: "Under ₹1L/yr", value: "100000" },
  { label: "Under ₹2L/yr", value: "200000" },
  { label: "Under ₹4L/yr", value: "400000" },
  { label: "Under ₹6L/yr", value: "600000" },
];

const BUCKET_CONFIG = {
  reach: { label: "Reach", color: "text-rose-700", bg: "bg-rose-50", border: "border-rose-200", dot: "bg-rose-500", desc: "Competitive — apply with a strong application" },
  match: { label: "Good Match", color: "text-indigo-700", bg: "bg-indigo-50", border: "border-indigo-200", dot: "bg-indigo-500", desc: "Well within your range" },
  safe:  { label: "Safe",  color: "text-green-700",  bg: "bg-green-50",  border: "border-green-200",  dot: "bg-green-500",  desc: "High chance of admission" },
};

const TYPE_BADGE: Record<string, string> = {
  PUBLIC:  "bg-green-100 text-green-800",
  PRIVATE: "bg-purple-100 text-purple-800",
  DEEMED:  "bg-amber-100 text-amber-800",
};

interface College {
  id: string; name: string; slug: string; location: string; state: string;
  type: string; feesMin: number; feesMax: number; rating: number;
  nirfRank: number | null; naacGrade: string | null; matchScore: number;
  placement?: { avgPackage: number; placementRate: number } | null;
}

interface PredictorResult {
  exam: string; rank: number; adjustedRank: number | null;
  category: string; bracket: string;
  nirfRange: { min: number; max: number };
  results: { reach: College[]; match: College[]; safe: College[] };
  total: number;
}

export default function PredictorPage() {
  const [exam, setExam] = useState<Exam>("JEE_MAIN");
  const [rank, setRank] = useState("");
  const [category, setCategory] = useState<Category>("GENERAL");
  const [preferredState, setPreferredState] = useState("");
  const [maxFees, setMaxFees] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<PredictorResult | null>(null);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState<"reach" | "match" | "safe">("match");

  const examMeta = EXAMS.find((e) => e.value === exam)!;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!rank) return;
    setLoading(true);
    setError("");
    setResult(null);

    try {
      const res = await fetch("/api/predictor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          exam,
          rank: Number(rank),
          category,
          preferredState: preferredState || undefined,
          maxFees: maxFees ? Number(maxFees) : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Something went wrong"); return; }
      setResult(data);
      setActiveTab(data.results.match.length > 0 ? "match" : "reach");
    } catch {
      setError("Failed to get predictions");
    } finally {
      setLoading(false);
    }
  }

  const activeColleges = result?.results[activeTab] ?? [];

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">College Predictor</h1>
        <p className="text-gray-500 mt-2">Enter your exam and rank to discover colleges you can get into.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Form */}
        <div className="lg:col-span-2">
          <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-gray-200 p-6 space-y-5 sticky top-20">

            {/* Exam selector */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Exam</label>
              <div className="grid grid-cols-2 gap-2">
                {EXAMS.map((ex) => (
                  <button
                    key={ex.value}
                    type="button"
                    onClick={() => { setExam(ex.value); setRank(""); setResult(null); }}
                    className={`py-2 px-3 rounded-xl text-sm font-medium border transition-all ${
                      exam === ex.value
                        ? "bg-indigo-700 text-white border-indigo-700"
                        : "border-gray-200 text-gray-700 hover:border-indigo-300 hover:bg-indigo-50"
                    }`}
                  >
                    {ex.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Rank input */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                {examMeta.rankLabel} <span className="text-red-400">*</span>
              </label>
              <input
                type="number"
                required
                value={rank}
                onChange={(e) => setRank(e.target.value)}
                placeholder={examMeta.placeholder}
                min={1}
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-400"
              />
              <p className="text-xs text-gray-400 mt-1">{examMeta.hint}</p>
            </div>

            {/* Category */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
              <div className="grid grid-cols-4 gap-1.5">
                {(["GENERAL", "OBC", "SC", "ST"] as Category[]).map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setCategory(cat)}
                    className={`py-2 rounded-xl text-xs font-semibold border transition-all ${
                      category === cat
                        ? "bg-indigo-700 text-white border-indigo-700"
                        : "border-gray-200 text-gray-600 hover:border-indigo-300"
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
              {category !== "GENERAL" && (
                <p className="text-xs text-indigo-600 mt-1.5">✓ Reservation relaxation applied</p>
              )}
            </div>

            {/* State preference */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Preferred State <span className="text-gray-400 font-normal">(optional)</span></label>
              <select
                value={preferredState}
                onChange={(e) => setPreferredState(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-400"
              >
                <option value="">Any state</option>
                {STATES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>

            {/* Max fees */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Budget <span className="text-gray-400 font-normal">(optional)</span></label>
              <select
                value={maxFees}
                onChange={(e) => setMaxFees(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-400"
              >
                {FEES_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>

            <button
              type="submit"
              disabled={loading || !rank}
              className="w-full bg-indigo-700 hover:bg-indigo-800 text-white font-semibold py-3 rounded-xl transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
                  Predicting...
                </>
              ) : "🔮 Predict Colleges"}
            </button>

            {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-2.5">{error}</p>}
          </form>
        </div>

        {/* Results */}
        <div className="lg:col-span-3">
          {!result && !loading && (
            <div className="flex flex-col items-center justify-center h-80 text-center bg-white rounded-2xl border border-dashed border-gray-300">
              <span className="text-5xl mb-4">🎯</span>
              <p className="text-lg font-semibold text-gray-700">Enter your details to predict colleges</p>
              <p className="text-sm text-gray-400 mt-1">We'll show reach, match, and safe options</p>
            </div>
          )}

          {loading && (
            <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-4 animate-pulse">
              <div className="h-6 bg-gray-200 rounded w-48" />
              <div className="h-4 bg-gray-100 rounded w-64" />
              <div className="flex gap-2 mt-4">
                {[1,2,3].map(i => <div key={i} className="h-9 bg-gray-200 rounded-xl flex-1" />)}
              </div>
              {[1,2,3,4].map(i => <div key={i} className="h-28 bg-gray-100 rounded-2xl" />)}
            </div>
          )}

          {result && (
            <div className="space-y-4">
              {/* Summary banner */}
              <div className="bg-gradient-to-br from-indigo-700 to-blue-600 text-white rounded-2xl p-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-blue-200 text-sm mb-1">{result.exam} · {result.category}</p>
                    <p className="text-2xl font-bold">
                      {result.exam === "CAT" ? `${result.rank} percentile` : `Rank ${result.rank.toLocaleString()}`}
                    </p>
                    {result.adjustedRank && (
                      <p className="text-blue-200 text-xs mt-1">Effective rank after reservation: {result.adjustedRank.toLocaleString()}</p>
                    )}
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-2xl font-bold">{result.total}</p>
                    <p className="text-blue-200 text-xs">colleges found</p>
                  </div>
                </div>
                <div className="mt-4 pt-4 border-t border-white/20">
                  <p className="text-xs text-blue-200 mb-1">Predicted NIRF range</p>
                  <p className="text-sm font-semibold">Rank #{result.nirfRange.min} – #{result.nirfRange.max} · {result.bracket}</p>
                </div>
              </div>

              {/* Tabs */}
              <div className="flex gap-2">
                {(["reach", "match", "safe"] as const).map((tab) => {
                  const cfg = BUCKET_CONFIG[tab];
                  const count = result.results[tab].length;
                  return (
                    <button
                      key={tab}
                      onClick={() => setActiveTab(tab)}
                      className={`flex-1 py-2.5 px-3 rounded-xl text-sm font-semibold border transition-all ${
                        activeTab === tab
                          ? `${cfg.bg} ${cfg.color} ${cfg.border}`
                          : "bg-white border-gray-200 text-gray-600 hover:border-gray-300"
                      }`}
                    >
                      {cfg.label}
                      <span className={`ml-1.5 text-xs px-1.5 py-0.5 rounded-full ${activeTab === tab ? cfg.bg : "bg-gray-100"}`}>
                        {count}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Bucket description */}
              <p className="text-xs text-gray-500 px-1">{BUCKET_CONFIG[activeTab].desc}</p>

              {/* College cards */}
              {activeColleges.length === 0 ? (
                <div className="text-center py-12 bg-white rounded-2xl border border-dashed border-gray-300">
                  <p className="text-gray-500 text-sm">No colleges in this category for your profile</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {activeColleges.map((college, i) => {
                    const cfg = BUCKET_CONFIG[activeTab];
                    return (
                      <Link key={college.id} href={`/college/${college.slug}`} className="group block">
                        <div className="bg-white rounded-2xl border border-gray-200 hover:border-indigo-300 hover:shadow-sm transition-all p-5">
                          <div className="flex items-start gap-4">
                            {/* Rank badge */}
                            <div className={`flex-shrink-0 w-10 h-10 rounded-xl ${cfg.bg} ${cfg.border} border flex items-center justify-center`}>
                              <span className={`text-sm font-bold ${cfg.color}`}>{i + 1}</span>
                            </div>

                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                  <h3 className="font-semibold text-gray-900 text-sm group-hover:text-indigo-700 transition-colors leading-snug">{college.name}</h3>
                                  <p className="text-xs text-gray-500 mt-0.5 flex items-center gap-1">
                                    <svg className="w-3 h-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/></svg>
                                    {college.location}
                                  </p>
                                </div>
                                {college.nirfRank && (
                                  <span className="flex-shrink-0 text-xs font-semibold bg-gray-100 text-gray-600 px-2.5 py-1 rounded-full">
                                    NIRF #{college.nirfRank}
                                  </span>
                                )}
                              </div>

                              <div className="flex flex-wrap items-center gap-2 mt-3">
                                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${TYPE_BADGE[college.type]}`}>{college.type}</span>
                                {college.naacGrade && (
                                  <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-blue-50 text-blue-700">NAAC {college.naacGrade}</span>
                                )}
                                <span className="text-xs text-gray-500 flex items-center gap-1">
                                  <svg className="w-3 h-3 text-amber-400 fill-amber-400" viewBox="0 0 24 24"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
                                  {college.rating.toFixed(1)}
                                </span>
                              </div>

                              <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-gray-100">
                                <div>
                                  <p className="text-xs text-gray-400">Min Fees</p>
                                  <p className="text-xs font-semibold text-gray-800">{formatFees(college.feesMin)}/yr</p>
                                </div>
                                <div>
                                  <p className="text-xs text-gray-400">Avg Pkg</p>
                                  <p className="text-xs font-semibold text-green-700">
                                    {college.placement ? formatPackage(college.placement.avgPackage) : "—"}
                                  </p>
                                </div>
                                <div>
                                  <p className="text-xs text-gray-400">Placement</p>
                                  <p className="text-xs font-semibold text-gray-800">
                                    {college.placement ? `${college.placement.placementRate}%` : "—"}
                                  </p>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              )}

              <p className="text-xs text-gray-400 text-center px-4 pt-2">
                Predictions are based on NIRF 2024 rankings and historical cutoff patterns. Actual cutoffs vary by year, branch, and college policy.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
