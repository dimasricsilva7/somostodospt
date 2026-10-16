import "server-only";
import type { FulfillmentStatus } from "@prisma/client";
import { db } from "@/app/lib/db";

export type AdminOrderRow = {
  orderNumber: string;
  createdAt: string;
  status: string;
  fulfillmentStatus: string;
  customerName: string;
  productName: string;
  size: string;
  quantity: number;
  totalCents: number;
  paidAt: string | null;
};

export async function listOrders(limit = 80): Promise<{ rows: AdminOrderRow[]; ok: boolean }> {
  try {
    const orders = await db.order.findMany({
      orderBy: { createdAt: "desc" },
      take: limit,
      select: {
        orderNumber: true,
        createdAt: true,
        status: true,
        fulfillmentStatus: true,
        customerSnapshot: true,
        productName: true,
        size: true,
        quantity: true,
        totalCents: true,
        paidAt: true,
      },
    });
    const rows = orders.map((o) => ({
      orderNumber: o.orderNumber ?? "—",
      createdAt: o.createdAt.toISOString(),
      status: o.status,
      fulfillmentStatus: o.fulfillmentStatus,
      customerName: (o.customerSnapshot as { name?: string })?.name ?? "—",
      productName: o.productName,
      size: o.size,
      quantity: o.quantity,
      totalCents: o.totalCents,
      paidAt: o.paidAt?.toISOString() ?? null,
    }));
    return { rows, ok: true };
  } catch {
    return { rows: [], ok: false };
  }
}

export async function getOrderAdmin(orderNumber: string) {
  try {
    const order = await db.order.findUnique({
      where: { orderNumber },
      include: {
        customer: { select: { email: true, phone: true } },
        events: { orderBy: { createdAt: "desc" }, take: 40 },
      },
    });
    return order;
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
