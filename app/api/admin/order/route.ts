import { NextResponse, type NextRequest } from "next/server";
import type { FulfillmentStatus } from "@prisma/client";
import { isAuthed } from "@/app/lib/auth";
import { isSameOrigin } from "@/app/lib/request";
import { updateFulfillment } from "@/app/server/admin-orders";
import { log } from "@/app/lib/log";

export const dynamic = "force-dynamic";

const VALID = new Set(["PENDING", "PROCESSING", "SHIPPED", "DELIVERED"]);

export async function POST(req: NextRequest) {
  if (!isSameOrigin(req)) return NextResponse.json({ error: "Origem inválida." }, { status: 403 });
  if (!(await isAuthed())) return NextResponse.json({ error: "Não autorizado." }, { status: 401 });

  const body = (await req.json().catch(() => null)) as { orderNumber?: string; fulfillmentStatus?: string; trackingCode?: string } | null;
  if (!body?.orderNumber || !body.fulfillmentStatus || !VALID.has(body.fulfillmentStatus)) {
    return NextResponse.json({ error: "Dados inválidos." }, { status: 400 });
  }
  try {
    await updateFulfillment(body.orderNumber, body.fulfillmentStatus as FulfillmentStatus, body.trackingCode ?? null);
    return NextResponse.json({ ok: true });
  } catch (err) {
    log.error("admin", "falha ao atualizar entrega", { error: err instanceof Error ? err.message : String(err) });
    return NextResponse.json({ error: "Não foi possível salvar." }, { status: 500 });
  }
}
