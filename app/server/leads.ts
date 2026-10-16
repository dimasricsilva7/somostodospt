import "server-only";
import { db } from "@/app/lib/db";

export type LeadInput = {
  clientKey: string;
  name?: string | null;
  email?: string | null;
  phone?: string | null;
  productSlug?: string | null;
  productName?: string | null;
  size?: string | null;
  totalCents?: number;
};

const cut = (v: string | null | undefined, n = 160) => (v ? String(v).slice(0, n) : null);

/** Registra/atualiza o lead do checkout (contato preenchido antes de pagar). */
export async function upsertLead(input: LeadInput): Promise<void> {
  const data = {
    name: cut(input.name, 120),
    email: cut(input.email, 160),
    phone: cut(input.phone, 40),
    productSlug: cut(input.productSlug, 80),
    productName: cut(input.productName, 160),
    size: cut(input.size, 10),
    totalCents: Number.isFinite(input.totalCents) ? Math.max(0, Math.round(input.totalCents as number)) : 0,
  };
  await db.checkoutLead
    .upsert({ where: { clientKey: input.clientKey.slice(0, 64) }, update: data, create: { clientKey: input.clientKey.slice(0, 64), ...data } })
    .catch(() => {});
}

/** Liga o lead ao pedido quando ele converte (deixa de ser abandonado). */
export async function linkLeadToOrder(clientKey: string | null | undefined, orderId: string): Promise<void> {
  if (!clientKey) return;
  await db.checkoutLead.update({ where: { clientKey: clientKey.slice(0, 64) }, data: { orderId } }).catch(() => {});
}

export type AbandonedLead = {
  email: string | null;
  phone: string | null;
  name: string | null;
  productName: string | null;
  size: string | null;
  totalCents: number;
  updatedAt: string;
};

/** Leads sem pedido, parados há mais de `minMinutes` (abandonados). */
export async function listAbandoned(minMinutes = 15, limit = 80): Promise<{ rows: AbandonedLead[]; ok: boolean }> {
  try {
    const leads = await db.checkoutLead.findMany({
      where: {
        orderId: null,
        updatedAt: { lt: new Date(Date.now() - minMinutes * 60_000) },
        OR: [{ email: { not: null } }, { phone: { not: null } }],
      },
      orderBy: { updatedAt: "desc" },
      take: limit,
    });
    return {
      rows: leads.map((l) => ({ email: l.email, phone: l.phone, name: l.name, productName: l.productName, size: l.size, totalCents: l.totalCents, updatedAt: l.updatedAt.toISOString() })),
      ok: true,
    };
  } catch {
    return { rows: [], ok: false };
  }
}

export async function abandonedCount(minMinutes = 15): Promise<number> {
  try {
    return await db.checkoutLead.count({
      where: { orderId: null, updatedAt: { lt: new Date(Date.now() - minMinutes * 60_000) }, OR: [{ email: { not: null } }, { phone: { not: null } }] },
    });
  } catch {
    return 0;
  }
}
