import "server-only";
import { Prisma, type Order, type OrderStatus, type PaymentStatus as DbPaymentStatus } from "@prisma/client";
import { randomInt } from "crypto";
import { db } from "@/app/lib/db";
import { bravopayMode, isProductionDeploy, siteUrl } from "@/app/lib/env";
import { log } from "@/app/lib/log";
import { hashIp, randomToken, safeEqual } from "@/app/lib/crypto";
import { paymentService, PaymentError, type PaymentSnapshot, type PaymentStatus } from "@/app/lib/payments";
import { computeTotals, formatOrderNumber, MIN_PIX_CENTS } from "@/app/lib/pricing";
import { canTransition, isPaidStatus } from "@/app/lib/order-status";
import { sendCapiEvent, fbcFromClickId } from "@/app/lib/meta/capi";
import { product } from "@/app/config/product";
import { productPriceCents, sizeAvailable } from "@/app/config/catalog";
import { sellableMerged } from "@/app/server/content";
import { linkLeadToOrder } from "@/app/server/leads";
import { emailOrderExpired, emailOrderPaid } from "@/app/server/emails";
import { PIX_EXPIRATION_MINUTES, shippingCents } from "@/app/config/commerce";
import type { CheckoutInput } from "@/app/lib/validation";
import type { PublicOrder } from "@/app/types/order";

export class CheckoutError extends Error {
  constructor(
    message: string,
    public status = 400,
    public fields?: Record<string, string>
  ) {
    super(message);
  }
}

const cut = (v: string | null | undefined, n = 200) => (v ? String(v).slice(0, n) : null);

// ───────────────────────── Linha do tempo do pedido ─────────────────────────

const SENSITIVE = /^(cpf|phone|customer|access_?token|authorization|api_?key|copy_?paste|pix)$/i;
function sanitize(data: unknown): Prisma.InputJsonValue | undefined {
  if (data == null) return undefined;
  const walk = (v: unknown): unknown => {
    if (Array.isArray(v)) return v.map(walk);
    if (v && typeof v === "object") return Object.fromEntries(Object.entries(v as Record<string, unknown>).map(([k, val]) => [k, SENSITIVE.test(k) ? "[redacted]" : walk(val)]));
    return v;
  };
  return walk(data) as Prisma.InputJsonValue;
}

export async function logOrderEvent(orderId: string | null, type: string, message: string, data?: unknown, status?: string) {
  await db.paymentEvent
    .create({ data: { orderId, type, message: message.slice(0, 500), status: status ?? null, data: sanitize(data) } })
    .catch((e) => log.error("order-event", "falha ao registrar", { type, error: e instanceof Error ? e.message : String(e) }));
}

// ───────────────────────── Tipos ─────────────────────────

export type RequestMeta = { ip: string; userAgent: string | null; host: string | null };

function deviceFrom(ua: string | null): string {
  if (!ua) return "unknown";
  return /mobile|android|iphone|ipad/i.test(ua) ? "mobile" : "desktop";
}

function attributionFields(ctx: CheckoutInput["context"]) {
  const a = ctx?.attribution ?? {};
  const last = a.last ?? a.first ?? null;
  return {
    utmSource: cut(last?.source),
    utmMedium: cut(last?.medium),
    utmCampaign: cut(last?.campaign),
    utmContent: cut(last?.content),
    utmTerm: cut(last?.term),
    utmId: cut(last?.id, 64),
    fbclid: cut(a.fbclid, 500),
    gclid: cut(a.gclid, 500),
    ttclid: cut(a.ttclid, 500),
    fbp: cut(ctx?.fbp),
    fbc: cut(ctx?.fbc, 500),
    landingPage: cut(a.landingPage, 500),
    referrer: cut(a.referrer, 500),
    sessionId: cut(ctx?.sessionId, 64),
    visitorId: cut(ctx?.visitorId, 64),
    adsConsent: Boolean(ctx?.adsConsent),
  };
}

// ───────────────────────── Checkout ─────────────────────────

async function uniqueOrderNumber(tx: Prisma.TransactionClient, seq: number) {
  const year = new Date().getFullYear();
  for (let i = 0; i < 10; i++) {
    const candidate = formatOrderNumber(year, randomInt(10000, 100000));
    if (!(await tx.order.findUnique({ where: { orderNumber: candidate }, select: { id: true } }))) return candidate;
  }
  return formatOrderNumber(year, 100000 + seq);
}

