import Link from "next/link";
import { redirect } from "next/navigation";
import { isAuthed } from "@/app/lib/auth";
import { listOrders } from "@/app/server/admin-orders";
import { ORDER_STATUS_LABEL } from "@/app/lib/order-status";
import { formatPrice } from "@/app/config/product";
import type { OrderStatus } from "@prisma/client";

export const dynamic = "force-dynamic";

const FULFILL: Record<string, string> = { PENDING: "A preparar", PROCESSING: "Separando", SHIPPED: "Enviado", DELIVERED: "Entregue" };

function statusClass(s: string) {
  if (s === "PAID") return "admin-tag--on";
  if (["EXPIRED", "FAILED", "CANCELLED", "REFUNDED", "CHARGEBACK"].includes(s)) return "admin-tag--off";
  return "admin-tag--wait";
}

export default async function AdminOrdersPage() {
  if (!(await isAuthed())) redirect("/admin/login");
  const { rows, ok } = await listOrders();

  return (
    <main className="admin-shell">
      <header className="admin-top">
        <h1>Pedidos</h1>
        <Link href="/admin" className="admin-link">← Voltar</Link>
      </header>

      {!ok && <p className="admin-warn">Não foi possível ler os pedidos (banco indisponível).</p>}
      {ok && rows.length === 0 && <p className="admin-muted">Nenhum pedido ainda.</p>}

      {rows.length > 0 && (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr><th>Pedido</th><th>Data</th><th>Cliente</th><th>Produto</th><th>Total</th><th>Pagamento</th><th>Entrega</th></tr>
            </thead>
            <tbody>
              {rows.map((o) => (
                <tr key={o.orderNumber}>
                  <td><Link href={`/admin/pedidos/${o.orderNumber}`} className="admin-link">{o.orderNumber}</Link></td>
                  <td>{new Date(o.createdAt).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}</td>
                  <td>{o.customerName}</td>
                  <td>{o.productName}{o.size && o.size !== "vários" && !o.productName.includes("×") ? ` · ${o.size}` : ""}</td>
                  <td>{formatPrice(o.totalCents)}</td>
                  <td><span className={`admin-tag ${statusClass(o.status)}`}>{ORDER_STATUS_LABEL[o.status as OrderStatus] ?? o.status}</span></td>
                  <td>{FULFILL[o.fulfillmentStatus] ?? o.fulfillmentStatus}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
