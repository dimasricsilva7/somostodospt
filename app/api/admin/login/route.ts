import { NextResponse, type NextRequest } from "next/server";
import { adminEnabled, checkPassword, setAdminCookie } from "@/app/lib/auth";
import { rateLimit } from "@/app/lib/rate-limit";
import { getClientIp, isSameOrigin } from "@/app/lib/request";
import { log } from "@/app/lib/log";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  if (!isSameOrigin(req)) return NextResponse.json({ error: "Origem inválida." }, { status: 403 });
  if (!adminEnabled()) return NextResponse.json({ error: "O painel ainda não foi configurado (defina ADMIN_PASSWORD)." }, { status: 503 });
  const ip = getClientIp(req.headers);
  if (!rateLimit(`admin-login:${ip}`, 8, 10 * 60_000)) return NextResponse.json({ error: "Muitas tentativas. Aguarde alguns minutos." }, { status: 429 });

  const body = (await req.json().catch(() => null)) as { password?: string } | null;
  if (!body?.password || !checkPassword(body.password)) {
    log.warn("admin", "login falhou", { ip: ip.replace(/\.\d+$/, ".x") });
    return NextResponse.json({ error: "Senha incorreta." }, { status: 401 });
  }
  await setAdminCookie();
  return NextResponse.json({ ok: true });
}
