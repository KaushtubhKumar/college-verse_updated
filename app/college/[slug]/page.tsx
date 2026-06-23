import { notFound } from "next/navigation";
import { getCollegeBySlug } from "@/services/college.service";
import { formatFees, formatPackage } from "@/lib/utils";
import SealBadge from "@/components/ui/SealBadge";

interface Props { params: Promise<{ slug: string }> }

const LEVEL_LABEL: Record<string, string> = { UG: "Undergraduate", PG: "Postgraduate", PHD: "Doctorate", DIPLOMA: "Diploma" };

export default async function CollegeDetailPage({ params }: Props) {
  const { slug } = await params;
  const college = await getCollegeBySlug(slug);
  if (!college) notFound();

  const recruiters = college.placement?.topRecruiters
    ? (JSON.parse(college.placement.topRecruiters) as string[])
    : [];

  const ugCourses = college.courses.filter((c: { level: string }) => c.level === "UG");
  const pgCourses = college.courses.filter((c: { level: string }) => c.level === "PG");
  const otherCourses = college.courses.filter((c: { level: string }) => c.level !== "UG" && c.level !== "PG");

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header card */}
      <div className="bg-ink-950 rounded-[1.75rem] p-8 text-paper mb-8 relative overflow-hidden">
        <div
          className="absolute inset-0 opacity-[0.06] pointer-events-none"
          style={{ backgroundImage: "radial-gradient(circle at 85% 15%, white 0, transparent 45%)" }}
        />
        <div className="flex items-start justify-between gap-6 relative">
          <div className="flex-1">
            <div className="flex flex-wrap items-center gap-2 mb-3">
              <span className="bg-white/10 text-ink-200 text-xs font-mono-label font-semibold px-3 py-1 rounded-full">{college.type}</span>
              {college.naacGrade && <span className="bg-white/10 text-ink-200 text-xs font-mono-label font-semibold px-3 py-1 rounded-full">NAAC {college.naacGrade}</span>}
              {college.nirfRank && <SealBadge label={`#${college.nirfRank}`} tone="gold" size="sm" title={`NIRF Rank ${college.nirfRank}`} />}
            </div>
            <h1 className="font-display text-2xl sm:text-3xl font-semibold leading-tight">{college.name}</h1>
            <p className="text-ink-200 mt-2 flex items-center gap-2 text-sm">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /></svg>
              {college.location}
              {college.established && ` · Est. ${college.established}`}
            </p>
          </div>
          <div className="hidden sm:flex flex-col items-center bg-white/10 rounded-2xl px-5 py-4 text-center flex-shrink-0">
            <span className="font-display text-4xl font-semibold tabular">{college.rating.toFixed(1)}</span>
            <div className="flex gap-0.5 my-1">
              {[1,2,3,4,5].map((s) => (
                <svg key={s} className={`w-4 h-4 ${s <= Math.round(college.rating) ? "fill-gold-500" : "fill-white/20"}`} viewBox="0 0 24 24"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" /></svg>
              ))}
            </div>
            <span className="text-xs text-ink-200 font-mono-label">{college.totalRatings.toLocaleString()} reviews</span>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6 pt-6 border-t border-white/15 relative">
          {[
            { label: "Fees / year", value: formatFees(college.feesMin) },
            { label: "Max fees", value: formatFees(college.feesMax) },
            { label: "Avg package", value: college.placement ? formatPackage(college.placement.avgPackage) : "—" },
            { label: "Placement rate", value: college.placement ? `${college.placement.placementRate}%` : "—" },
          ].map(({ label, value }: { label: string; value: string }) => (
            <div key={label} className="text-center">
              <p className="text-xl font-semibold tabular">{value}</p>
              <p className="text-xs text-ink-200 mt-0.5 font-mono-label">{label}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Overview */}
          <section className="bg-white rounded-2xl border border-line p-6">
            <h2 className="font-display text-lg font-semibold text-charcoal mb-3">Overview</h2>
            <p className="text-muted leading-relaxed">{college.overview}</p>
          </section>

          {/* Courses */}
          <section className="bg-white rounded-2xl border border-line p-6">
            <h2 className="font-display text-lg font-semibold text-charcoal mb-4">Courses offered</h2>
            {[{ label: LEVEL_LABEL.UG, courses: ugCourses }, { label: LEVEL_LABEL.PG, courses: pgCourses }, { label: "Other programs", courses: otherCourses }]
              .filter(({ courses }: { label: string; courses: { id: string; name: string; duration: number; fees: number; seats: number | null; level: string }[] }) => courses.length > 0)
              .map(({ label, courses }) => (
                <div key={label} className="mb-5 last:mb-0">
                  <h3 className="text-xs font-mono-label font-semibold text-muted uppercase tracking-wider mb-3">{label}</h3>
                  <div className="divide-y divide-line border-t border-line">
                    {courses.map((c: { id: string; name: string; duration: number; fees: number; seats: number | null }) => (
                      <div key={c.id} className="flex items-center justify-between py-3">
                        <div>
                          <p className="text-sm font-medium text-charcoal">{c.name}</p>
                          <p className="text-xs text-muted mt-0.5">{c.duration} years{c.seats ? ` · ${c.seats} seats` : ""}</p>
                        </div>
                        <span className="text-sm font-semibold text-ink-800 tabular">{formatFees(c.fees)}/yr</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
          </section>
        </div>

        <div className="space-y-6">
          {/* Placements */}
          {college.placement && (
            <section className="bg-white rounded-2xl border border-line p-6">
              <h2 className="font-display text-lg font-semibold text-charcoal mb-4">Placements {college.placement.year}</h2>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted">Avg package</span>
                  <span className="text-sm font-bold text-teal-700 tabular">{formatPackage(college.placement.avgPackage)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted">Highest package</span>
                  <span className="text-sm font-bold text-teal-700 tabular">{formatPackage(college.placement.highestPackage)}</span>
                </div>
                <div>
                  <div className="flex justify-between items-center mb-1.5">
                    <span className="text-sm text-muted">Placement rate</span>
                    <span className="text-sm font-bold text-charcoal tabular">{college.placement.placementRate}%</span>
                  </div>
                  <div className="h-2 bg-paper-dim rounded-full overflow-hidden">
                    <div className="h-full bg-teal-600 rounded-full" style={{ width: `${college.placement.placementRate}%` }} />
                  </div>
                </div>
              </div>
              {recruiters.length > 0 && (
                <div className="mt-4 pt-4 border-t border-line">
                  <p className="text-xs font-mono-label font-semibold text-muted uppercase tracking-wider mb-2">Top recruiters</p>
                  <div className="flex flex-wrap gap-1.5">
                    {recruiters.map((r) => (
                      <span key={r} className="text-xs bg-teal-100 text-teal-700 px-2.5 py-1 rounded-full font-medium">{r}</span>
                    ))}
                  </div>
                </div>
              )}
            </section>
          )}

          {/* Quick info */}
          <section className="bg-white rounded-2xl border border-line p-6">
            <h2 className="font-display text-lg font-semibold text-charcoal mb-4">Quick info</h2>
            <div className="space-y-3">
              {[
                { label: "Type", value: college.type },
                { label: "State", value: college.state },
                { label: "Established", value: college.established ? String(college.established) : "—" },
                { label: "NAAC grade", value: college.naacGrade || "—" },
                { label: "NIRF rank", value: college.nirfRank ? `#${college.nirfRank}` : "—" },
                { label: "Total courses", value: String(college.courses.length) },
              ].map(({ label, value }: { label: string; value: string }) => (
                <div key={label} className="flex justify-between text-sm">
                  <span className="text-muted">{label}</span>
                  <span className="font-medium text-charcoal">{value}</span>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
