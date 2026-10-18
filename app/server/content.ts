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
  paymentProcessorName: "GBK LTDA",
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

/** Converte um modelo criado no admin (CustomProduct) para o formato do catálogo. */
function customToCatalog(c: Awaited<ReturnType<typeof db.customProduct.findMany>>[number]): CatalogProduct {
  const name = c.name;
  let media: ProductMedia[] = [];
  if (c.mainImageId) {
    const gallery = (Array.isArray(c.galleryIds) ? (c.galleryIds as string[]) : []).map((id, i) => ({ id: `db-${i}`, label: name, alt: name, src: `/media/${id}`, aspect: "square" as const }));
    media = [{ id: "db-main", label: name, alt: name, src: `/media/${c.mainImageId}`, aspect: "square" as const }, ...gallery];
  }
  return {
    slug: c.slug,
    name,
    shortName: name,
    sku: `CUSTOM-${c.slug.toUpperCase().replace(/[^A-Z0-9]/g, "-").slice(0, 40)}`,
    description: c.description ?? "",
    priceInCents: c.priceCents ?? undefined,
    compareAtPriceInCents: c.compareAtPriceCents ?? undefined,
    sizes: Array.isArray(c.sizes) ? (c.sizes as string[]) : [],
    media,
    active: c.active,
  };
}

export async function mergedCatalog(): Promise<CatalogProduct[]> {
  try {
    const [overrides, customs] = await Promise.all([db.productContent.findMany(), db.customProduct.findMany()]);
    const map = new Map(overrides.map((o) => [o.slug, o]));
    const entries = [
      ...catalog.map((p) => ({ product: applyOverride(p, map.get(p.slug)), sort: map.get(p.slug)?.sortOrder ?? 0 })),
      ...customs.map((c) => ({ product: customToCatalog(c), sort: c.sortOrder ?? 100 })),
    ];
    return entries.sort((a, b) => a.sort - b.sort).map((e) => e.product);
  } catch (err) {
    log.error("content", "falha ao mesclar catálogo; usando padrão do código", { error: err instanceof Error ? err.message : String(err) });
    return catalog;
  }
}

export async function mergedProduct(slug: string | null | undefined): Promise<CatalogProduct | undefined> {
  if (!slug) return undefined;
  const base = catalog.find((p) => p.slug === slug);
  if (base) {
    try {
      const o = await db.productContent.findUnique({ where: { slug } });
      return applyOverride(base, o ?? undefined);
    } catch {
      return base;
    }
  }
  try {
    const c = await db.customProduct.findUnique({ where: { slug } });
    return c ? customToCatalog(c) : undefined;
  } catch {
    return undefined;
  }
}

// ───────────────────────── Modelos personalizados (admin) ─────────────────────────

export async function getCustomProduct(slug: string) {
  try {
    return await db.customProduct.findUnique({ where: { slug } });
  } catch {
    return null;
  }
}

/** true se o slug é um modelo criado no admin (não existe no código). */
export function isConfigSlug(slug: string): boolean {
  return catalog.some((p) => p.slug === slug);
}

function slugify(name: string): string {
  return name.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60);
}

export async function createCustomProduct(name: string, edit: ProductEdit): Promise<{ slug: string }> {
  const base = slugify(name) || `modelo-${Date.now().toString(36)}`;
  let slug = base;
  let n = 1;
  // Evita colisão com slugs do código e de outros custom
  while (isConfigSlug(slug) || (await db.customProduct.findUnique({ where: { slug } }).catch(() => null))) {
    slug = `${base}-${++n}`;
  }
  await db.customProduct.create({
    data: {
      slug,
      name: name.slice(0, 160),
      description: edit.description ?? null,
      priceCents: edit.priceCents ?? null,
      compareAtPriceCents: edit.compareAtPriceCents ?? null,
      sizes: (edit.sizes ?? undefined) as Prisma.InputJsonValue | undefined,
      active: edit.active ?? false,
      mainImageId: edit.mainImageId ?? null,
      galleryIds: (edit.galleryIds ?? undefined) as Prisma.InputJsonValue | undefined,
    },
  });
  return { slug };
}

export async function saveCustomProduct(slug: string, edit: ProductEdit & { name?: string }): Promise<void> {
  await db.customProduct.update({
    where: { slug },
    data: {
      ...(edit.name ? { name: edit.name.slice(0, 160) } : {}),
      description: edit.description ?? null,
      priceCents: edit.priceCents ?? null,
      compareAtPriceCents: edit.compareAtPriceCents ?? null,
      sizes: (edit.sizes ?? undefined) as Prisma.InputJsonValue | undefined,
      active: edit.active ?? false,
      mainImageId: edit.mainImageId ?? null,
      galleryIds: (edit.galleryIds ?? undefined) as Prisma.InputJsonValue | undefined,
    },
  });
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
