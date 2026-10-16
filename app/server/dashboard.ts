import "server-only";
import { db } from "@/app/lib/db";
import { listOrders } from "@/app/server/admin-orders";
import { listAbandoned } from "@/app/server/leads";
import { onlineNow } from "@/app/server/sessions";
import type { DashboardData } from "@/app/types/admin";

export async function getDashboardData(): Promise<DashboardData> {
  const [orders, abandoned, online, revenue, counts] = await Promise.all([
    listOrders(),
    listAbandoned(),
    onlineNow(),
    db.order.aggregate({ _sum: { totalCents: true }, where: { status: "PAID" } }).catch(() => ({ _sum: { totalCents: 0 } })),
    (async () => {
      try {
        const [total, paid, pending] = await Promise.all([
          db.order.count(),
          db.order.count({ where: { status: "PAID" } }),
          db.order.count({ where: { status: { in: ["PENDING", "PIX_GENERATED"] } } }),
        ]);
        return { total, paid, pending, ok: true };
      } catch {
        return { total: 0, paid: 0, pending: 0, ok: false };
      }
    })(),
  ]);

  return {
    stats: { revenueCents: revenue._sum.totalCents ?? 0, total: counts.total, paid: counts.paid, pending: counts.pending },
    orders: orders.rows,
    abandoned: abandoned.rows,
    online: { count: online.count, rows: online.rows },
    ok: counts.ok && orders.ok,
  };
}
