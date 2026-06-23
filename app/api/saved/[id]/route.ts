import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { unsaveCollege } from "@/services/saved.service";

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
 const { id: collegeId } = await params;
await unsaveCollege(session.user.id, collegeId);
  return NextResponse.json({ success: true });
}
