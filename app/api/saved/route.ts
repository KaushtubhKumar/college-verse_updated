import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getSavedColleges, saveCollege } from "@/services/saved.service";
import { z } from "zod";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const colleges = await getSavedColleges(session.user.id);
  return NextResponse.json({ colleges });
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();
  const parsed = z.object({ collegeId: z.string() }).safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  try {
    const saved = await saveCollege(session.user.id, parsed.data.collegeId);
    return NextResponse.json(saved, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Already saved" }, { status: 409 });
  }
}
