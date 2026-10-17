import { NextResponse, type NextRequest } from "next/server";
import { isAuthed } from "@/app/lib/auth";
import { isSameOrigin } from "@/app/lib/request";
import { resendRecentPurchases } from "@/app/server/orders";
import { log } from "@/app/lib/log";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  if (!isSameOrigin(req)) return NextResponse.json({ error: "Origem inválida." }, { status: 403 });
  if (!(await isAuthed())) return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  try {
    const r = await resendRecentPurchases(7);
    return NextResponse.json({ ok: true, ...r, message: `Reenviadas ${r.sent}/${r.total} conversões dos últimos 7 dias ao Meta.` });
  } catch (err) {
    log.error("admin", "falha ao recuperar conversões", { error: err instanceof Error ? err.message : String(err) });
    return NextResponse.json({ error: "Não foi possível recuperar as conversões." }, { status: 500 });
  }
}
