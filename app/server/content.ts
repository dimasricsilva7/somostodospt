import "server-only";
import { Prisma } from "@prisma/client";
import { db } from "@/app/lib/db";
import { log } from "@/app/lib/log";
import { catalog, productPriceCents, type CatalogProduct } from "@/app/config/catalog";
import type { ProductMedia } from "@/app/config/product";
import type { SiteTexts } from "@/app/types/content";

export type { SiteTexts };

// ───────────────────────── Textos editáveis da landing ─────────────────────────

export const DEFAULT_TEXTS: SiteTexts = {
  heroEyebrow: "COLEÇÃO SOMOS TODOS PT",
  heroTitle: "Vista suas ideias. Escolha o seu modelo.",
  heroLead: "Camisetas vermelhas com estampas marcantes para quem quer expressar sua identidade por meio do que veste. Escolha o modelo, o tamanho e pague com PIX.",
  heroStatement: "Pagamento por PIX com confirmação automática e entrega para todo o Brasil.",
  collectionTitle: "Escolha a sua camiseta.",
  collectionSubtitle: "Cada modelo tem sua estampa. Selecione o tamanho no card e finalize com PIX.",
};

export async function getTexts(): Promise<SiteTexts> {
  try {
    const row = await db.siteContent.findUnique({ where: { key: "texts" } });
    const saved = (row?.value ?? {}) as Partial<SiteTexts>;
    return { ...DEFAULT_TEXTS, ...saved };
  } catch {
    return DEFAULT_TEXTS;
  }
}

export async function saveTexts(partial: Partial<SiteTexts>): Promise<void> {
  const current = await getTexts();
  const value = { ...current, ...partial } as Prisma.InputJsonValue;
  await db.siteContent.upsert({ where: { key: "texts" }, update: { value }, create: { key: "texts", value } });
}

// ───────────────────────── Catálogo mesclado (código + banco) ─────────────────────────

function applyOverride(base: CatalogProduct, o: Awaited<ReturnType<typeof db.productContent.findMany>>[number] | undefined): CatalogProduct {
  if (!o) return base;
  let media = base.media;
  if (o.mainImageId) {
    const name = o.name || base.name;
    const gallery: ProductMedia[] = (Array.isArray(o.galleryIds) ? (o.galleryIds as string[]) : []).map((id, i) => ({
      id: `db-${i}`,
      label: name,
      alt: name,
      src: `/media/${id}`,
      aspect: "square",
    }));
    media = [
      { id: "db-main", label: name, alt: name, src: `/media/${o.mainImageId}`, aspect: "square" },
      ...gallery,
    ];
  }
  return {
    ...base,
    name: o.name ?? base.name,
    description: o.description ?? base.description,
    priceInCents: o.priceCents ?? base.priceInCents,
    compareAtPriceInCents: o.compareAtPriceCents ?? base.compareAtPriceInCents,
    sizes: Array.isArray(o.sizes) ? (o.sizes as string[]) : base.sizes,
    active: typeof o.active === "boolean" ? o.active : base.active,
    media,
  };
}

export async function mergedCatalog(): Promise<CatalogProduct[]> {
  try {
    const overrides = await db.productContent.findMany();
    const map = new Map(overrides.map((o) => [o.slug, o]));
    const merged = catalog.map((p) => applyOverride(p, map.get(p.slug)));
    return merged.sort((a, b) => {
      const sa = map.get(a.slug)?.sortOrder ?? 0;
      const sb = map.get(b.slug)?.sortOrder ?? 0;
      return sa - sb;
    });
  } catch (err) {
    log.error("content", "falha ao mesclar catálogo; usando padrão do código", { error: err instanceof Error ? err.message : String(err) });
    return catalog;
  }
}

export async function mergedProduct(slug: string | null | undefined): Promise<CatalogProduct | undefined> {
  if (!slug) return undefined;
  const base = catalog.find((p) => p.slug === slug);
  if (!base) return undefined;
  try {
    const o = await db.productContent.findUnique({ where: { slug } });
    return applyOverride(base, o ?? undefined);
  } catch {
    return base;
  }
}

/** Produto vendável mesclado: ativo, com arte e preço. Usado pelo checkout/servidor. */
export async function sellableMerged(slug: string | null | undefined): Promise<CatalogProduct | undefined> {
  const p = await mergedProduct(slug);
  if (!p || !p.active || p.media.length === 0 || productPriceCents(p) === undefined) return undefined;
  return p;
}

// ───────────────────────── Edição de produtos (admin) ─────────────────────────

export type ProductEdit = {
  name?: string;
  description?: string;
  priceCents?: number | null;
  compareAtPriceCents?: number | null;
  sizes?: string[];
  active?: boolean;
  mainImageId?: string | null;
  galleryIds?: string[];
  sortOrder?: number;
};

export async function getProductOverride(slug: string) {
  try {
    return await db.productContent.findUnique({ where: { slug } });
  } catch {
    return null;
  }
}

export async function saveProductContent(slug: string, edit: ProductEdit): Promise<void> {
  const data = {
    name: edit.name ?? null,
    description: edit.description ?? null,
    priceCents: edit.priceCents ?? null,
    compareAtPriceCents: edit.compareAtPriceCents ?? null,
    sizes: (edit.sizes ?? undefined) as Prisma.InputJsonValue | undefined,
    active: edit.active ?? null,
    mainImageId: edit.mainImageId ?? null,
    galleryIds: (edit.galleryIds ?? undefined) as Prisma.InputJsonValue | undefined,
    sortOrder: edit.sortOrder ?? null,
  };
  await db.productContent.upsert({ where: { slug }, update: data, create: { slug, ...data } });
}

// ───────────────────────── Mídia (bytes no banco) ─────────────────────────

export async function createMediaAsset(filename: string, mimeType: string, buffer: Buffer): Promise<string> {
  const data = new Uint8Array(buffer);
  const asset = await db.mediaAsset.create({ data: { filename: filename.slice(0, 200), mimeType, data, size: data.length } });
  return asset.id;
}

export async function getMediaAsset(id: string): Promise<{ data: Buffer; mimeType: string } | null> {
  try {
    const asset = await db.mediaAsset.findUnique({ where: { id } });
    if (!asset) return null;
    return { data: Buffer.from(asset.data), mimeType: asset.mimeType };
  } catch {
    return null;
  }
}
