import { NextResponse, type NextRequest } from "next/server";
import { clearAdminCookie } from "@/app/lib/auth";
import { isSameOrigin } from "@/app/lib/request";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  if (!isSameOrigin(req)) return NextResponse.json({ error: "Origem inválida." }, { status: 403 });
  await clearAdminCookie();
  return NextResponse.json({ ok: true });
}
