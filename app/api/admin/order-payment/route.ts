import { NextResponse, type NextRequest } from "next/server";
import { isAuthed } from "@/app/lib/auth";
import { isSameOrigin } from "@/app/lib/request";
import { db } from "@/app/lib/db";
import { adminMarkPaid, adminVerifyPayment, resendMetaPurchase } from "@/app/server/orders";
import { log } from "@/app/lib/log";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

export async function POST(req: NextRequest) {
  if (!isSameOrigin(req)) return NextResponse.json({ error: "Origem inválida." }, { status: 403 });
  if (!(await isAuthed())) return NextResponse.json({ error: "Não autorizado." }, { status: 401 });

  const body = (await req.json().catch(() => null)) as { orderNumber?: string; action?: string } | null;
  if (!body?.orderNumber || !["verify", "mark-paid", "resend-meta"].includes(body.action ?? "")) {
    return NextResponse.json({ error: "Dados inválidos." }, { status: 400 });
  }

  try {
    const order = await db.order.findUnique({ where: { orderNumber: body.orderNumber }, select: { id: true } });
    if (!order) return NextResponse.json({ error: "Pedido não encontrado." }, { status: 404 });

    if (body.action === "resend-meta") {
      const r = await resendMetaPurchase(order.id);
      if (r.sent) return NextResponse.json({ ok: true, message: "Conversão reenviada ao Meta (CAPI)." });
      const m = r.reason === "capi_off" ? "CAPI não configurado." : r.reason === "not_paid" ? "O pedido não está pago." : "Não foi possível reenviar.";
      return NextResponse.json({ ok: false, message: m });
    }

    if (body.action === "verify") {
      const r = await adminVerifyPayment(order.id);
      if (r.paid) return NextResponse.json({ ok: true, message: "Pagamento confirmado na BravoPay! Pedido marcado como pago." });
      if (!r.found) return NextResponse.json({ ok: false, message: "A BravoPay não encontrou este pagamento. Se o cliente pagou mesmo, use 'Marcar como pago'." });
      return NextResponse.json({ ok: false, message: `Ainda não consta como pago na BravoPay (${r.note ?? "pendente"}).` });
    }

    const r = await adminMarkPaid(order.id);
    return NextResponse.json({ ok: r.ok, message: r.ok ? "Pedido marcado como pago. E-mail de confirmação enviado." : `Não foi possível (${r.note ?? "erro"}).` });
  } catch (err) {
    log.error("admin", "falha na ação de pagamento", { error: err instanceof Error ? err.message : String(err) });
    return NextResponse.json({ error: "Não foi possível executar a ação." }, { status: 500 });
  }
}
