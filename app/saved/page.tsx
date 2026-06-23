"use client";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import CollegeCard from "@/components/college/CollegeCard";
import type { College } from "@/types";

export default function SavedPage() {
  const { data: session, status } = useSession();
  const [colleges, setColleges] = useState<College[]>([]);
  const [loading, setLoading] = useState(true);
  const [savedIds, setSavedIds] = useState<string[]>([]);

  useEffect(() => {
    if (status !== "authenticated") return;
    fetch("/api/saved")
      .then((r) => r.json())
      .then((d) => {
        setColleges(d.colleges || []);
        setSavedIds((d.colleges || []).map((c: College) => c.id));
      })
      .finally(() => setLoading(false));
  }, [status]);

  function handleSaveToggle(id: string, saved: boolean) {
    if (!saved) {
      setColleges((prev) => prev.filter((c) => c.id !== id));
      setSavedIds((prev) => prev.filter((i) => i !== id));
    }
  }

  if (status === "loading" || loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-paper-dim rounded w-40" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {[1,2,3].map(i => <div key={i} className="h-64 bg-paper-dim rounded-2xl" />)}
          </div>
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="max-w-md mx-auto px-4 py-24 text-center">
        <div className="w-16 h-16 rounded-full bg-ink-950 mx-auto mb-5 flex items-center justify-center">
          <svg className="w-7 h-7 text-gold-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 10-8 0v4h8z" /></svg>
        </div>
        <h1 className="font-display text-2xl font-semibold text-charcoal mb-3">Sign in to view saved colleges</h1>
        <Link href="/login" className="bg-ink-900 text-paper px-6 py-3 rounded-full font-medium hover:bg-ink-800 transition-colors">Sign in</Link>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold text-charcoal">Saved colleges</h1>
          <p className="text-muted text-sm mt-1">{colleges.length} college{colleges.length !== 1 ? "s" : ""} saved</p>
        </div>
        <Link href="/" className="text-sm text-ink-800 hover:text-gold-600 font-medium">Browse more →</Link>
      </div>

      {colleges.length === 0 ? (
        <div className="text-center py-20">
          <h2 className="font-display text-xl font-semibold text-charcoal mb-2">No saved colleges yet</h2>
          <p className="text-muted mb-6">Tap the heart on any college card to save it here</p>
          <Link href="/" className="bg-ink-900 text-paper px-6 py-3 rounded-full font-medium hover:bg-ink-800 transition-colors">Browse colleges</Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {colleges.map((college) => (
            <CollegeCard key={college.id} college={college} savedIds={savedIds} onSaveToggle={handleSaveToggle} />
          ))}
        </div>
      )}
    </div>
  );
}
