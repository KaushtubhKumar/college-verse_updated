"use client";
import { useEffect } from "react";
import { useSession } from "next-auth/react";
import CollegeCard from "@/components/college/CollegeCard";
import { useSavedStore } from "@/stores/saved.store";
import type { College } from "@/types";

export default function CollegeGrid({ colleges }: { colleges: College[] }) {
  const { status } = useSession();
  const { setIds, loaded } = useSavedStore();

  useEffect(() => {
    if (status !== "authenticated" || loaded) return;
    fetch("/api/saved")
      .then((r) => r.json())
      .then((d) => setIds((d.colleges || []).map((c: College) => c.id)));
  }, [status, loaded, setIds]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
      {colleges.map((college) => (
        <CollegeCard key={college.id} college={college} />
      ))}
    </div>
  );
}