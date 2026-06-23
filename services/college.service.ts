import { prisma } from "@/lib/prisma";
import { unstable_cache } from "next/cache";
import type { CollegeFilters } from "@/types";

const PAGE_SIZE = 12;

export async function getColleges(filters: CollegeFilters) {
  const { q, state, type, feesMax, sort = "rating", page = 1 } = filters;

  const where: Record<string, unknown> = {};
  if (q) {
    where.OR = [
      { name: { contains: q, mode: "insensitive" } },
      { location: { contains: q, mode: "insensitive" } },
      { state: { contains: q, mode: "insensitive" } },
    ];
  }
  if (state) where.state = { equals: state, mode: "insensitive" };
  if (type) where.type = type;
  if (feesMax) where.feesMin = { lte: feesMax };

  const orderBy: Record<string, string> = {};
  if (sort === "nirfRank") orderBy.nirfRank = "asc";
  else if (sort === "name") orderBy.name = "asc";
  else orderBy[sort] = sort === "feesMin" ? "asc" : "desc";

  const skip = (page - 1) * PAGE_SIZE;

  const [colleges, total] = await Promise.all([
    prisma.college.findMany({
      where,
      orderBy,
      skip,
      take: PAGE_SIZE,
      include: { placement: true },
    }),
    prisma.college.count({ where }),
  ]);

  return { colleges, total, page, totalPages: Math.ceil(total / PAGE_SIZE) };
}

// Cache college detail — revalidate every 5 mins, tag per slug
export function getCollegeBySlug(slug: string) {
  return unstable_cache(
    () =>
      prisma.college.findUnique({
        where: { slug },
        include: {
          courses: { orderBy: [{ level: "asc" }, { fees: "asc" }] },
          placement: true,
        },
      }),
    [`college-${slug}`],
    { revalidate: 300, tags: [`college-${slug}`] }
  )();
}

export async function getCollegeById(id: string) {
  return prisma.college.findUnique({
    where: { id },
    include: { courses: true, placement: true },
  });
}

// Cache states list — very rarely changes
export const getStates = unstable_cache(
  async (): Promise<string[]> => {
    const results = await prisma.college.findMany({
      select: { state: true },
      distinct: ["state"],
      orderBy: { state: "asc" },
    });
    return results.map((r: { state: string }) => r.state);
  },
  ["college-states"],
  { revalidate: 3600 }
);
