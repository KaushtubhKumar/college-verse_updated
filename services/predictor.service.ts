import { prisma } from "@/lib/prisma";

export type Exam = "JEE_MAIN" | "JEE_ADVANCED" | "CAT" | "NEET" | "CLAT" | "GATE";

interface PredictorInput {
  exam: Exam;
  rank: number;
  category: "GENERAL" | "OBC" | "SC" | "ST";
  preferredState?: string;
  maxFees?: number;
}

// Maps exam → NIRF field filter + rank-to-nirfRank conversion logic
// JEE Main/Advanced → Engineering
// CAT → Management
// NEET → Medical
// CLAT → Law
// GATE → Engineering (PG focus)

const EXAM_CONFIG: Record<Exam, {
  field: string;
  label: string;
  rankLabel: string;
  maxRank: number; // total candidates approx
  // percentile bracket → NIRF rank range
  brackets: { maxRank: number; nirfMin: number; nirfMax: number; label: string }[];
}> = {
  JEE_MAIN: {
    field: "Engineering",
    label: "JEE Main",
    rankLabel: "CRL Rank",
    maxRank: 1100000,
    brackets: [
      { maxRank: 1000,    nirfMin: 1,  nirfMax: 10,  label: "Top IITs" },
      { maxRank: 5000,    nirfMin: 1,  nirfMax: 25,  label: "IITs + Top NITs" },
      { maxRank: 15000,   nirfMin: 10, nirfMax: 40,  label: "NITs + Top Private" },
      { maxRank: 40000,   nirfMin: 20, nirfMax: 60,  label: "Good NITs + Private" },
      { maxRank: 100000,  nirfMin: 40, nirfMax: 80,  label: "Private + State Colleges" },
      { maxRank: 300000,  nirfMin: 60, nirfMax: 100, label: "Private Colleges" },
      { maxRank: 1100000, nirfMin: 80, nirfMax: 100, label: "Private Colleges" },
    ],
  },
  JEE_ADVANCED: {
    field: "Engineering",
    label: "JEE Advanced",
    rankLabel: "AIR",
    maxRank: 180000,
    brackets: [
      { maxRank: 500,   nirfMin: 1,  nirfMax: 5,  label: "Top 5 IITs" },
      { maxRank: 2000,  nirfMin: 1,  nirfMax: 15, label: "IITs" },
      { maxRank: 5000,  nirfMin: 5,  nirfMax: 25, label: "IITs + BITS" },
      { maxRank: 15000, nirfMin: 15, nirfMax: 50, label: "IITs + Top NITs" },
      { maxRank: 180000,nirfMin: 30, nirfMax: 70, label: "NITs + Private" },
    ],
  },
  CAT: {
    field: "Management",
    label: "CAT",
    rankLabel: "Percentile",
    maxRank: 100, // percentile, inverted
    brackets: [
      { maxRank: 1,   nirfMin: 1,  nirfMax: 5,  label: "IIM A/B/C" },
      { maxRank: 2,   nirfMin: 1,  nirfMax: 10, label: "Top IIMs" },
      { maxRank: 5,   nirfMin: 5,  nirfMax: 20, label: "IIMs + Top B-Schools" },
      { maxRank: 10,  nirfMin: 10, nirfMax: 35, label: "Good IIMs + Private" },
      { maxRank: 25,  nirfMin: 25, nirfMax: 60, label: "Private B-Schools" },
      { maxRank: 100, nirfMin: 50, nirfMax: 100,label: "Private B-Schools" },
    ],
  },
  NEET: {
    field: "Medical",
    label: "NEET",
    rankLabel: "AIR",
    maxRank: 2000000,
    brackets: [
      { maxRank: 1000,   nirfMin: 1,  nirfMax: 10, label: "AIIMS + Top Medical" },
      { maxRank: 5000,   nirfMin: 1,  nirfMax: 20, label: "Top Government Medical" },
      { maxRank: 15000,  nirfMin: 10, nirfMax: 30, label: "Government Medical Colleges" },
      { maxRank: 50000,  nirfMin: 20, nirfMax: 40, label: "Government + Private" },
      { maxRank: 200000, nirfMin: 30, nirfMax: 50, label: "Private Medical Colleges" },
      { maxRank: 2000000,nirfMin: 40, nirfMax: 50, label: "Private Medical Colleges" },
    ],
  },
  CLAT: {
    field: "Law",
    label: "CLAT",
    rankLabel: "AIR",
    maxRank: 70000,
    brackets: [
      { maxRank: 100,   nirfMin: 1,  nirfMax: 5,  label: "NLSIU, NALSAR, NLU Delhi" },
      { maxRank: 500,   nirfMin: 1,  nirfMax: 10, label: "Top NLUs" },
      { maxRank: 2000,  nirfMin: 5,  nirfMax: 20, label: "NLUs" },
      { maxRank: 5000,  nirfMin: 10, nirfMax: 30, label: "NLUs + Private" },
      { maxRank: 70000, nirfMin: 20, nirfMax: 39, label: "Private Law Schools" },
    ],
  },
  GATE: {
    field: "Engineering",
    label: "GATE",
    rankLabel: "AIR",
    maxRank: 200000,
    brackets: [
      { maxRank: 100,   nirfMin: 1,  nirfMax: 5,  label: "IISc + IITs" },
      { maxRank: 500,   nirfMin: 1,  nirfMax: 15, label: "IITs + NITs" },
      { maxRank: 2000,  nirfMin: 5,  nirfMax: 30, label: "NITs + Top Private" },
      { maxRank: 10000, nirfMin: 15, nirfMax: 60, label: "NITs + Private" },
      { maxRank: 200000,nirfMin: 40, nirfMax: 100,label: "Private + State" },
    ],
  },
};

