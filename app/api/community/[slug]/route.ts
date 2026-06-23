import { NextResponse } from "next/server";
import { getCommunityBySlug, getQuestions } from "@/services/community.service";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const { searchParams } = new URL(req.url);
  const page = Number(searchParams.get("page") || 1);

  const community = await getCommunityBySlug(slug);
  if (!community) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { questions, total, totalPages } = await getQuestions(community.id, page);
  return NextResponse.json({ community, questions, total, totalPages });
}
