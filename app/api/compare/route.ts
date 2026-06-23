import { NextResponse } from "next/server";
import { getCollegesForCompare } from "@/services/compare.service";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const idsParam = searchParams.get("ids") || "";
  const ids = idsParam.split(",").filter(Boolean).slice(0, 3);
  if (!ids.length) return NextResponse.json({ error: "No IDs provided" }, { status: 400 });
  const colleges = await getCollegesForCompare(ids);
  return NextResponse.json({ colleges });
}
