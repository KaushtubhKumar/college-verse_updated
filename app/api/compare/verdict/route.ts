import { NextResponse } from "next/server";

interface CollegePayload {
  id: string;
  name: string;
  location: string;
  type: string;
  feesMin: number;
  feesMax: number;
  rating: number;
  naacGrade: string | null;
  nirfRank: number | null;
  avgPackage: number | null;
  highestPackage: number | null;
  placementRate: number | null;
  topRecruiters: string[];
}

interface Priority {
  factor: string;
  weight: number;
  rank: number;
}

interface ScoreEntry {
  collegeName: string;
  score: number;
}

export async function POST(req: Request) {
  try {
    const { colleges, priorities, scores } = (await req.json()) as {
      colleges: CollegePayload[];
      priorities: Priority[];
      scores: ScoreEntry[];
    };

    if (!colleges?.length || !priorities?.length) {
      return NextResponse.json({ error: "Missing data" }, { status: 400 });
    }

    const priorityList = priorities
      .map((p) => `  ${p.rank}. ${p.factor} (weight: ${Math.round(p.weight * 100)}%)`)
      .join("\n");

    const collegeDetails = colleges
      .map((c) => {
        const score = scores.find((s) => s.collegeName === c.name);
        return `
### ${c.name}
- Location: ${c.location} | Type: ${c.type}
- NIRF Rank: ${c.nirfRank ?? "N/A"} | NAAC: ${c.naacGrade ?? "N/A"} | Rating: ${c.rating}/5
- Fees: ₹${(c.feesMin / 100000).toFixed(1)}L – ₹${(c.feesMax / 100000).toFixed(1)}L per year
- Avg Package: ${c.avgPackage ? `₹${(c.avgPackage / 100000).toFixed(1)}L` : "N/A"}
- Highest Package: ${c.highestPackage ? `₹${(c.highestPackage / 100000).toFixed(1)}L` : "N/A"}
- Placement Rate: ${c.placementRate ?? "N/A"}%
- ROI: ${c.avgPackage && c.feesMax ? (c.avgPackage / c.feesMax).toFixed(2) + "x" : "N/A"}
- Top Recruiters: ${c.topRecruiters.slice(0, 4).join(", ") || "N/A"}
- Weighted score: ${score ? Math.round(score.score * 100) + "%" : "N/A"}`;
      })
      .join("\n");

    const prompt = `You are a college admissions advisor helping a student choose between colleges based on their stated priorities.

## Student priorities (ranked by importance):
${priorityList}

## Colleges being compared:
${collegeDetails}

Based on the student's priority ranking and the college data above, provide a structured recommendation. Return ONLY valid JSON in this exact format with no markdown, no backticks, no preamble:

{
  "winner": "<college id or name>",
  "winnerName": "<full college name>",
  "summary": "<2-3 sentence overall recommendation explaining why the winner fits this student's priorities best>",
  "breakdown": [
    {
      "collegeName": "<name>",
      "pros": ["<strength 1 relevant to priorities>", "<strength 2>", "<strength 3>"],
      "cons": ["<weakness 1 relevant to priorities>", "<weakness 2>"]
    }
  ],
  "finalTake": "<1-2 sentence punchy closing advice specific to this student's priority order>"
}

Be specific, data-driven, and reference actual numbers from the college data. Keep each pro/con under 10 words.`;

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 1000,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("Anthropic API error:", data);
      return NextResponse.json({ error: "AI verdict failed" }, { status: 500 });
    }

    const rawText = data.content
      .map((block: { type: string; text?: string }) => (block.type === "text" ? block.text : ""))
      .join("")
      .trim();

    // Strip any accidental markdown fences
    const cleaned = rawText.replace(/^```json\s*/i, "").replace(/```\s*$/i, "").trim();
    const verdict = JSON.parse(cleaned);

    return NextResponse.json({ verdict });
  } catch (e) {
    console.error("Verdict route error:", e);
    return NextResponse.json({ error: "Failed to generate verdict" }, { status: 500 });
  }
}
