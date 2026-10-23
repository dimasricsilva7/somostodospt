import { NextResponse, type NextRequest } from "next/server";
import type { FulfillmentStatus } from "@prisma/client";
import { isAuthed } from "@/app/lib/auth";
import { isSameOrigin } from "@/app/lib/request";
import { bulkUpdateFulfillment } from "@/app/server/admin-orders";
import { log } from "@/app/lib/log";

export const dynamic = "force-dynamic";

const STATUSES: FulfillmentStatus[] = ["PENDING", "PROCESSING", "SHIPPED", "DELIVERED"];

export async function POST(req: NextRequest) {
  if (!isSameOrigin(req)) return NextResponse.json({ error: "Origem inválida." }, { status: 403 });
  if (!(await isAuthed())) return NextResponse.json({ error: "Não autorizado." }, { status: 401 });

  const body = (await req.json().catch(() => null)) as { orderNumbers?: unknown; status?: unknown } | null;
  const status = body?.status as FulfillmentStatus;
  const orderNumbers = Array.isArray(body?.orderNumbers) ? (body!.orderNumbers as unknown[]).map(String) : [];
  if (!STATUSES.includes(status)) return NextResponse.json({ error: "Status inválido." }, { status: 400 });
  if (orderNumbers.length === 0) return NextResponse.json({ error: "Nenhum pedido selecionado." }, { status: 400 });

  try {
    const { updated } = await bulkUpdateFulfillment(orderNumbers, status);
    return NextResponse.json({ ok: true, updated });
  } catch (err) {
    log.error("admin", "falha na edição em massa de entrega", { error: err instanceof Error ? err.message : String(err) });
    return NextResponse.json({ error: "Não foi possível atualizar. O banco está acessível?" }, { status: 500 });
  }
}
