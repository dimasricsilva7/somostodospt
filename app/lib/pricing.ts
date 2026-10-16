/** Regras de preço e totais — puras, usadas no servidor (fonte da verdade), na landing e nos testes. */

export function computeTotals(lines: { unitPriceCents: number; quantity: number }[], shippingCents: number, discountCents = 0) {
  const subtotalCents = lines.reduce((sum, l) => sum + l.unitPriceCents * l.quantity, 0);
  const discount = Math.min(Math.max(0, discountCents), subtotalCents);
  const shipping = Math.max(0, shippingCents);
  const totalCents = Math.max(0, subtotalCents - discount + shipping);
  return { subtotalCents, discountCents: discount, shippingCents: shipping, totalCents };
}

/** Percentual de desconto real (preço antigo × preço atual). null se não houver desconto. */
export function discountPct(priceCents: number, compareAtCents: number | null | undefined): number | null {
  if (!compareAtCents || compareAtCents <= priceCents) return null;
  return Math.round((1 - priceCents / compareAtCents) * 100);
}

/** Número do pedido exibido ao cliente: PT27684-2026 (código aleatório de 5 dígitos + ano). */
export function formatOrderNumber(year: number, code: number) {
  return `PT${code}-${year}`;
}

/** BravoPay: valor mínimo de uma cobrança PIX. */
export const MIN_PIX_CENTS = 500;
