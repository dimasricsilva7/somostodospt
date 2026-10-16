import { NextResponse } from "next/server";
import { isAuthed } from "@/app/lib/auth";
import { getDashboardData } from "@/app/server/dashboard";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!(await isAuthed())) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  return NextResponse.json(await getDashboardData());
}
