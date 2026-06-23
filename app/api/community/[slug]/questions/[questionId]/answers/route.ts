import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createAnswer, getQuestionWithAnswers } from "@/services/community.service";
import { z } from "zod";

const schema = z.object({
  body: z.string().min(5, "Answer must be at least 5 characters").max(5000),
  authorName: z.string().min(1).max(60).optional(),
});

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ questionId: string }> }
) {
  const { questionId } = await params;
  const question = await getQuestionWithAnswers(questionId);
  if (!question) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ question });
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ slug: string; questionId: string }> }
) {
  const { questionId } = await params;
  const session = await getServerSession(authOptions);
  const body = await req.json();

  const parsed = schema.safeParse(body);
  if (!parsed.success)
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });

  const authorName = session?.user?.name || parsed.data.authorName || "Anonymous";
  const answer = await createAnswer({
    questionId,
    authorName,
    body: parsed.data.body,
    userId: session?.user?.id,
  });

  return NextResponse.json({ answer }, { status: 201 });
}
