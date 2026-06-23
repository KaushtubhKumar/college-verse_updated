import { Suspense } from "react";
import { getColleges } from "@/services/college.service";
import CollegeGrid from "@/components/college/CollegeGrid";
import CollegeFilters from "@/components/college/CollegeFilters";
import SearchBar from "@/components/college/SearchBar";
import Pagination from "@/components/college/Pagination";
import type { CollegeFilters as Filters, SortOption } from "@/types";

interface PageProps {
  searchParams: Promise<{ q?: string; state?: string; type?: string; feesMax?: string; sort?: string; page?: string }>;
}

export default async function HomePage({ searchParams }: PageProps) {
  const sp = await searchParams;
  const filters: Filters = {
    q: sp.q,
    state: sp.state,
    type: sp.type as Filters["type"],
    feesMax: sp.feesMax ? Number(sp.feesMax) : undefined,
    sort: (sp.sort as SortOption) || "rating",
    page: sp.page ? Number(sp.page) : 1,
  };

  const { colleges, total, totalPages, page } = await getColleges(filters);

  return (
    <div className="pb-24">
      {/* Hero */}
      <div className="bg-ink-950 relative overflow-hidden">
        <div
          className="absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage:
              "radial-gradient(circle at 18% 20%, white 0, transparent 45%), radial-gradient(circle at 85% 75%, white 0, transparent 40%)",
          }}
        />
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-14 text-center relative">
          <p className="font-mono-label text-[11px] tracking-[0.2em] uppercase text-gold-500 mb-4">Admissions, decoded</p>
          <h1 className="font-display text-4xl sm:text-5xl font-semibold text-paper leading-[1.1]">
            Find your <span className="text-gold-500 italic">perfect</span> college
          </h1>
          <p className="text-ink-200 text-lg mt-4 mb-8">Compare fees, ranks, and placements across 25+ institutes in India</p>
          <div className="flex justify-center">
            <Suspense>
              <SearchBar />
            </Suspense>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
        {/* Filters + count */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <Suspense>
            <CollegeFilters />
          </Suspense>
          <p className="text-sm text-muted font-mono-label flex-shrink-0">
            {total} college{total !== 1 ? "s" : ""} found
          </p>
        </div>

        {/* Grid */}
        {colleges.length === 0 ? (
          <div className="text-center py-20">
            <p className="font-display text-2xl text-charcoal mb-2">No colleges match yet</p>
            <p className="text-muted">Try widening your filters or searching a different term</p>
          </div>
        ) : (
          <CollegeGrid colleges={colleges as import("@/types").College[]} />
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <Suspense>
            <Pagination page={page} totalPages={totalPages} />
          </Suspense>
        )}
      </div>
    </div>
  );
}
