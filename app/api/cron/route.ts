import { NextResponse, type NextRequest } from "next/server";
import { reconcilePending } from "@/app/server/orders";
import { emailAbandonedLeads } from "@/app/server/emails";
import { log } from "@/app/lib/log";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Job periódico (configurar no cron-job.org, a cada ~2–5 min):
 *   https://SEU-DOMINIO/api/cron?key=SEU_CRON_SECRET
 * ou com header Authorization: Bearer SEU_CRON_SECRET.
 * Faz: reconciliação de PIX pendentes (confirma/expira + e-mail de expirado) e
 * envia e-mails de carrinho abandonado.
 */
async function run(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return NextResponse.json({ error: "cron_not_configured" }, { status: 503 });
  const key = req.nextUrl.searchParams.get("key");
  const auth = req.headers.get("authorization");
  if (key !== secret && auth !== `Bearer ${secret}`) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  try {
    const [recon, mails] = await Promise.all([reconcilePending(), emailAbandonedLeads()]);
    log.info("cron", "executado", { ...recon, abandonedEmails: mails.sent });
    return NextResponse.json({ ok: true, ...recon, abandonedEmails: mails.sent });
  } catch (err) {
    log.error("cron", "falha", { error: err instanceof Error ? err.message : String(err) });
    return NextResponse.json({ error: "cron_failed" }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  return run(req);
}
export async function POST(req: NextRequest) {
  return run(req);
}
