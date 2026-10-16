/**
 * Configuração comercial central do Somos Todos PT.
 * Fonte da verdade para preço, frete, promoção, avaliações e tempo de expiração do PIX.
 * REGRA: nada aqui pode ser inventado. Campos sem dado real ficam pendentes e o
 * checkout se recusa a cobrar enquanto o preço não estiver definido.
 */
import { product } from "./product";

/** Tempo de expiração do PIX (minutos). Respeitado pelo gateway quando possível. */
export const PIX_EXPIRATION_MINUTES = 30;

/** Quantidade máxima por pedido. */
export const MAX_QUANTITY = 5;

/**
 * Frete. `mode`:
 * - "free"  → não cobra frete (R$ 0). Rótulo exibido em `label`.
 * - "flat"  → cobra `cents` fixos.
 * Padrão: frete grátis (não cobra valor extra — decisão comercial não enganosa).
 * O responsável pode trocar para "flat" com o valor real combinado com a transportadora.
 */
export const shipping = {
  mode: "free" as "free" | "flat",
  cents: 0,
  label: "Frete grátis para todo o Brasil",
  etaText: "Entrega em 2 a 3 dias úteis", // prazo informado pelo responsável (2026-10-16)
} as const;

/** Barra de aviso no topo do site e do checkout (condições comerciais reais). */
export const announcement = {
  enabled: true,
  text: "FRETE GRÁTIS para todo o Brasil • Entrega em 2 a 3 dias úteis",
} as const;

export function shippingCents(): number {
  return shipping.mode === "flat" ? Math.max(0, shipping.cents) : 0;
}

/**
 * Barra de urgência. Desativada por padrão.
 * Só ative com uma condição comercial REAL e verificável:
 * - type "promo":  promoção com prazo real (endsAt ISO). Sem cronômetro falso.
 * - type "stock":  estoque realmente limitado e confirmado (quantity real).
 * Enquanto `enabled` for false, a barra não aparece.
 */
export const urgency = {
  enabled: false,
  type: "promo" as "promo" | "stock",
  message: "",
  endsAt: null as string | null, // ISO 8601, apenas se a promoção tiver prazo real
  stockLeft: null as number | null, // apenas se o estoque for realmente esse
} as const;

export type Review = {
  name: string;
  rating: number; // 1..5
  text: string;
  city?: string;
  verified?: boolean; // só true para compras realmente verificadas
};

/**
 * Avaliações reais. VAZIO por padrão — NÃO invente nomes, notas ou depoimentos.
 * Preencha somente com avaliações verdadeiras e autorizadas de compradores.
 */
export const reviews: Review[] = [];

/** Preço disponível e válido para cobrança? (bloqueia a geração de PIX se faltar) */
export function priceReady(): boolean {
  return typeof product.priceInCents === "number" && product.priceInCents > 0;
}

/** Selos de confiança: apenas afirmações comprováveis sobre o que o sistema realmente faz. */
export const trustSignals: { title: string; text: string }[] = [
  { title: "Pagamento PIX", text: "Cobrança gerada no padrão do Banco Central, com QR Code e código copia e cola." },
  { title: "Confirmação automática", text: "O pedido é atualizado quando o pagamento é confirmado pelo provedor." },
  { title: "Dados protegidos", text: "Seus dados são usados apenas para processar o pedido e a entrega." },
];
