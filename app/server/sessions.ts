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

/** Visitantes ativos nos últimos `minutes` minutos. */
export async function onlineNow(minutes = 3, limit = 100): Promise<{ count: number; rows: OnlineRow[]; ok: boolean }> {
  try {
    const since = new Date(Date.now() - minutes * 60_000);
    const [count, sessions] = await Promise.all([
      db.visitorSession.count({ where: { lastSeenAt: { gte: since } } }),
      db.visitorSession.findMany({ where: { lastSeenAt: { gte: since } }, orderBy: { lastSeenAt: "desc" }, take: limit }),
    ]);
    return { count, rows: sessions.map((s) => ({ path: s.path, device: s.device, lastSeenAt: s.lastSeenAt.toISOString(), firstSeenAt: s.firstSeenAt.toISOString() })), ok: true };
  } catch {
    return { count: 0, rows: [], ok: false };
  }
}

export async function onlineCount(minutes = 3): Promise<number> {
  try {
    return await db.visitorSession.count({ where: { lastSeenAt: { gte: new Date(Date.now() - minutes * 60_000) } } });
  } catch {
    return 0;
  }
}
