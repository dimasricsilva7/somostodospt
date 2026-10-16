import "server-only";
import nodemailer from "nodemailer";
import { log } from "@/app/lib/log";

/**
 * Envio de e-mails transacionais por SMTP (compatível com GoDaddy).
 * Variáveis:
 * - EMAIL_USER  (e-mail completo, ex.: contato@seudominio.com)
 * - EMAIL_PASS  (senha do e-mail)
 * - EMAIL_FROM  (remetente, ex.: "Somos Todos PT <contato@seudominio.com>")
 * - EMAIL_HOST  (opcional; padrão smtpout.secureserver.net — GoDaddy)
 * - EMAIL_PORT  (opcional; padrão 465 SSL)
 */
export function emailEnabled(): boolean {
  return Boolean(process.env.EMAIL_USER && process.env.EMAIL_PASS && process.env.EMAIL_FROM);
}

function transporter() {
  const host = process.env.EMAIL_HOST || "smtpout.secureserver.net";
  const port = Number(process.env.EMAIL_PORT || 465);
  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
  });
}

export async function sendMail(to: string, subject: string, html: string): Promise<boolean> {
  if (!emailEnabled()) return false;
  if (!to || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(to)) return false;
  try {
    await transporter().sendMail({ from: process.env.EMAIL_FROM, to, subject, html });
    return true;
  } catch (err) {
    log.error("email", "falha no envio", { subject, error: err instanceof Error ? err.message : String(err) });
    return false;
  }
}

// ───────────────────────── Templates ─────────────────────────

function base(title: string, bodyHtml: string): string {
  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;background:#f5f5f5;font-family:Arial,Helvetica,sans-serif;color:#161616">
  <div style="max-width:560px;margin:0 auto;background:#fff">
    <div style="background:#d90018;color:#fff;padding:20px 24px;font-weight:900;font-size:18px;letter-spacing:.02em">SOMOS TODOS PT</div>
    <div style="padding:24px">
      <h1 style="font-size:22px;margin:0 0 14px">${title}</h1>
      ${bodyHtml}
    </div>
    <div style="padding:16px 24px;background:#161616;color:#bbb;font-size:12px">Somos Todos PT · Este e-mail foi enviado porque você iniciou uma compra em nossa loja.</div>
  </div>
</body></html>`;
}

function button(href: string, label: string): string {
  return `<a href="${href}" style="display:inline-block;background:#d90018;color:#fff;text-decoration:none;font-weight:800;padding:13px 22px;border-radius:3px;margin:8px 0">${label}</a>`;
}

const brl = (cents: number) => `R$ ${(cents / 100).toFixed(2).replace(".", ",")}`;

export function renderPaid(p: { name: string; orderNumber: string; productName: string; size: string; totalCents: number; url: string }): string {
  return base(
    "Pagamento confirmado! 🎉",
    `<p>Olá, ${p.name}. Recebemos o pagamento do seu pedido <strong>${p.orderNumber}</strong>.</p>
     <p>${p.productName} · Tamanho ${p.size} · <strong>${brl(p.totalCents)}</strong></p>
     <p>Já estamos preparando o envio. A entrega é em <strong>2 a 3 dias úteis</strong>, com frete grátis.</p>
     <p>${button(p.url, "Acompanhar meu pedido")}</p>`
  );
}

export function renderExpired(p: { name: string; orderNumber: string; productName: string; size: string; url: string }): string {
  return base(
    "Seu PIX expirou — mas dá pra retomar",
    `<p>Olá, ${p.name}. O prazo do PIX do pedido <strong>${p.orderNumber}</strong> (${p.productName} · ${p.size}) terminou.</p>
     <p>Não se preocupe: você pode gerar um novo código PIX e concluir a compra em segundos.</p>
     <p>${button(p.url, "Gerar novo PIX")}</p>`
  );
}

export function renderAbandoned(p: { name: string | null; productName: string | null; url: string }): string {
  const hi = p.name ? `Olá, ${p.name}.` : "Olá!";
  const prod = p.productName ? ` da <strong>${p.productName}</strong>` : "";
  return base(
    "Você esqueceu algo no carrinho 👀",
    `<p>${hi} Vimos que você começou a compra${prod} mas não finalizou.</p>
     <p>Pague com PIX em segundos — entrega em <strong>2 a 3 dias úteis</strong> e <strong>frete grátis</strong> para todo o Brasil.</p>
     <p>${button(p.url, "Concluir minha compra")}</p>`
  );
}