function getBracket(exam: Exam, rank: number) {
  const config = EXAM_CONFIG[exam];
  // CAT is percentile — higher = better, so we invert: score = 100 - percentile
  const effectiveRank = exam === "CAT" ? 100 - rank : rank;
  return config.brackets.find((b) => effectiveRank <= b.maxRank) ?? config.brackets[config.brackets.length - 1];
}

// Category relaxation: SC/ST get ~2x rank relaxation, OBC ~1.5x
function adjustRankForCategory(rank: number, category: string, exam: Exam): number {
  if (exam === "CAT") return rank; // percentile, no category adjustment needed here
  const multiplier = category === "SC" || category === "ST" ? 2.5 : category === "OBC" ? 1.6 : 1;
  return Math.round(rank / multiplier);
}

export async function predictColleges(input: PredictorInput) {
  const { exam, rank, category, preferredState, maxFees } = input;
  const config = EXAM_CONFIG[exam];
  const adjustedRank = adjustRankForCategory(rank, category, exam);
  const bracket = getBracket(exam, adjustedRank);

  const where: Record<string, unknown> = {
    nirfRank: { gte: bracket.nirfMin, lte: bracket.nirfMax },
  };

  if (maxFees) where.feesMin = { lte: maxFees };

  // Fetch slightly wider set then score + sort
  const colleges = await prisma.college.findMany({
    where,
    include: { placement: true },
    orderBy: { nirfRank: "asc" },
    take: 30,
  });

  // Score each college: base score from NIRF rank, boost for state match
  const scored = colleges.map((c) => {
    let score = 100 - (c.nirfRank ?? 50);
    if (preferredState && c.state.toLowerCase() === preferredState.toLowerCase()) score += 15;
    if (c.type === "PUBLIC") score += 5; // slight public preference
    return { ...c, matchScore: score };
  });

  scored.sort((a, b) => b.matchScore - a.matchScore);

  const reach = scored.slice(0, 4);    // top colleges (stretch)
  const match = scored.slice(4, 9);    // solid matches
  const safe  = scored.slice(9, 13);   // safer options

  return {
    exam: config.label,
    rank,
    adjustedRank: category !== "GENERAL" ? adjustedRank : null,
    category,
    bracket: bracket.label,
    nirfRange: { min: bracket.nirfMin, max: bracket.nirfMax },
    results: { reach, match, safe },
    total: scored.length,
  };
}

export function getExamConfig() {
  return Object.entries(EXAM_CONFIG).map(([key, val]) => ({
    value: key,
    label: val.label,
    rankLabel: val.rankLabel,
    maxRank: val.maxRank,
    field: val.field,
  }));
}
