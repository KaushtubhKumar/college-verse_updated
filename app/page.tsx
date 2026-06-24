import { Suspense } from "react";
import { getColleges } from "@/services/college.service";
import CollegeGrid from "@/components/college/CollegeGrid";
import CollegeFilters from "@/components/college/CollegeFilters";
import SearchBar from "@/components/college/SearchBar";
import Pagination from "@/components/college/Pagination";
import HeroSection from "@/components/layout/HeroSection";
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
      <HeroSection
        searchBar={
          <Suspense>
            <SearchBar />
          </Suspense>
        }
      />

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