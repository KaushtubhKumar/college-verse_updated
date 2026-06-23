import { PrismaClient, CollegeType, CourseLevel } from "@prisma/client";
import bcrypt from "bcryptjs";
import fs from "fs";
import path from "path";

const prisma = new PrismaClient();

const NIRF_DATA = JSON.parse(
  fs.readFileSync(path.join(__dirname, "nirf_seed_data.json"), "utf-8")
) as Array<{
  name: string;
  slug: string;
  location: string;
  state: string;
  type: string;
  feesMin: number;
  feesMax: number;
  rating: number;
  totalRatings: number;
  naacGrade: string;
  nirfRank: number;
  established: number | null;
  overview: string;
  placement: {
    avgPackage: number;
    highestPackage: number;
    placementRate: number;
    topRecruiters: string[];
    year: number;
  };
  courses: { name: string; duration: number; level: string; fees: number }[];
}>;

const TYPE_MAP: Record<string, CollegeType> = {
  PUBLIC: CollegeType.PUBLIC,
  PRIVATE: CollegeType.PRIVATE,
  DEEMED: CollegeType.DEEMED,
};

const LEVEL_MAP: Record<string, CourseLevel> = {
  UG: CourseLevel.UG,
  PG: CourseLevel.PG,
  PHD: CourseLevel.PHD,
  DIPLOMA: CourseLevel.DIPLOMA,
};

const communities = [
  { slug: "cse", subject: "Computer Science & Engineering", description: "Discuss CS programs, coding interviews, placements, and college choices for CSE/IT aspirants.", icon: "💻" },
  { slug: "mba", subject: "MBA & Management", description: "CAT prep, B-school comparisons, placements, and everything about MBA admissions in India.", icon: "📊" },
  { slug: "medical", subject: "Medical & MBBS", description: "NEET guidance, medical college reviews, MBBS vs BDS, and healthcare career discussions.", icon: "🏥" },
  { slug: "mechanical", subject: "Mechanical Engineering", description: "Core companies, GATE prep, M.Tech admissions, and mechanical engineering career paths.", icon: "⚙️" },
  { slug: "law", subject: "Law & LLB", description: "CLAT prep, top NLUs, law school experiences, and legal career opportunities.", icon: "⚖️" },
  { slug: "design", subject: "Design & Architecture", description: "NID, NIFT, SPA — entrance exams, portfolio tips, and creative career guidance.", icon: "🎨" },
  { slug: "data-science", subject: "Data Science & AI", description: "ML, AI, data science courses, college programs, and breaking into the field.", icon: "🤖" },
  { slug: "civil", subject: "Civil Engineering", description: "GATE civil, government jobs, PSU placements, and infrastructure career discussions.", icon: "🏗️" },
];

const sampleQuestions: Record<string, { authorName: string; title: string; body: string; answers: { authorName: string; body: string }[] }[]> = {
  cse: [
    {
      authorName: "Arjun Sharma",
      title: "IIT Bombay CSE vs BITS Pilani CS — which for placements?",
      body: "I have IIT Bombay CSE (JEE rank 312) and BITS Pilani CS option. My goal is a product role at a top tech company. Which would you choose and why?",
      answers: [
        { authorName: "Priya K", body: "IIT Bombay hands down for top product companies. Google, Meta, Uber all recruit heavily there. The peer network alone is worth it." },
        { authorName: "Rahul M", body: "Both are excellent. IIT Bombay has a slight edge for dream companies but BITS has the PS-2 advantage — you can intern at companies of your choice in your final year which is huge." },
      ],
    },
    {
      authorName: "Sneha Patel",
      title: "Is a 9.2 CGPA from a Tier-2 NIT enough for product companies?",
      body: "Studying at NIT Jaipur, 6th semester, 9.2 CGPA. I've been grinding DSA for 8 months (450+ LeetCode). What are my realistic chances at Amazon/Microsoft?",
      answers: [
        { authorName: "Vikram B", body: "Very strong profile honestly. Amazon doesn't filter hard on college tier — the OA and system design rounds are what matter. Keep grinding and apply." },
      ],
    },
  ],
  mba: [
    {
      authorName: "Neha Gupta",
      title: "CAT 99 percentile — IIM A/B/C or ISB?",
      body: "Scored 99.2 in CAT. 5 years work experience in consulting. Should I go IIM ABC or wait for ISB's one-year MBA? Cost vs brand vs network — help me think this through.",
      answers: [
        { authorName: "Rohit S", body: "With 5 years exp ISB's one-year actually makes more sense — you lose less salary, the alumni network is incredible, and for consulting laterals it's equally respected." },
        { authorName: "Aditi R", body: "IIM A if you get it. The 2-year program gives you time to pivot industries if needed. ISB is better only if you're committed to your current track." },
      ],
    },
  ],
  "data-science": [
    {
      authorName: "Karan V",
      title: "Which colleges have the best B.Tech Data Science programs in India?",
      body: "Looking at DS/AI undergrad programs. Seen VIT, Manipal, SRM all offer it now. Are these legit or just rebranded CSE? Which NIT/IIT has the best dedicated DS program?",
      answers: [
        { authorName: "Meera J", body: "IIT Hyderabad's B.Tech in AI is genuinely differentiated — it's research-heavy and not just rebranded CSE. For private, VIT's DS program has decent placements but the curriculum is surface-level." },
      ],
    },
  ],
};

