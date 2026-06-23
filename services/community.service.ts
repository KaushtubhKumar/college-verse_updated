import { prisma } from "@/lib/prisma";
import { unstable_cache } from "next/cache";

export const getCommunities = unstable_cache(
  async () => {
    const communities = await prisma.community.findMany({
      orderBy: { subject: "asc" },
      include: { _count: { select: { questions: true } } },
    });
    return communities;
  },
  ["communities-list"],
  { revalidate: 300 }
);

export async function getCommunityBySlug(slug: string) {
  return prisma.community.findUnique({
    where: { slug },
  });
}

export async function getQuestions(communityId: string, page = 1) {
  const PAGE_SIZE = 20;
  const [questions, total] = await Promise.all([
    prisma.question.findMany({
      where: { communityId },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: {
        _count: { select: { answers: true } },
      },
    }),
    prisma.question.count({ where: { communityId } }),
  ]);
  return { questions, total, totalPages: Math.ceil(total / PAGE_SIZE) };
}

export async function getQuestionWithAnswers(questionId: string) {
  return prisma.question.findUnique({
    where: { id: questionId },
    include: {
      answers: { orderBy: { createdAt: "asc" } },
      community: true,
    },
  });
}

export async function createQuestion(data: {
  communityId: string;
  authorName: string;
  title: string;
  body: string;
  userId?: string;
}) {
  return prisma.question.create({
    data,
    include: { _count: { select: { answers: true } } },
  });
}

export async function createAnswer(data: {
  questionId: string;
  authorName: string;
  body: string;
  userId?: string;
}) {
  return prisma.answer.create({ data });
}
