import "server-only";
import type { FulfillmentStatus } from "@prisma/client";
import { db } from "@/app/lib/db";
import type { AdminOrderRow } from "@/app/types/admin";

export type { AdminOrderRow };

export async function listOrders(opts: { limit?: number; since?: Date; until?: Date } = {}): Promise<{ rows: AdminOrderRow[]; ok: boolean }> {
  try {
    const where = opts.since || opts.until ? { createdAt: { ...(opts.since ? { gte: opts.since } : {}), ...(opts.until ? { lt: opts.until } : {}) } } : {};
    const orders = await db.order.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: opts.limit ?? 200,
      select: {
        orderNumber: true,
        createdAt: true,
        status: true,
        fulfillmentStatus: true,
        customerSnapshot: true,
        shippingAddress: true,
        productName: true,
        size: true,
        quantity: true,
        totalCents: true,
        paidAt: true,
      },
    });
    const rows = orders.map((o) => {
      const snap = (o.customerSnapshot ?? {}) as { name?: string; email?: string; phone?: string };
      const addr = (o.shippingAddress ?? {}) as { city?: string; state?: string };
      return {
        orderNumber: o.orderNumber ?? "—",
        createdAt: o.createdAt.toISOString(),
        status: o.status,
        fulfillmentStatus: o.fulfillmentStatus,
        customerName: snap.name ?? "—",
        customerEmail: snap.email ?? "",
        customerPhone: snap.phone ?? "",
        city: addr.city ?? "",
        state: addr.state ?? "",
        productName: o.productName,
        size: o.size,
        quantity: o.quantity,
        totalCents: o.totalCents,
        paidAt: o.paidAt?.toISOString() ?? null,
      };
    });
    return { rows, ok: true };
  } catch {
    return { rows: [], ok: false };
  }
}

export type LinkedOrder = { orderNumber: string | null; productName: string; totalCents: number; status: string };

export async function getOrderAdmin(orderNumber: string) {
  try {
    const order = await db.order.findUnique({
      where: { orderNumber },
      include: {
        customer: { select: { email: true, phone: true } },
        events: { orderBy: { createdAt: "desc" }, take: 40 },
        items: { orderBy: { createdAt: "asc" } },
      },
    });
    if (!order) return null;

    // Pedidos vinculados por upsell (um upsell aceito gera um pedido filho).
    const [children, parent] = await Promise.all([
      db.order.findMany({
        where: { parentOrderId: order.id },
        orderBy: { createdAt: "asc" },
        select: { orderNumber: true, productName: true, totalCents: true, status: true },
      }),
      order.parentOrderId
        ? db.order.findUnique({ where: { id: order.parentOrderId }, select: { orderNumber: true, productName: true, totalCents: true, status: true } })
        : Promise.resolve(null),
    ]);

    return Object.assign(order, {
      upsellChildren: children as LinkedOrder[],
      parentOrder: (parent ?? null) as LinkedOrder | null,
    });
  } catch {
    return null;
  }
}

export async function updateFulfillment(orderNumber: string, fulfillmentStatus: FulfillmentStatus, trackingCode: string | null) {
  const order = await db.order.update({
    where: { orderNumber },
    data: {
      fulfillmentStatus,
      trackingCode: trackingCode?.trim() ? trackingCode.trim().slice(0, 80) : null,
    },
    select: { id: true },
  });
  await db.paymentEvent
    .create({ data: { orderId: order.id, type: "fulfillment", message: `Entrega: ${fulfillmentStatus}${trackingCode?.trim() ? ` · rastreio ${trackingCode.trim()}` : ""} (admin)`, status: fulfillmentStatus } })
    .catch(() => {});
}
