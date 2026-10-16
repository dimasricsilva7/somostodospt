/**
 * Catálogo da coleção Somos Todos PT — 6 modelos de camiseta.
 *
 * Fonte da verdade dos produtos vendáveis. Cada modelo é um produto distinto com
 * SKU, imagens próprias, tamanhos e preço. O servidor sempre revalida o produto,
 * a disponibilidade e o preço a partir daqui — nunca confia no navegador.
 *
 * REGRA DE CONTEÚDO: não inventar artes. Só o Modelo 01 tem imagem real no projeto;
 * os modelos 02–06 ficam `active: false` ("em breve") até o responsável enviar as artes.
 * O campo `neededImage` indica exatamente o arquivo a ser fornecido.
 */
import { product, type ProductMedia } from "./product";

export const DEFAULT_PRICE_CENTS = 4990; // R$ 49,90 (informado em 2026-10-16)
export const ALL_SIZES = ["PP", "P", "M", "G", "GG", "XG", "XXG", "XXXG"] as const;

export type CatalogProduct = {
  slug: string;
  name: string;
  shortName: string;
  sku: string;
  description: string;
  priceInCents?: number; // undefined → usa DEFAULT_PRICE_CENTS
  compareAtPriceInCents?: number;
  /** Tamanhos realmente disponíveis deste modelo (configurável por produto). */
  sizes: string[];
  /** Imagens individuais da estampa (sem mosaicos/colagens). Vazio = sem arte ainda. */
  media: ProductMedia[];
  active: boolean;
  /** Arquivo de arte que falta para ativar o modelo (02–06). */
  neededImage?: string;
};

export const catalog: CatalogProduct[] = [
  {
    slug: "somos-todos-pt",
    name: "Camiseta Somos Todos PT",
    shortName: "Somos Todos PT",
    sku: "STPT-01-SOMOS-TODOS-PT",
    description: "Estampa com retrato do Lula e a mensagem “O Brasil de Novo com o Povo”.",
    priceInCents: product.priceInCents,
    compareAtPriceInCents: product.compareAtPriceInCents,
    sizes: [...ALL_SIZES],
    media: [...product.media],
    active: true,
  },
  {
    slug: "o-voto-e-secreto",
    name: "Camiseta O Voto é Secreto",
    shortName: "O Voto é Secreto",
    sku: "STPT-02-VOTO-SECRETO",
    description: "Modelo 02 da coleção.",
    sizes: [...ALL_SIZES],
    media: [],
    active: false,
    neededImage: "public/images/products/modelo-02-o-voto-e-secreto.webp (frente da estampa)",
  },
  {
    slug: "mais-democracia-mais-direitos-mais-brasil",
    name: "Camiseta Mais Democracia, Mais Direitos, Mais Brasil",
    shortName: "Mais Democracia, Mais Direitos, Mais Brasil",
    sku: "STPT-03-MAIS-DEMOCRACIA",
    description: "Modelo 03 da coleção.",
    sizes: [...ALL_SIZES],
    media: [],
    active: false,
    neededImage: "public/images/products/modelo-03-mais-democracia.webp (frente da estampa)",
  },
  {
    slug: "sem-anistia-pra-golpista",
    name: "Camiseta Sem Anistia pra Golpista",
    shortName: "Sem Anistia pra Golpista",
    sku: "STPT-04-SEM-ANISTIA",
    description: "Modelo 04 da coleção.",
    sizes: [...ALL_SIZES],
    media: [],
    active: false,
    neededImage: "public/images/products/modelo-04-sem-anistia.webp (frente da estampa)",
  },
  {
    slug: "lula-brilha-uma-estrela",
    name: "Camiseta Lula Brilha uma Estrela",
    shortName: "Lula Brilha uma Estrela",
    sku: "STPT-05-LULA-ESTRELA",
    description: "Modelo 05 da coleção.",
    sizes: [...ALL_SIZES],
    media: [],
    active: false,
    neededImage: "public/images/products/modelo-05-lula-estrela.webp (frente da estampa)",
  },
  {
    slug: "democracia-sempre",
    name: "Camiseta Democracia Sempre",
    shortName: "Democracia Sempre",
    sku: "STPT-06-DEMOCRACIA-SEMPRE",
    description: "Modelo 06 da coleção.",
    sizes: [...ALL_SIZES],
    media: [],
    active: false,
    neededImage: "public/images/products/modelo-06-democracia-sempre.webp (frente da estampa)",
  },
];

export function productPriceCents(p: CatalogProduct): number | undefined {
  const price = p.priceInCents ?? DEFAULT_PRICE_CENTS;
  return typeof price === "number" && price > 0 ? price : undefined;
}

export function getProduct(slug: string | null | undefined): CatalogProduct | undefined {
  if (!slug) return undefined;
  return catalog.find((p) => p.slug === slug);
}

/** Produto vendável: ativo, com preço válido e com arte. */
export function sellableProduct(slug: string | null | undefined): CatalogProduct | undefined {
  const p = getProduct(slug);
  if (!p || !p.active) return undefined;
  if (p.media.length === 0) return undefined;
  if (productPriceCents(p) === undefined) return undefined;
  return p;
}

export function sizeAvailable(p: CatalogProduct, size: string): boolean {
  return p.sizes.includes(size.toUpperCase());
}

export const activeProducts = () => catalog.filter((p) => p.active && p.media.length > 0);
