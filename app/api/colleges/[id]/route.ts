import { NextResponse } from "next/server";
import { getCollegeById } from "@/services/college.service";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const college = await getCollegeById(id);
  if (!college) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(college);
}
