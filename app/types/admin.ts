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

export type OnlineRow = { path: string | null; device: string | null; lastSeenAt: string; firstSeenAt: string; orderStatus?: string | null };

export type DashboardStats = { revenueCents: number; total: number; paid: number; pending: number };

export type ModelRank = {
  slug: string;
  name: string;
  generatedUnits: number;
  generatedOrders: number;
  paidUnits: number;
  paidOrders: number;
  paidRevenueCents: number;
};

export type DashboardPeriod = "today" | "yesterday" | "7d" | "30d" | "all";

export type DashboardData = {
  period: DashboardPeriod;
  stats: DashboardStats;
  orders: AdminOrderRow[];
  abandoned: AbandonedLead[];
  online: { count: number; rows: OnlineRow[] };
  models: ModelRank[];
  ok: boolean;
};
