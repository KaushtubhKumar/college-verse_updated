import { prisma } from "@/lib/prisma";

export async function getSavedColleges(userId: string) {
  const saved = await prisma.saved.findMany({
    where: { userId },
    include: { college: { include: { placement: true } } },
    orderBy: { savedAt: "desc" },
  });
  return saved.map((s: { college: Record<string, unknown>; id: string }) => ({ ...s.college, savedId: s.id }));
}

export async function saveCollege(userId: string, collegeId: string) {
  return prisma.saved.create({ data: { userId, collegeId } });
}

export async function unsaveCollege(userId: string, savedId: string) {
  return prisma.saved.deleteMany({ where: { id: savedId, userId } });
}

export async function getSavedIds(userId: string): Promise<string[]> {
  const saved = await prisma.saved.findMany({
    where: { userId },
    select: { collegeId: true },
  });
  return saved.map((s: { collegeId: string }) => s.collegeId);
}

export async function isSaved(userId: string, collegeId: string): Promise<boolean> {
  const count = await prisma.saved.count({ where: { userId, collegeId } });
  return count > 0;
}
