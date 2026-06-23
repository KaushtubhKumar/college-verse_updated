"use client";
import { useRouter, useSearchParams } from "next/navigation";
import { useRef, useTransition } from "react";

export default function SearchBar() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const inputRef = useRef<HTMLInputElement>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const q = inputRef.current?.value.trim() || "";
    const params = new URLSearchParams(searchParams.toString());
    if (q) params.set("q", q);
    else params.delete("q");
    params.delete("page");
    startTransition(() => router.push(`/?${params.toString()}`));
  }

  return (
    <form onSubmit={handleSubmit} className="relative w-full max-w-2xl">
      <svg className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-ink-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
      </svg>
      <input
        ref={inputRef}
        defaultValue={searchParams.get("q") || ""}
        placeholder="Search colleges by name, city, state…"
        className="w-full pl-13 pr-32 py-4 rounded-full border border-line bg-paper text-charcoal placeholder-muted focus:outline-none focus:ring-2 focus:ring-gold-500 focus:border-transparent text-base shadow-[0_12px_30px_-14px_rgba(12,18,38,0.35)]"
      />
      <button
        type="submit"
        disabled={isPending}
        className="absolute right-2 top-1/2 -translate-y-1/2 bg-ink-900 hover:bg-ink-800 text-paper text-sm font-semibold px-5 py-2.5 rounded-full transition-colors disabled:opacity-50"
      >
        {isPending ? "…" : "Search"}
      </button>
    </form>
  );
}
