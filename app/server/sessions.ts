import "server-only";
import { db } from "@/app/lib/db";
import type { OnlineRow } from "@/app/types/admin";

export type { OnlineRow };

const cut = (v: string | null | undefined, n = 200) => (v ? String(v).slice(0, n) : null);

/** Marca a sessão como ativa agora (heartbeat do "online ao vivo"). */
export async function touchSession(id: string, visitorId: string, path: string | null, device: string | null, referrer: string | null): Promise<void> {
  const sid = id.slice(0, 64);
  await db.visitorSession
    .upsert({
      where: { id: sid },
      update: { lastSeenAt: new Date(), path: cut(path, 200), pageViews: { increment: 1 } },
      create: { id: sid, visitorId: visitorId.slice(0, 64), path: cut(path, 200), device: cut(device, 40), referrer: cut(referrer, 300) },
    })
    .catch(() => {});
}

// Heartbeat é a cada 25s. Janela de 60s = só quem está realmente no site agora
// (tolera 1 ping perdido), batendo com o status "ativo agora".
const ONLINE_WINDOW_MS = 60_000;

/** Extrai o número do pedido de uma URL /pedido/NUMERO (ignora query e barras). */
function orderNumberFromPath(path: string | null): string | null {
  if (!path) return null;
  const m = path.match(/^\/pedido\/([^/?#]+)/);
  if (!m) return null;
  try {
    return decodeURIComponent(m[1]);
  } catch {
    return m[1];
  }
}

/** Visitantes realmente ativos agora (atividade no último minuto). */
export async function onlineNow(limit = 100): Promise<{ count: number; rows: OnlineRow[]; ok: boolean }> {
  try {
    const since = new Date(Date.now() - ONLINE_WINDOW_MS);
    const [count, sessions] = await Promise.all([
      db.visitorSession.count({ where: { lastSeenAt: { gte: since } } }),
      db.visitorSession.findMany({ where: { lastSeenAt: { gte: since } }, orderBy: { lastSeenAt: "desc" }, take: limit }),
    ]);

    // Cruza quem está na tela do pedido com o status real daquele pedido.
    const orderNumbers = Array.from(new Set(sessions.map((s) => orderNumberFromPath(s.path)).filter((n): n is string => !!n)));
    const statusByOrder = new Map<string, string>();
    if (orderNumbers.length > 0) {
      const orders = await db.order.findMany({ where: { orderNumber: { in: orderNumbers } }, select: { orderNumber: true, status: true } }).catch(() => []);
      for (const o of orders) if (o.orderNumber) statusByOrder.set(o.orderNumber, o.status);
    }

    const rows: OnlineRow[] = sessions.map((s) => {
      const on = orderNumberFromPath(s.path);
      return {
        path: s.path,
        device: s.device,
        lastSeenAt: s.lastSeenAt.toISOString(),
        firstSeenAt: s.firstSeenAt.toISOString(),
        orderStatus: on ? statusByOrder.get(on) ?? null : undefined,
      };
    });
    return { count, rows, ok: true };
  } catch {
    return { count: 0, rows: [], ok: false };
  }
}

export async function onlineCount(): Promise<number> {
  try {
    return await db.visitorSession.count({ where: { lastSeenAt: { gte: new Date(Date.now() - ONLINE_WINDOW_MS) } } });
  } catch {
    return 0;
  }
}
