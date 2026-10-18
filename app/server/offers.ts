import "server-only";
import { db } from "@/app/lib/db";

export type PublicOffer = { id: string; title: string; description: string | null; priceCents: number; compareAtPriceCents: number | null; imageUrl: string | null };
export type AdminOffer = { id: string; title: string; description: string | null; priceCents: number; compareAtPriceCents: number | null; imageId: string | null; active: boolean };

type Row = { id: string; title: string; description: string | null; priceCents: number; compareAtPriceCents: number | null; imageId: string | null; active: boolean };

const toPublic = (o: Row): PublicOffer => ({ id: o.id, title: o.title, description: o.description, priceCents: o.priceCents, compareAtPriceCents: o.compareAtPriceCents, imageUrl: o.imageId ? `/media/${o.imageId}` : null });
const toAdmin = (o: Row): AdminOffer => ({ id: o.id, title: o.title, description: o.description, priceCents: o.priceCents, compareAtPriceCents: o.compareAtPriceCents, imageId: o.imageId, active: o.active });

export const MAX_BUMPS = 3;

// ───────────── Leitura pública (checkout / pedido) ─────────────

export async function listActiveBumps(): Promise<PublicOffer[]> {
  try {
    const rows = await db.orderBump.findMany({ where: { active: true }, orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }], take: MAX_BUMPS });
    return rows.map(toPublic);
  } catch {
    return [];
  }
}

export async function getActiveUpsell(): Promise<PublicOffer | null> {
  try {
    const o = await db.upsell.findFirst({ where: { active: true }, orderBy: { createdAt: "asc" } });
    return o ? toPublic(o) : null;
  } catch {
    return null;
  }
}

export async function getBumpsByIds(ids: string[]) {
  if (!ids.length) return [];
  try {
    return await db.orderBump.findMany({ where: { id: { in: ids.slice(0, MAX_BUMPS) }, active: true } });
  } catch {
    return [];
  }
}

export async function getUpsellById(id: string) {
  try {
    return await db.upsell.findUnique({ where: { id } });
  } catch {
    return null;
  }
}

// ───────────── Admin ─────────────

export async function listBumpsAdmin(): Promise<AdminOffer[]> {
  try {
    return (await db.orderBump.findMany({ orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] })).map(toAdmin);
  } catch {
    return [];
  }
}

export async function listUpsellsAdmin(): Promise<AdminOffer[]> {
  try {
    return (await db.upsell.findMany({ orderBy: { createdAt: "asc" } })).map(toAdmin);
  } catch {
    return [];
  }
}

export async function getOfferAdmin(type: "bump" | "upsell", id: string): Promise<AdminOffer | null> {
  try {
    const o = type === "bump" ? await db.orderBump.findUnique({ where: { id } }) : await db.upsell.findUnique({ where: { id } });
    return o ? toAdmin(o) : null;
  } catch {
    return null;
  }
}

export type OfferEdit = { title: string; description?: string | null; priceCents: number; compareAtPriceCents?: number | null; imageId?: string | null; active: boolean };

export async function createOffer(type: "bump" | "upsell", edit: OfferEdit): Promise<{ id: string } | { error: string }> {
  if (type === "bump") {
    const count = await db.orderBump.count().catch(() => 0);
    if (count >= MAX_BUMPS) return { error: `Limite de ${MAX_BUMPS} order bumps atingido.` };
  }
  const data = { title: edit.title.slice(0, 160), description: edit.description ?? null, priceCents: edit.priceCents, compareAtPriceCents: edit.compareAtPriceCents ?? null, imageId: edit.imageId ?? null, active: edit.active };
  const row = type === "bump" ? await db.orderBump.create({ data }) : await db.upsell.create({ data });
  return { id: row.id };
}

export async function saveOffer(type: "bump" | "upsell", id: string, edit: OfferEdit): Promise<void> {
  const data = { title: edit.title.slice(0, 160), description: edit.description ?? null, priceCents: edit.priceCents, compareAtPriceCents: edit.compareAtPriceCents ?? null, imageId: edit.imageId ?? null, active: edit.active };
  if (type === "bump") await db.orderBump.update({ where: { id }, data });
  else await db.upsell.update({ where: { id }, data });
}

export async function deleteOffer(type: "bump" | "upsell", id: string): Promise<void> {
  if (type === "bump") await db.orderBump.delete({ where: { id } }).catch(() => {});
  else await db.upsell.delete({ where: { id } }).catch(() => {});
}
