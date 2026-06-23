"use client";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import CollegeCard from "@/components/college/CollegeCard";
import type { College } from "@/types";

/**
 * Wraps the card grid in a client component so the homepage (a server
 * component) can still show correct saved-heart state for the logged-in
 * user — fetched once on mount, then kept in sync as cards are toggled.
 */
export default function CollegeGrid({ colleges }: { colleges: College[] }) {
  const { status } = useSession();
  const [savedIds, setSavedIds] = useState<string[]>([]);

  useEffect(() => {
    if (status !== "authenticated") return;
    fetch("/api/saved")
      .then((r) => r.json())
      .then((d) => setSavedIds((d.colleges || []).map((c: College) => c.id)));
  }, [status]);

  function handleSaveToggle(id: string, saved: boolean) {
    setSavedIds((prev) => (saved ? [...prev, id] : prev.filter((i) => i !== id)));
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
      {colleges.map((college) => (
        <CollegeCard key={college.id} college={college} savedIds={savedIds} onSaveToggle={handleSaveToggle} />
      ))}
    </div>
  );
}
