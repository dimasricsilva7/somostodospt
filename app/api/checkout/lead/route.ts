import { NextResponse, type NextRequest } from "next/server";
import { isSameOrigin } from "@/app/lib/request";
import { rateLimit } from "@/app/lib/rate-limit";
import { getClientIp } from "@/app/lib/request";
import { upsertLead } from "@/app/server/leads";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  if (!isSameOrigin(req)) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const ip = getClientIp(req.headers);
  if (!rateLimit(`lead:${ip}`, 40, 10 * 60_000)) return NextResponse.json({ ok: true });

  const body = (await req.json().catch(() => null)) as {
    clientKey?: string; name?: string; email?: string; phone?: string; productSlug?: string; productName?: string; size?: string; totalCents?: number;
  } | null;
  if (!body?.clientKey || !/^[A-Za-z0-9_-]{16,64}$/.test(body.clientKey)) return NextResponse.json({ error: "invalid" }, { status: 400 });
  if (!body.email && !body.phone) return NextResponse.json({ ok: true });

  await upsertLead({ ...body, clientKey: body.clientKey });
  return NextResponse.json({ ok: true });
}
