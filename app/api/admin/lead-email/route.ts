import { NextResponse, type NextRequest } from "next/server";
import { isAuthed } from "@/app/lib/auth";
import { isSameOrigin } from "@/app/lib/request";
import { emailAbandonedLead } from "@/app/server/emails";
import { log } from "@/app/lib/log";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  if (!isSameOrigin(req)) return NextResponse.json({ error: "Origem inválida." }, { status: 403 });
  if (!(await isAuthed())) return NextResponse.json({ error: "Não autorizado." }, { status: 401 });

  const body = (await req.json().catch(() => null)) as { email?: string } | null;
  if (!body?.email) return NextResponse.json({ error: "E-mail não informado." }, { status: 400 });

  try {
    const r = await emailAbandonedLead(body.email);
    if (r.sent) return NextResponse.json({ ok: true, message: "E-mail de recuperação enviado." });
    const m = r.reason === "email_disabled" ? "Envio de e-mail não configurado." : r.reason === "not_found" ? "Lead não encontrado." : "Não foi possível enviar.";
    return NextResponse.json({ ok: false, message: m });
  } catch (err) {
    log.error("admin", "falha ao enviar e-mail de abandono", { error: err instanceof Error ? err.message : String(err) });
    return NextResponse.json({ error: "Não foi possível enviar o e-mail." }, { status: 500 });
  }
}
