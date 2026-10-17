import { NextResponse, type NextRequest } from "next/server";
import { isAuthed } from "@/app/lib/auth";
import { getDashboardData } from "@/app/server/dashboard";
import type { DashboardPeriod } from "@/app/types/admin";

export const dynamic = "force-dynamic";

const VALID: DashboardPeriod[] = ["today", "yesterday", "7d", "30d", "all"];

export async function GET(req: NextRequest) {
  if (!(await isAuthed())) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const p = req.nextUrl.searchParams.get("period") as DashboardPeriod | null;
  const period = p && VALID.includes(p) ? p : "today";
  return NextResponse.json(await getDashboardData(period));
}
