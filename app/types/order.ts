import type { OrderStatus } from "@prisma/client";

/** Visão pública do pedido — nunca inclui CPF, token de acesso ou dados sensíveis. */
export type PublicOrder = {
  orderNumber: string;
  status: OrderStatus;
  totalCents: number;
  subtotalCents: number;
  discountCents: number;
  shippingCents: number;
  productName: string;
  size: string;
  quantity: number;
  unitPriceCents: number;
  pixCopyPaste: string | null;
  pixExpiresAt: string | null;
  paidAt: string | null;
  createdAt: string;
  metaEventId: string | null;
  customerFirstName: string;
  pixError: boolean;
  currency: string;
};