async function main() {
  console.log("🌱 Seeding database from NIRF 2024 data...");

  await prisma.answer.deleteMany();
  await prisma.question.deleteMany();
  await prisma.community.deleteMany();
  await prisma.saved.deleteMany();
  await prisma.course.deleteMany();
  await prisma.placement.deleteMany();
  await prisma.college.deleteMany();
  await prisma.user.deleteMany();

  // Demo user
  const hash = await bcrypt.hash("demo1234", 12);
  await prisma.user.create({
    data: { email: "demo@college.dev", passwordHash: hash, name: "Demo User" },
  });
  console.log("✅ Demo user: demo@college.dev / demo1234");

  // Colleges from NIRF 2024
  let count = 0;
  for (const college of NIRF_DATA) {
    await prisma.college.create({
      data: {
        name: college.name,
        slug: college.slug,
        location: college.location,
        state: college.state,
        type: TYPE_MAP[college.type] ?? CollegeType.PRIVATE,
        feesMin: college.feesMin,
        feesMax: college.feesMax,
        rating: college.rating,
        totalRatings: college.totalRatings,
        naacGrade: college.naacGrade,
        nirfRank: college.nirfRank,
        established: college.established,
        overview: college.overview,
        imageUrl: `https://api.dicebear.com/8.x/shapes/svg?seed=${college.slug}`,
        courses: {
          create: college.courses.map((c) => ({
            name: c.name,
            duration: c.duration,
            level: LEVEL_MAP[c.level] ?? CourseLevel.UG,
            fees: c.fees,
          })),
        },
        placement: {
          create: {
            avgPackage: college.placement.avgPackage,
            highestPackage: college.placement.highestPackage,
            placementRate: college.placement.placementRate,
            topRecruiters: JSON.stringify(college.placement.topRecruiters),
            year: college.placement.year,
          },
        },
      },
    });
    count++;
    if (count % 50 === 0) console.log(`  → ${count}/${NIRF_DATA.length} inserted`);
  }
  console.log(`✅ ${count} colleges seeded from NIRF 2024`);
}

async function seedCommunities() {
  await prisma.answer.deleteMany();
  await prisma.question.deleteMany();
  await prisma.community.deleteMany();

  for (const community of communities) {
    const created = await prisma.community.create({ data: community });
    const questions = sampleQuestions[community.slug] || [];
    for (const q of questions) {
      await prisma.question.create({
        data: {
          communityId: created.id,
          authorName: q.authorName,
          title: q.title,
          body: q.body,
          answers: {
            create: q.answers.map((a) => ({ authorName: a.authorName, body: a.body })),
          },
        },
      });
    }
    console.log(`  → Community: ${community.subject}`);
  }
  console.log(`✅ Seeded ${communities.length} communities`);
}

main()
  .then(() => seedCommunities())
  .catch(console.error)
  .finally(() => prisma.$disconnect());
