export type AdminOrderRow = {
  orderNumber: string;
  createdAt: string;
  status: string;
  fulfillmentStatus: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  city: string;
  state: string;
  productName: string;
  size: string;
  quantity: number;
  totalCents: number;
  paidAt: string | null;
};

export type AbandonedLead = {
  email: string | null;
  phone: string | null;
  name: string | null;
  productName: string | null;
  size: string | null;
  totalCents: number;
  updatedAt: string;
};

export type OnlineRow = { path: string | null; device: string | null; lastSeenAt: string };

export type DashboardStats = { revenueCents: number; total: number; paid: number; pending: number };

export type DashboardData = {
  stats: DashboardStats;
  orders: AdminOrderRow[];
  abandoned: AbandonedLead[];
  online: { count: number; rows: OnlineRow[] };
  ok: boolean;
};