/**
 * Cria o pedido PIX. Idempotente por checkoutToken: duplo clique ou retry de rede
 * devolvem o mesmo pedido. Preços SEMPRE recalculados no servidor a partir do config.
 */
export async function createCheckoutOrder(input: CheckoutInput, meta: RequestMeta) {
  const existing = await db.order.findUnique({ where: { checkoutToken: input.checkoutToken } });
  if (existing) {
    if (existing.status === "PENDING" && !existing.pixCopyPaste) return { order: await ensurePix(existing.id), reused: true };
    return { order: existing, reused: true };
  }

  if (bravopayMode() === "disabled") {
    throw new CheckoutError("O pagamento via PIX está indisponível no momento. Tente novamente em alguns minutos.", 503);
  }

  // Modelo escolhido: revalidado no servidor (ativo, com arte e preço). Nunca confiamos no navegador.
  const model = await sellableMerged(input.productSlug);
  if (!model) throw new CheckoutError("Este modelo não está disponível para compra no momento.", 409);
  if (!sizeAvailable(model, input.size)) throw new CheckoutError("Este tamanho não está disponível para o modelo escolhido.", 409, { size: "Tamanho indisponível" });
  const price = productPriceCents(model);
  if (price === undefined) throw new CheckoutError("A loja ainda não ativou o preço deste modelo. A compra estará disponível em breve.", 503);

  // Anti-abuso persistente (vale entre instâncias): impede gerar cobranças PIX em massa.
  if (isProductionDeploy()) {
    const ipHash = hashIp(meta.ip);
    const [byIp, unpaidByEmail] = await Promise.all([
      ipHash ? db.order.count({ where: { ipHash, createdAt: { gte: new Date(Date.now() - 15 * 60_000) } } }) : 0,
      db.order.count({ where: { customer: { email: input.customer.email }, status: { in: ["PENDING", "PIX_GENERATED"] }, createdAt: { gte: new Date(Date.now() - 60 * 60_000) } } }),
    ]);
    if (byIp >= 8 || unpaidByEmail >= 5) {
      log.warn("checkout", "limite de pedidos atingido", { byIp, unpaidByEmail });
      throw new CheckoutError("Você já tem pedidos aguardando pagamento. Conclua um deles ou aguarde alguns minutos.", 429);
    }
  }

  const quantity = Math.min(5, Math.max(1, input.quantity));
  const unitPriceCents = price;
  const listPriceCents = typeof model.compareAtPriceInCents === "number" ? model.compareAtPriceInCents : null;
  const totals = computeTotals([{ unitPriceCents, quantity }], shippingCents());
  if (totals.totalCents < MIN_PIX_CENTS) throw new CheckoutError("O valor mínimo para pagamento via PIX é R$ 5,00.");

  const attr = attributionFields(input.context);
  const shippingAddress = { cep: input.address.cep, street: input.address.street, number: input.address.number, complement: input.address.complement || null, district: input.address.district, city: input.address.city, state: input.address.state };
  const customerSnapshot = { name: input.customer.name, email: input.customer.email, phone: input.customer.phone, cpf: input.customer.cpf };

  let order: Order;
  try {
    order = await db.$transaction(async (tx) => {
      const customer = await tx.customer.upsert({
        where: { email: input.customer.email },
        update: { name: input.customer.name, phone: input.customer.phone, cpf: input.customer.cpf },
        create: { name: input.customer.name, email: input.customer.email, phone: input.customer.phone, cpf: input.customer.cpf },
      });
      const created = await tx.order.create({
        data: {
          customerId: customer.id,
          customerSnapshot,
          shippingAddress,
          productSlug: model.slug,
          productName: model.name,
          sku: model.sku,
          size: input.size,
          quantity,
          unitPriceCents,
          listPriceCents,
          ...totals,
          paymentProvider: "bravopay",
          status: "PENDING",
          checkoutToken: input.checkoutToken,
          accessToken: randomToken(24),
          userAgent: cut(meta.userAgent, 300),
          device: deviceFrom(meta.userAgent),
          ipHash: hashIp(meta.ip),
          ...attr,
        },
      });
      const orderNumber = await uniqueOrderNumber(tx, created.seq);
      return tx.order.update({ where: { id: created.id }, data: { orderNumber, externalReference: orderNumber, metaEventId: `purchase_${created.id}` } });
    });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      const again = await db.order.findUnique({ where: { checkoutToken: input.checkoutToken } });
      if (again) return { order: again, reused: true };
    }
    throw err;
  }

  await logOrderEvent(order.id, "order_created", `Pedido ${order.orderNumber} criado`, { total: order.totalCents, size: order.size, quantity });
  log.info("checkout", "pedido criado", { order: order.orderNumber, total: order.totalCents });
  await linkLeadToOrder(input.checkoutToken, order.id); // tira o lead da lista de abandonados

  const result = await ensurePix(order.id);

  // Meta: AddPaymentInfo (mesmo event_id do navegador → deduplicação).
  if (input.paymentEventId && order.adsConsent && result.pixCopyPaste) {
    const [firstName, ...rest] = input.customer.name.split(/\s+/);
    await sendCapiEvent({
      eventName: "AddPaymentInfo",
      eventId: input.paymentEventId,
      eventSourceUrl: `${siteUrl()}/checkout`,
      user: {
        email: input.customer.email,
        phone: input.customer.phone,
        firstName,
        lastName: rest.length ? rest[rest.length - 1] : undefined,
        city: input.address.city,
        state: input.address.state,
        zip: input.address.cep,
        externalId: order.customerId,
        ip: meta.ip,
        userAgent: meta.userAgent,
        fbc: order.fbc ?? fbcFromClickId(order.fbclid, order.createdAt),
        fbp: order.fbp,
      },
      customData: { currency: "BRL", value: order.totalCents / 100, content_type: "product", content_ids: [model.sku], contents: [{ id: model.sku, quantity, item_price: unitPriceCents / 100 }], payment_type: "pix" },
    });
  }
  return { order: result, reused: false };
}

