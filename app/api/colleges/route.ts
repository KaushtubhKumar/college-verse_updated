import { NextResponse } from "next/server";
import { getColleges, getStates } from "@/services/college.service";
import type { CollegeFilters, SortOption } from "@/types";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const filters: CollegeFilters = {
      q: searchParams.get("q") || undefined,
      state: searchParams.get("state") || undefined,
      type: (searchParams.get("type") as CollegeFilters["type"]) || undefined,
      feesMax: searchParams.get("feesMax") ? Number(searchParams.get("feesMax")) : undefined,
      sort: (searchParams.get("sort") as SortOption) || "rating",
      page: searchParams.get("page") ? Number(searchParams.get("page")) : 1,
    };

    if (searchParams.get("meta") === "states") {
      const states = await getStates();
      return NextResponse.json({ states });
    }

    const result = await getColleges(filters);
    return NextResponse.json(result);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
