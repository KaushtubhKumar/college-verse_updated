import { notFound } from "next/navigation";
import { getCommunityBySlug, getQuestions } from "@/services/community.service";
import CommunityRoom from "./CommunityRoom";

interface Props { params: Promise<{ slug: string }> }

export default async function CommunityPage({ params }: Props) {
  const { slug } = await params;
  const community = await getCommunityBySlug(slug);
  if (!community) notFound();

  const { questions, total } = await getQuestions(community.id, 1);

  // Serialize Prisma Date objects to ISO strings for frontend type compliance
  const serializedQuestions = questions.map((q) => ({
    ...q,
    createdAt: q.createdAt.toISOString(),
  }));

  return (
    <CommunityRoom
      community={{
        ...community,
        icon: community.icon ?? "",
      }}
      initialQuestions={serializedQuestions as unknown as Parameters<typeof CommunityRoom>[0]["initialQuestions"]}
      initialTotal={total}
    />
  );
}