/** Gera o PIX no gateway se o pedido ainda não tiver um. Seguro para chamar de novo. */
export async function ensurePix(orderId: string): Promise<Order> {
  const order = await db.order.findUniqueOrThrow({ where: { id: orderId }, include: { customer: true } });
  if (order.pixCopyPaste || order.status !== "PENDING") return order;

  const expiresIn = Math.min(1440, Math.max(5, PIX_EXPIRATION_MINUTES)) * 60;
  const description = `${product.brand} ${order.orderNumber} — ${order.quantity}x ${order.productName} (Tam ${order.size})`;
  const snap = order.customerSnapshot as { cpf?: string | null };

  await logOrderEvent(order.id, "payment_request", "Solicitando PIX ao gateway", { amount_cents: order.totalCents, external_reference: order.externalReference, expires_in: expiresIn });

  try {
    const charge = await paymentService.createPixPayment({
      amountCents: order.totalCents,
      idempotencyKey: `somostodospt-${order.id}-${order.externalReference}`,
      externalReference: order.externalReference!,
      description,
      customer: { name: order.customer.name, email: order.customer.email, cpf: snap.cpf ?? order.customer.cpf ?? "", phone: order.customer.phone },
      metadata: {
        order_id: order.id,
        order_number: order.orderNumber ?? "",
        sku: order.sku,
        size: order.size,
        session_id: order.sessionId ?? "",
        customer_id: order.customerId,
      },
      utm: { source: order.utmSource, medium: order.utmMedium, campaign: order.utmCampaign, content: order.utmContent, term: order.utmTerm, fbclid: order.fbclid, gclid: order.gclid, ttclid: order.ttclid },
      expiresInSeconds: expiresIn,
    });

    const moved = await db.order.updateMany({
      where: { id: order.id, status: "PENDING" },
      data: {
        status: "PIX_GENERATED",
        transactionId: charge.transactionId,
        pixCopyPaste: charge.copyPaste,
        pixExpiresAt: charge.expiresAt ?? new Date(Date.now() + expiresIn * 1000),
        feeCents: charge.feeCents,
        netCents: charge.netCents,
        paymentError: null,
      },
    });
    if (moved.count) {
      await db.payment.upsert({
        where: { transactionId: charge.transactionId },
        update: {},
        create: { orderId: order.id, provider: charge.provider, transactionId: charge.transactionId, status: "PENDING", amountCents: charge.amountCents, feeCents: charge.feeCents, netCents: charge.netCents, metadata: sanitize(charge.metadata) },
      });
      await logOrderEvent(order.id, "payment_response", "PIX gerado", { transaction_id: charge.transactionId, status: charge.status, expires_at: charge.expiresAt }, "PIX_GENERATED");
    }
    return db.order.findUniqueOrThrow({ where: { id: order.id } });
  } catch (err) {
    const message = err instanceof Error ? err.message : "erro desconhecido";
    const code = err instanceof PaymentError ? err.code : undefined;
    await db.order.update({ where: { id: order.id }, data: { paymentError: message.slice(0, 300) } });
    await logOrderEvent(order.id, "payment_error", `Falha ao gerar PIX: ${message}`, { code }, "ERROR");
    log.error("checkout", "falha ao gerar PIX", { order: order.orderNumber, code, message });
    throw new CheckoutError("Não conseguimos gerar o PIX agora. Tente novamente.", 502);
  }
}

