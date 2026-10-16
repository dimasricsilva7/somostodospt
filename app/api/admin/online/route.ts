import { NextResponse } from "next/server";
import { isAuthed } from "@/app/lib/auth";
import { onlineNow } from "@/app/server/sessions";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!(await isAuthed())) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const data = await onlineNow();
  return NextResponse.json(data);
}
