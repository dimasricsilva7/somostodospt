import { NextResponse, type NextRequest } from "next/server";
import { rateLimit } from "@/app/lib/rate-limit";
import { getClientIp, isSameOrigin } from "@/app/lib/request";
import { findOrderByAccess, renewPix, syncOrder, toPublicOrder } from "@/app/server/orders";
import { pixQrDataUrl } from "@/app/lib/qr";
import { log } from "@/app/lib/log";

export const dynamic = "force-dynamic";

/** GET — consulta/pollar o status real do pedido (nunca confia no navegador). */
export async function GET(req: NextRequest) {
  const ip = getClientIp(req.headers);
  if (!rateLimit(`status:${ip}`, 90, 60_000)) return NextResponse.json({ error: "rate_limited" }, { status: 429 });

  const orderNumber = req.nextUrl.searchParams.get("order");
  const token = req.nextUrl.searchParams.get("token");
  const order = await findOrderByAccess(orderNumber, token);
  if (!order) return NextResponse.json({ error: "not_found" }, { status: 404 });

  // Consulta o gateway (throttled) para pegar confirmação/expiração em tempo quase real.
  await syncOrder(order, { source: "poll" }).catch(() => null);
  const full = await findOrderByAccess(orderNumber, token);
  const pub = toPublicOrder(full ?? order);
  const qr = await pixQrDataUrl(pub.pixCopyPaste);
  return NextResponse.json({ order: pub, qr });
}

/** POST — ações do cliente no pedido: renovar PIX expirado. */
export async function POST(req: NextRequest) {
  if (!isSameOrigin(req)) return NextResponse.json({ error: "Origem inválida." }, { status: 403 });
  const ip = getClientIp(req.headers);
  if (!rateLimit(`status-post:${ip}`, 12, 60_000)) return NextResponse.json({ error: "rate_limited" }, { status: 429 });

  const body = (await req.json().catch(() => null)) as { order?: string; token?: string; action?: string } | null;
  const order = await findOrderByAccess(body?.order, body?.token);
  if (!order) return NextResponse.json({ error: "not_found" }, { status: 404 });

  if (body?.action === "renew") {
    try {
      await renewPix(order.id);
    } catch (err) {
      log.error("orders", "falha ao renovar PIX", { order: order.orderNumber, error: err instanceof Error ? err.message : String(err) });
      return NextResponse.json({ error: "Não foi possível gerar um novo PIX agora." }, { status: 502 });
    }
  }

  const full = await findOrderByAccess(body?.order, body?.token);
  const pub = toPublicOrder(full ?? order);
  const qr = await pixQrDataUrl(pub.pixCopyPaste);
  return NextResponse.json({ order: pub, qr });
}
