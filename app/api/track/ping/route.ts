import { NextResponse, type NextRequest } from "next/server";
import { isSameOrigin, getClientIp } from "@/app/lib/request";
import { rateLimit } from "@/app/lib/rate-limit";
import { touchSession } from "@/app/server/sessions";

export const dynamic = "force-dynamic";

function device(ua: string | null): string {
  if (!ua) return "unknown";
  return /mobile|android|iphone|ipad/i.test(ua) ? "mobile" : "desktop";
}

/** Heartbeat do "online ao vivo". Dados anônimos (id de sessão + página). */
export async function POST(req: NextRequest) {
  if (!isSameOrigin(req)) return NextResponse.json({ ok: false }, { status: 403 });
  const ip = getClientIp(req.headers);
  if (!rateLimit(`ping:${ip}`, 120, 60_000)) return NextResponse.json({ ok: true });

  const body = (await req.json().catch(() => null)) as { sessionId?: string; visitorId?: string; path?: string; referrer?: string } | null;
  if (!body?.sessionId || !body.visitorId) return NextResponse.json({ ok: false }, { status: 400 });

  await touchSession(body.sessionId, body.visitorId, body.path ?? null, device(req.headers.get("user-agent")), body.referrer ?? null);
  return NextResponse.json({ ok: true });
}