// ───────────────────────── Status de pagamento ─────────────────────────

const STATUS_MAP: Record<PaymentStatus, { order: OrderStatus | null; payment: DbPaymentStatus }> = {
  PENDING: { order: null, payment: "PENDING" },
  PAID: { order: "PAID", payment: "PAID" },
  EXPIRED: { order: "EXPIRED", payment: "EXPIRED" },
  REFUNDED: { order: "REFUNDED", payment: "REFUNDED" },
  CHARGEBACK: { order: "CHARGEBACK", payment: "CHARGEBACK" },
  FAILED: { order: "FAILED", payment: "FAILED" },
};

export type ApplyResult = { order: Order | null; previousStatus: OrderStatus | null; newStatus: OrderStatus | null; changed: boolean; note?: string };

/**
 * ÚNICO ponto do sistema que altera o status de pagamento de um pedido.
 * Chamado pelo webhook (push) e pelo polling/reconciliação (pull). Nunca pelo navegador.
 * Os efeitos de "pago" rodam exatamente uma vez (update condicional no banco).
 */
export async function applyPaymentSnapshot(
  orderId: string,
  snap: PaymentSnapshot,
  source: "webhook" | "poll" | "reconcile",
  statusOverride?: PaymentStatus | null
): Promise<ApplyResult> {
  const order = await db.order.findUnique({ where: { id: orderId } });
  if (!order) return { order: null, previousStatus: null, newStatus: null, changed: false, note: "order_not_found" };

  const remote = statusOverride ?? snap.status;
  const mapped = STATUS_MAP[remote];
  if (!mapped) {
    await logOrderEvent(order.id, "status_ignored", `Status desconhecido "${remote}" (${source})`, { transaction_id: snap.transactionId });
    return { order, previousStatus: order.status, newStatus: order.status, changed: false, note: "unknown_status" };
  }
  await db.order.update({ where: { id: order.id }, data: { lastCheckedAt: new Date() } });
  if (!mapped.order) return { order, previousStatus: order.status, newStatus: order.status, changed: false, note: "still_pending" };

  if (mapped.order === "PAID" && snap.amountCents < order.totalCents) {
    await logOrderEvent(order.id, "amount_mismatch", `Valor pago (${snap.amountCents}) menor que o total (${order.totalCents}) — não marcado como pago`, { transaction_id: snap.transactionId, source }, "WARNING");
    log.warn("payment", "valor divergente", { order: order.orderNumber, paid: snap.amountCents, total: order.totalCents });
    return { order, previousStatus: order.status, newStatus: order.status, changed: false, note: "amount_mismatch" };
  }
  if (!canTransition(order.status, mapped.order)) return { order, previousStatus: order.status, newStatus: order.status, changed: false, note: "transition_not_allowed" };

  const now = new Date();
  const paidAt = mapped.order === "PAID" ? (snap.paidAt ?? now) : undefined;
  const moved = await db.order.updateMany({
    where: { id: order.id, status: order.status },
    data: {
      status: mapped.order,
      paymentStatus: mapped.payment,
      transactionId: order.transactionId ?? snap.transactionId,
      feeCents: snap.feeCents ?? order.feeCents,
      netCents: snap.netCents ?? order.netCents,
      ...(paidAt ? { paidAt, paidAmountCents: snap.amountCents } : {}),
      ...(mapped.order === "EXPIRED" ? { expiredAt: now } : {}),
    },
  });
  if (moved.count === 0) {
    const current = await db.order.findUnique({ where: { id: order.id } });
    return { order: current, previousStatus: order.status, newStatus: current?.status ?? null, changed: false, note: "concurrent_update" };
  }

  await db.payment.upsert({
    where: { transactionId: snap.transactionId },
    update: { status: mapped.payment, feeCents: snap.feeCents ?? undefined, netCents: snap.netCents ?? undefined, tracking: sanitize(snap.tracking), ...(paidAt ? { paidAt } : {}) },
    create: {
      orderId: order.id,
      provider: snap.provider,
      transactionId: snap.transactionId,
      status: mapped.payment,
      amountCents: snap.amountCents,
      feeCents: snap.feeCents,
      netCents: snap.netCents,
      paidAt: paidAt ?? null,
      metadata: sanitize(snap.metadata),
      tracking: sanitize(snap.tracking),
    },
  });
  await logOrderEvent(order.id, "status_change", `${order.status} → ${mapped.order} (${source})`, { transaction_id: snap.transactionId, amount_cents: snap.amountCents }, mapped.order);
  log.info("payment", "status alterado", { order: order.orderNumber, from: order.status, to: mapped.order, source });

  if (mapped.order === "PAID") await onConfirmed(order.id);
  if (mapped.order === "EXPIRED") await emailOrderExpired(order.id).catch(() => {});

  const updated = await db.order.findUnique({ where: { id: order.id } });
  return { order: updated, previousStatus: order.status, newStatus: mapped.order, changed: true };
}

