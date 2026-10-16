import type { OrderStatus } from "@prisma/client";

/** Transições permitidas do status do pedido PIX. */
const TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  PENDING: ["PIX_GENERATED", "PAID", "EXPIRED", "CANCELLED", "FAILED"],
  PIX_GENERATED: ["PAID", "EXPIRED", "CANCELLED", "FAILED"],
  PAID: ["REFUNDED", "CHARGEBACK"],
  EXPIRED: ["PENDING", "PAID"], // pode renovar o PIX (volta a PENDING) ou pagar no último segundo
  FAILED: ["PENDING", "PAID"],
  CANCELLED: [],
  REFUNDED: [],
  CHARGEBACK: [],
};

export function canTransition(from: OrderStatus, to: OrderStatus): boolean {
  if (from === to) return false;
  return TRANSITIONS[from]?.includes(to) ?? false;
}

export const ORDER_STATUS_LABEL: Record<OrderStatus, string> = {
  PENDING: "Aguardando",
  PIX_GENERATED: "PIX gerado — aguardando pagamento",
  PAID: "Pago",
  EXPIRED: "PIX expirado",
  CANCELLED: "Cancelado",
  REFUNDED: "Reembolsado",
  CHARGEBACK: "Contestado",
  FAILED: "Falhou",
};

export const isPaidStatus = (s: OrderStatus) => s === "PAID";
export const isAwaiting = (s: OrderStatus) => s === "PENDING" || s === "PIX_GENERATED";
