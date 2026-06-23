import { prisma } from "@/lib/prisma";

export async function getCollegesForCompare(ids: string[]) {
  if (!ids.length || ids.length > 3) return [];
  return prisma.college.findMany({
    where: { id: { in: ids } },
    include: { courses: true, placement: true },
  });
}