/**
 * Venda confirmada (PIX pago): evento Meta Purchase (CAPI).
 * Protegido contra execução dupla por purchaseTrackedAt.
 */
async function onConfirmed(orderId: string) {
  const order = await db.order.findUniqueOrThrow({ where: { id: orderId }, include: { customer: true } });
  const tracked = await db.order.updateMany({ where: { id: order.id, purchaseTrackedAt: null }, data: { purchaseTrackedAt: new Date() } });
  if (!tracked.count) return;

  await emailOrderPaid(order.id).catch(() => {}); // compra aprovada (transacional, independe de consentimento de marketing)

  if (!order.adsConsent) return; // sem consentimento de marketing: nada vai para a Meta
  const value = order.paidAmountCents ?? order.totalCents;
  const address = (order.shippingAddress ?? {}) as { city?: string; state?: string; cep?: string };
  const [firstName, ...rest] = order.customer.name.split(/\s+/);
  await sendCapiEvent({
    eventName: "Purchase",
    eventId: order.metaEventId ?? `purchase_${order.id}`,
    eventSourceUrl: `${siteUrl()}/pedido/${order.orderNumber}`,
    eventTime: Math.floor((order.paidAt ?? new Date()).getTime() / 1000),
    user: {
      email: order.customer.email,
      phone: order.customer.phone,
      firstName,
      lastName: rest.length ? rest[rest.length - 1] : undefined,
      city: address.city,
      state: address.state,
      zip: address.cep,
      externalId: order.customerId,
      userAgent: order.userAgent,
      fbc: order.fbc ?? fbcFromClickId(order.fbclid, order.createdAt),
      fbp: order.fbp,
    },
    customData: {
      currency: "BRL",
      value: value / 100,
      order_id: order.orderNumber,
      content_type: "product",
      content_ids: [order.sku],
      contents: [{ id: order.sku, quantity: order.quantity, item_price: order.unitPriceCents / 100 }],
      num_items: order.quantity,
    },
  });
}

const FINAL: OrderStatus[] = ["PAID", "REFUNDED", "CHARGEBACK", "CANCELLED"];

/** Consulta o gateway e aplica o status (pull). Throttled por lastCheckedAt. */
export async function syncOrder(order: Order, opts: { minIntervalMs?: number; source?: "poll" | "reconcile" } = {}) {
  const minInterval = opts.minIntervalMs ?? 5000;
  if (FINAL.includes(order.status) || !order.externalReference || !order.pixCopyPaste) return order;
  if (order.lastCheckedAt && Date.now() - new Date(order.lastCheckedAt).getTime() < minInterval) return order;

  await db.order.update({ where: { id: order.id }, data: { lastCheckedAt: new Date() } });
  try {
    const snap = await paymentService.getPaymentStatus(order.externalReference);
    if (snap && snap.status !== "PENDING") return (await applyPaymentSnapshot(order.id, snap, opts.source ?? "poll")).order ?? order;
  } catch (err) {
    await logOrderEvent(order.id, "poll_error", `Falha na consulta: ${err instanceof Error ? err.message : "erro"}`, undefined, "ERROR");
    return order;
  }

  // Sem confirmação e PIX vencido há mais de 10 min → expira localmente.
  if (order.status === "PIX_GENERATED" && order.pixExpiresAt && new Date(order.pixExpiresAt).getTime() < Date.now() - 10 * 60_000) {
    const moved = await db.order.updateMany({ where: { id: order.id, status: "PIX_GENERATED" }, data: { status: "EXPIRED", paymentStatus: "EXPIRED", expiredAt: new Date() } });
    if (moved.count) {
      await logOrderEvent(order.id, "status_change", "PIX_GENERATED → EXPIRED (prazo do PIX encerrado)", undefined, "EXPIRED");
      await emailOrderExpired(order.id).catch(() => {});
    }
    return (await db.order.findUnique({ where: { id: order.id } })) ?? order;
  }
  return order;
}

