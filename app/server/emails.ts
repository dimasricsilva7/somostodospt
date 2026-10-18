import "server-only";
import { db } from "@/app/lib/db";
import { siteUrl } from "@/app/lib/env";
import { log } from "@/app/lib/log";
import { emailEnabled, renderAbandoned, renderExpired, renderPaid, renderPending, sendMail } from "@/app/lib/email";

const firstName = (name: string | null | undefined) => (name ? name.split(/\s+/)[0] : "");

/** E-mail de compra aprovada (uma única vez). Chamado quando o pedido vira PAID. */
export async function emailOrderPaid(orderId: string): Promise<void> {
  if (!emailEnabled()) return;
  const claimed = await db.order.updateMany({ where: { id: orderId, emailPaidAt: null }, data: { emailPaidAt: new Date() } });
  if (!claimed.count) return;
  const order = await db.order.findUnique({ where: { id: orderId }, include: { customer: { select: { email: true, name: true } } } });
  if (!order?.customer.email) return;
  const url = `${siteUrl()}/pedido/${order.orderNumber}?t=${order.accessToken}`;
  const ok = await sendMail(
    order.customer.email,
    `Pagamento confirmado — pedido ${order.orderNumber}`,
    renderPaid({ name: firstName(order.customer.name), orderNumber: order.orderNumber!, productName: order.productName, size: order.productName.includes("×") ? "" : order.size, totalCents: order.totalCents, url })
  );
  if (!ok) await db.order.updateMany({ where: { id: orderId }, data: { emailPaidAt: null } }); // libera p/ tentar de novo
  else log.info("email", "compra aprovada enviada", { order: order.orderNumber });
}

/** E-mail de PIX expirado (uma única vez). */
export async function emailOrderExpired(orderId: string): Promise<void> {
  if (!emailEnabled()) return;
  const claimed = await db.order.updateMany({ where: { id: orderId, emailExpiredAt: null }, data: { emailExpiredAt: new Date() } });
  if (!claimed.count) return;
  const order = await db.order.findUnique({ where: { id: orderId }, include: { customer: { select: { email: true, name: true } } } });
  if (!order?.customer.email) return;
  const url = `${siteUrl()}/pedido/${order.orderNumber}?t=${order.accessToken}`;
  const ok = await sendMail(
    order.customer.email,
    `Seu PIX expirou — pedido ${order.orderNumber}`,
    renderExpired({ name: firstName(order.customer.name), orderNumber: order.orderNumber!, productName: order.productName, size: order.productName.includes("×") ? "" : order.size, url })
  );
  if (!ok) await db.order.updateMany({ where: { id: orderId }, data: { emailExpiredAt: null } });
  else log.info("email", "pix expirado enviado", { order: order.orderNumber });
}

/** Reenvio manual pelo admin — manda o e-mail conforme o status atual do pedido. */
export async function resendOrderEmail(orderId: string): Promise<{ sent: boolean; reason?: string }> {
  if (!emailEnabled()) return { sent: false, reason: "email_disabled" };
  const order = await db.order.findUnique({ where: { id: orderId }, include: { customer: { select: { email: true, name: true } } } });
  if (!order?.customer.email) return { sent: false, reason: "no_email" };
  const name = firstName(order.customer.name);
  const url = `${siteUrl()}/pedido/${order.orderNumber}?t=${order.accessToken}`;

  let subject: string;
  let html: string;
  if (order.status === "PAID") {
    subject = `Pagamento confirmado — pedido ${order.orderNumber}`;
    html = renderPaid({ name, orderNumber: order.orderNumber!, productName: order.productName, size: order.productName.includes("×") ? "" : order.size, totalCents: order.totalCents, url });
  } else if (order.status === "EXPIRED") {
    subject = `Seu PIX expirou — pedido ${order.orderNumber}`;
    html = renderExpired({ name, orderNumber: order.orderNumber!, productName: order.productName, size: order.productName.includes("×") ? "" : order.size, url });
  } else {
    subject = `Seu pedido ${order.orderNumber} está aguardando pagamento`;
    html = renderPending({ name, orderNumber: order.orderNumber!, productName: order.productName, size: order.productName.includes("×") ? "" : order.size, totalCents: order.totalCents, url });
  }
  const sent = await sendMail(order.customer.email, subject, html);
  return { sent, reason: sent ? undefined : "send_failed" };
}

/** E-mail de recuperação de carrinho abandonado (cron). Envia uma vez por lead. */
export async function emailAbandonedLeads(minMinutes = 20, maxAgeHours = 48, limit = 30): Promise<{ sent: number }> {
  if (!emailEnabled()) return { sent: 0 };
  const leads = await db.checkoutLead.findMany({
    where: {
      orderId: null,
      emailSentAt: null,
      email: { not: null },
      updatedAt: { lt: new Date(Date.now() - minMinutes * 60_000), gt: new Date(Date.now() - maxAgeHours * 3_600_000) },
    },
    take: limit,
  });
  let sent = 0;
  for (const lead of leads) {
    const claimed = await db.checkoutLead.updateMany({ where: { id: lead.id, emailSentAt: null }, data: { emailSentAt: new Date() } });
    if (!claimed.count) continue;
    const url = lead.productSlug ? `${siteUrl()}/checkout?produto=${encodeURIComponent(lead.productSlug)}` : `${siteUrl()}/`;
    const ok = await sendMail(lead.email!, "Você esqueceu algo no carrinho 👀", renderAbandoned({ name: lead.name, productName: lead.productName, url }));
    if (ok) sent++;
    else await db.checkoutLead.updateMany({ where: { id: lead.id }, data: { emailSentAt: null } });
  }
  if (sent) log.info("email", "recuperação de carrinho enviada", { sent });
  return { sent };
}
