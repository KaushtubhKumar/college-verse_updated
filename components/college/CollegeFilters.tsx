"use client";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useTransition } from "react";

const STATES = [
  "Andhra Pradesh","Bihar","Delhi","Gujarat","Haryana","Karnataka","Kerala",
  "Madhya Pradesh","Maharashtra","Odisha","Punjab","Rajasthan","Tamil Nadu",
  "Telangana","Uttar Pradesh","West Bengal",
];

const SORT_OPTIONS = [
  { value: "rating", label: "Top Rated" },
  { value: "nirfRank", label: "NIRF Rank" },
  { value: "feesMin", label: "Fees: Low to High" },
  { value: "feesMax", label: "Fees: High to Low" },
  { value: "name", label: "Name A–Z" },
];

const FEES_OPTIONS = [
  { value: "", label: "Any fees" },
  { value: "50000", label: "Under ₹50K" },
  { value: "100000", label: "Under ₹1L" },
  { value: "200000", label: "Under ₹2L" },
  { value: "400000", label: "Under ₹4L" },
  { value: "600000", label: "Under ₹6L" },
];

const SELECT_CLASS = "text-sm border border-line rounded-full pl-3.5 pr-8 py-2 bg-white text-charcoal focus:outline-none focus:ring-2 focus:ring-gold-500 cursor-pointer appearance-none bg-[url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%2212%22 height=%2212%22 viewBox=%220 0 24 24%22 fill=%22none%22 stroke=%22%236E6C65%22 stroke-width=%222%22><path d=%22M6 9l6 6 6-6%22/></svg>')] bg-no-repeat bg-[right_0.7rem_center]";

export default function CollegeFilters() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const updateParam = useCallback((key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value);
    else params.delete(key);
    params.delete("page");
    startTransition(() => {
      router.push(`/?${params.toString()}`);
    });
  }, [router, searchParams]);

  const clearAll = () => {
    startTransition(() => router.push("/"));
  };

  const hasFilters = searchParams.get("state") || searchParams.get("type") || searchParams.get("feesMax");

  return (
    <div className={`flex flex-wrap gap-2.5 items-center ${isPending ? "opacity-60 pointer-events-none" : ""}`}>
      <select value={searchParams.get("type") || ""} onChange={(e) => updateParam("type", e.target.value)} className={SELECT_CLASS}>
        <option value="">All types</option>
        <option value="PUBLIC">Government</option>
        <option value="PRIVATE">Private</option>
        <option value="DEEMED">Deemed</option>
      </select>

      <select value={searchParams.get("state") || ""} onChange={(e) => updateParam("state", e.target.value)} className={SELECT_CLASS}>
        <option value="">All states</option>
        {STATES.map((s) => <option key={s} value={s}>{s}</option>)}
      </select>

      <select value={searchParams.get("feesMax") || ""} onChange={(e) => updateParam("feesMax", e.target.value)} className={SELECT_CLASS}>
        {FEES_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>

      <select value={searchParams.get("sort") || "rating"} onChange={(e) => updateParam("sort", e.target.value)} className={SELECT_CLASS}>
        {SORT_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>

      {hasFilters && (
        <button onClick={clearAll} className="text-sm text-muted hover:text-clay-600 px-3 py-2 rounded-full hover:bg-clay-100 transition-colors">
          Clear filters
        </button>
      )}
    </div>
  );
}
