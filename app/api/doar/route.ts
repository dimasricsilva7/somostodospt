import { NextResponse, type NextRequest } from "next/server";
import { rateLimit } from "@/app/lib/rate-limit";
import { getClientIp, isSameOrigin } from "@/app/lib/request";
import { isValidCpf, onlyDigits } from "@/app/lib/validators";
import { log } from "@/app/lib/log";
import { CheckoutError, createDonationOrder } from "@/app/server/orders";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

/** Cria a cobrança PIX da doação (R$ 13) e devolve o link do PIX (/pedido). */
export async function POST(req: NextRequest) {
  if (!isSameOrigin(req)) return NextResponse.json({ error: "Origem inválida." }, { status: 403 });
  const ip = getClientIp(req.headers);
  if (!rateLimit(`doar:${ip}`, 10, 10 * 60_000)) {
    return NextResponse.json({ error: "Muitas tentativas. Aguarde alguns minutos." }, { status: 429 });
  }

  const body = (await req.json().catch(() => null)) as { name?: string; email?: string; cpf?: string } | null;
  const name = (body?.name ?? "").trim().slice(0, 120);
  const email = (body?.email ?? "").trim().slice(0, 160);
  const cpf = onlyDigits(body?.cpf ?? "");
  const fields: Record<string, string> = {};
  if (name.length < 2) fields.name = "Informe seu nome.";
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) fields.email = "E-mail inválido.";
  if (!isValidCpf(cpf)) fields.cpf = "CPF inválido.";
  if (Object.keys(fields).length) return NextResponse.json({ error: "Confira os dados.", fields }, { status: 422 });

  try {
    const order = await createDonationOrder({ name, email, cpf }, { ip, userAgent: req.headers.get("user-agent"), host: null });
    return NextResponse.json({ orderNumber: order.orderNumber, token: order.accessToken });
  } catch (err) {
    if (err instanceof CheckoutError) return NextResponse.json({ error: err.message, fields: err.fields }, { status: err.status });
    log.error("doar", "erro ao criar doação", { error: err instanceof Error ? err.message : String(err) });
    return NextResponse.json({ error: "Não conseguimos gerar o PIX agora. Tente novamente." }, { status: 500 });
  }
}
