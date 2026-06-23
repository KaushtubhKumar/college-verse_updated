import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getCommunityBySlug, createQuestion } from "@/services/community.service";
import { z } from "zod";

const schema = z.object({
  title: z.string().min(5, "Title must be at least 5 characters").max(200),
  body: z.string().min(10, "Body must be at least 10 characters").max(5000),
  authorName: z.string().min(1).max(60).optional(),
});

export async function POST(
  req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const session = await getServerSession(authOptions);
  const body = await req.json();

  const parsed = schema.safeParse(body);
  if (!parsed.success)
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });

  const community = await getCommunityBySlug(slug);
  if (!community) return NextResponse.json({ error: "Community not found" }, { status: 404 });

  const authorName = session?.user?.name || parsed.data.authorName || "Anonymous";
  const question = await createQuestion({
    communityId: community.id,
    authorName,
    title: parsed.data.title,
    body: parsed.data.body,
    userId: session?.user?.id,
  });

  return NextResponse.json({ question }, { status: 201 });
}
