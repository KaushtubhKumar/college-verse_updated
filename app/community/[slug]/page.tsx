import { notFound } from "next/navigation";
import { getCommunityBySlug, getQuestions } from "@/services/community.service";
import CommunityRoom from "./CommunityRoom";

interface Props { params: Promise<{ slug: string }> }

export default async function CommunityPage({ params }: Props) {
  const { slug } = await params;
  const community = await getCommunityBySlug(slug);
  if (!community) notFound();

  const { questions, total } = await getQuestions(community.id, 1);

  return (
    <CommunityRoom
      community={community}
      initialQuestions={questions as Parameters<typeof CommunityRoom>[0]["initialQuestions"]}
      initialTotal={total}
    />
  );
}
