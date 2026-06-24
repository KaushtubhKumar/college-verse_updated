"use client";
import CollegeCard from "@/components/college/CollegeCard";
import type { College } from "@/types";

// Navbar already fetches /api/saved and seeds the store on auth.
// CollegeGrid must NOT fetch independently — a second setIds call
// would race against the first and wipe any pending heart toggles.
export default function CollegeGrid({ colleges }: { colleges: College[] }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
      {colleges.map((college) => (
        <CollegeCard key={college.id} college={college} />
      ))}
    </div>
  );
}