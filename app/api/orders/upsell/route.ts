import { NextResponse, type NextRequest } from "next/server";
import { isSameOrigin, getClientIp } from "@/app/lib/request";
import { rateLimit } from "@/app/lib/rate-limit";
import { acceptUpsell } from "@/app/server/orders";
import { log } from "@/app/lib/log";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

export async function POST(req: NextRequest) {
  if (!isSameOrigin(req)) return NextResponse.json({ error: "Origem inválida." }, { status: 403 });
  const ip = getClientIp(req.headers);
  if (!rateLimit(`upsell:${ip}`, 10, 10 * 60_000)) return NextResponse.json({ error: "Muitas tentativas. Aguarde um pouco." }, { status: 429 });

  const body = (await req.json().catch(() => null)) as { order?: string; token?: string; upsellId?: string } | null;
  if (!body?.order || !body.token || !body.upsellId) return NextResponse.json({ error: "Dados inválidos." }, { status: 400 });

  try {
    const r = await acceptUpsell(body.order, body.token, body.upsellId);
    if ("error" in r) return NextResponse.json({ error: r.error }, { status: 409 });
    return NextResponse.json({ ok: true, orderNumber: r.orderNumber, token: r.token });
  } catch (err) {
    log.error("upsell", "falha ao aceitar", { error: err instanceof Error ? err.message : String(err) });
    return NextResponse.json({ error: "Não foi possível gerar o pedido adicional." }, { status: 500 });
  }
}
