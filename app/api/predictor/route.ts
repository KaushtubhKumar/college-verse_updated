import { NextResponse } from "next/server";
import { predictColleges, getExamConfig, type Exam } from "@/services/predictor.service";
import { z } from "zod";

const schema = z.object({
  exam: z.enum(["JEE_MAIN", "JEE_ADVANCED", "CAT", "NEET", "CLAT", "GATE"]),
  rank: z.number().positive(),
  category: z.enum(["GENERAL", "OBC", "SC", "ST"]).default("GENERAL"),
  preferredState: z.string().optional(),
  maxFees: z.number().positive().optional(),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success)
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });

    const result = await predictColleges(parsed.data as Parameters<typeof predictColleges>[0]);
    return NextResponse.json(result);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ exams: getExamConfig() });
}
