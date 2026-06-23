import { prisma } from "@/lib/prisma";

export async function getCollegesForCompare(ids: string[]) {
  if (!ids.length || ids.length > 3) return [];
  const colleges = await prisma.college.findMany({
    where: { id: { in: ids } },
    include: { courses: true, placement: true },
  });
  const byId = new Map(colleges.map((c) => [c.id, c]));
  return ids.map((id) => byId.get(id)).filter((c): c is NonNullable<typeof c> => Boolean(c));
}