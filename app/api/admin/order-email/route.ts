import { NextResponse, type NextRequest } from "next/server";
import { isAuthed } from "@/app/lib/auth";
import { isSameOrigin } from "@/app/lib/request";
import { db } from "@/app/lib/db";
import { resendOrderEmail } from "@/app/server/emails";
import { log } from "@/app/lib/log";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  if (!isSameOrigin(req)) return NextResponse.json({ error: "Origem inválida." }, { status: 403 });
  if (!(await isAuthed())) return NextResponse.json({ error: "Não autorizado." }, { status: 401 });

  const body = (await req.json().catch(() => null)) as { orderNumber?: string } | null;
  if (!body?.orderNumber) return NextResponse.json({ error: "Dados inválidos." }, { status: 400 });

  try {
    const order = await db.order.findUnique({ where: { orderNumber: body.orderNumber }, select: { id: true } });
    if (!order) return NextResponse.json({ error: "Pedido não encontrado." }, { status: 404 });
    const result = await resendOrderEmail(order.id);
    if (!result.sent) {
      const msg =
        result.reason === "email_disabled" ? "O envio de e-mail ainda não está configurado (Resend)."
        : result.reason === "no_email" ? "Este pedido não tem e-mail do cliente."
        : "Não foi possível enviar o e-mail agora.";
      return NextResponse.json({ error: msg }, { status: 400 });
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    log.error("admin", "falha ao reenviar e-mail", { error: err instanceof Error ? err.message : String(err) });
    return NextResponse.json({ error: "Não foi possível enviar o e-mail." }, { status: 500 });
  }
}