/** PIX vencido → novo código no MESMO pedido (mesmo número e valores congelados). */
export async function renewPix(orderId: string): Promise<Order> {
  let order = await db.order.findUniqueOrThrow({ where: { id: orderId } });
  const awaiting = (o: Order) => o.status === "PENDING" || o.status === "PIX_GENERATED";
  if (awaiting(order) && order.pixCopyPaste) {
    if (!order.pixExpiresAt || order.pixExpiresAt.getTime() > Date.now()) return order; // ainda válido
    order = await syncOrder(order, { minIntervalMs: 0, source: "poll" }); // pago no último segundo?
  }
  const expiredAwaiting = awaiting(order) && !!order.pixExpiresAt && order.pixExpiresAt.getTime() <= Date.now();
  if (order.status !== "EXPIRED" && order.status !== "FAILED" && !expiredAwaiting) return order;
  const attempt = (await db.payment.count({ where: { orderId } })) + 1;
  const ref = `${order.orderNumber}-R${attempt}-${randomInt(100, 1000)}`;
  const moved = await db.order.updateMany({
    where: { id: order.id, status: order.status, externalReference: order.externalReference },
    data: { status: "PENDING", paymentStatus: "PENDING", externalReference: ref, transactionId: null, pixCopyPaste: null, pixExpiresAt: null, paymentError: null, lastCheckedAt: null },
  });
  if (!moved.count) return db.order.findUniqueOrThrow({ where: { id: order.id } });
  await logOrderEvent(order.id, "pix_renewed", `Novo PIX solicitado pelo cliente (anterior: ${order.status})`, { previous_reference: order.externalReference, new_reference: ref }, "PENDING");
  return ensurePix(order.id);
}

/**
 * Reconciliação server-side de PIX pendentes (cron). Consulta o gateway, confirma
 * pagamentos que não chegaram por webhook e expira PIX vencidos (disparando e-mail).
 */
export async function reconcilePending(limit = 20) {
  const pending = await db.order.findMany({
    where: {
      status: "PIX_GENERATED",
      createdAt: { gte: new Date(Date.now() - 3 * 86_400_000) },
      OR: [{ lastCheckedAt: null }, { lastCheckedAt: { lt: new Date(Date.now() - 2 * 60_000) } }],
    },
    orderBy: { lastCheckedAt: { sort: "asc", nulls: "first" } },
    take: limit,
  });
  let paid = 0;
  let expired = 0;
  for (const o of pending) {
    const r = await syncOrder(o, { minIntervalMs: 0, source: "reconcile" });
    if (r?.status === "PAID") paid++;
    if (r?.status === "EXPIRED") expired++;
  }
  return { checked: pending.length, paid, expired };
}

// ───────────────────────── Acesso público ao pedido ─────────────────────────

export async function findOrderByAccess(orderNumber: string | null | undefined, token: string | null | undefined) {
  if (!orderNumber || !token || token.length < 16 || orderNumber.length > 40) return null;
  const order = await db.order.findUnique({ where: { orderNumber }, include: { customer: { select: { name: true } } } });
  if (!order || !safeEqual(order.accessToken, token)) return null;
  return order;
}

type AccessOrder = NonNullable<Awaited<ReturnType<typeof findOrderByAccess>>>;

export function toPublicOrder(o: AccessOrder): PublicOrder {
  const awaiting = o.status === "PENDING" || o.status === "PIX_GENERATED";
  return {
    orderNumber: o.orderNumber!,
    status: o.status,
    totalCents: o.totalCents,
    subtotalCents: o.subtotalCents,
    discountCents: o.discountCents,
    shippingCents: o.shippingCents,
    productName: o.productName,
    size: o.size,
    quantity: o.quantity,
    unitPriceCents: o.unitPriceCents,
    pixCopyPaste: awaiting ? o.pixCopyPaste : null,
    pixExpiresAt: o.pixExpiresAt?.toISOString() ?? null,
    paidAt: o.paidAt?.toISOString() ?? null,
    createdAt: o.createdAt.toISOString(),
    metaEventId: isPaidStatus(o.status) ? o.metaEventId : null,
    customerFirstName: o.customer.name.split(/\s+/)[0],
    pixError: awaiting && !o.pixCopyPaste && Boolean(o.paymentError),
    currency: "BRL",
  };
}
