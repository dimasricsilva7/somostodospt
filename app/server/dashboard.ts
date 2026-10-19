import "server-only";
import { db } from "@/app/lib/db";
import { listOrders } from "@/app/server/admin-orders";
import { listAbandoned } from "@/app/server/leads";
import { onlineNow } from "@/app/server/sessions";
import type { DashboardData, DashboardPeriod, ModelRank } from "@/app/types/admin";

const PAID = "PAID";

/** Ranking de modelos por unidades geradas × pagas (exclui order bumps). */
async function rankModels(createdAt: { gte?: Date; lt?: Date } | undefined): Promise<ModelRank[]> {
  try {
    const items = await db.orderItem.findMany({
      where: {
        NOT: { productSlug: { startsWith: "bump-" } },
        ...(createdAt ? { order: { createdAt } } : {}),
      },
      select: {
        productSlug: true,
        productName: true,
        quantity: true,
        unitPriceCents: true,
        orderId: true,
        order: { select: { status: true } },
      },
    });

    const map = new Map<string, ModelRank & { _genOrders: Set<string>; _paidOrders: Set<string> }>();
    for (const it of items) {
      const key = it.productSlug;
      let m = map.get(key);
      if (!m) {
        m = { slug: it.productSlug, name: it.productName, generatedUnits: 0, generatedOrders: 0, paidUnits: 0, paidOrders: 0, paidRevenueCents: 0, _genOrders: new Set(), _paidOrders: new Set() };
        map.set(key, m);
      }
      m.name = it.productName || m.name;
      m.generatedUnits += it.quantity;
      m._genOrders.add(it.orderId);
      if (it.order.status === PAID) {
        m.paidUnits += it.quantity;
        m._paidOrders.add(it.orderId);
        m.paidRevenueCents += it.unitPriceCents * it.quantity;
      }
    }

    return Array.from(map.values())
      .map((m) => ({
        slug: m.slug,
        name: m.name,
        generatedUnits: m.generatedUnits,
        generatedOrders: m._genOrders.size,
        paidUnits: m.paidUnits,
        paidOrders: m._paidOrders.size,
        paidRevenueCents: m.paidRevenueCents,
      }))
      .sort((a, b) => b.paidUnits - a.paidUnits || b.generatedUnits - a.generatedUnits);
  } catch {
    return [];
  }
}

const DAY = 86_400_000;
const BRT_OFFSET = -3 * 3_600_000; // America/Sao_Paulo (UTC-3, sem horário de verão)

/** Intervalo [since, until) no fuso de Brasília para o período escolhido. */
function periodRange(period: DashboardPeriod): { since?: Date; until?: Date } {
  const now = Date.now();
  const nowBrt = new Date(now + BRT_OFFSET);
  const startTodayUtc = Date.UTC(nowBrt.getUTCFullYear(), nowBrt.getUTCMonth(), nowBrt.getUTCDate()) - BRT_OFFSET;
  switch (period) {
    case "today":
      return { since: new Date(startTodayUtc) };
    case "yesterday":
      return { since: new Date(startTodayUtc - DAY), until: new Date(startTodayUtc) };
    case "7d":
      return { since: new Date(now - 7 * DAY) };
    case "30d":
      return { since: new Date(now - 30 * DAY) };
    case "all":
    default:
      return {};
  }
}

export async function getDashboardData(period: DashboardPeriod = "today"): Promise<DashboardData> {
  const range = periodRange(period);
  const createdAt = range.since || range.until ? { ...(range.since ? { gte: range.since } : {}), ...(range.until ? { lt: range.until } : {}) } : undefined;
  const whereInPeriod = createdAt ? { createdAt } : {};

  const [orders, abandoned, online, revenue, counts, models] = await Promise.all([
    listOrders({ since: range.since, until: range.until }),
    listAbandoned(),
    onlineNow(),
    db.order.aggregate({ _sum: { totalCents: true }, where: { status: "PAID", ...whereInPeriod } }).catch(() => ({ _sum: { totalCents: 0 } })),
    (async () => {
      try {
        const [total, paid, pending] = await Promise.all([
          db.order.count({ where: whereInPeriod }),
          db.order.count({ where: { status: "PAID", ...whereInPeriod } }),
          db.order.count({ where: { status: { in: ["PENDING", "PIX_GENERATED"] }, ...whereInPeriod } }),
        ]);
        return { total, paid, pending, ok: true };
      } catch {
        return { total: 0, paid: 0, pending: 0, ok: false };
      }
    })(),
    rankModels(createdAt),
  ]);

  return {
    period,
    stats: { revenueCents: revenue._sum.totalCents ?? 0, total: counts.total, paid: counts.paid, pending: counts.pending },
    orders: orders.rows,
    abandoned: abandoned.rows,
    online: { count: online.count, rows: online.rows },
    models,
    ok: counts.ok && orders.ok,
  };
}
