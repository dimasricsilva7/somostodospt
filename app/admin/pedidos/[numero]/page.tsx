import Link from "next/link";
import { redirect } from "next/navigation";
import { isAuthed } from "@/app/lib/auth";
import { getOrderAdmin } from "@/app/server/admin-orders";
import { ORDER_STATUS_LABEL } from "@/app/lib/order-status";
import { formatPrice } from "@/app/config/product";
import { FulfillmentForm } from "./FulfillmentForm";

export const dynamic = "force-dynamic";

export default async function AdminOrderDetail({ params }: { params: Promise<{ numero: string }> }) {
  if (!(await isAuthed())) redirect("/admin/login");
  const { numero } = await params;
  const order = await getOrderAdmin(decodeURIComponent(numero));
  if (!order) {
    return (
      <main className="admin-shell">
        <header className="admin-top"><h1>Pedido</h1><Link href="/admin/pedidos" className="admin-link">← Voltar</Link></header>
        <p className="admin-muted">Pedido não encontrado (ou banco indisponível).</p>
      </main>
    );
  }

  const snap = (order.customerSnapshot ?? {}) as { name?: string; email?: string; phone?: string; cpf?: string };
  const addr = (order.shippingAddress ?? {}) as Record<string, string>;

  return (
    <main className="admin-shell">
      <header className="admin-top">
        <h1>Pedido {order.orderNumber}</h1>
        <Link href="/admin/pedidos" className="admin-link">← Voltar</Link>
      </header>

      <div className="admin-order-grid">
        <section className="admin-box">
          <h2 className="admin-h2">Resumo</h2>
          <p><strong>{order.quantity}x {order.productName}</strong> · Tamanho {order.size}</p>
          <p>Total: <strong>{formatPrice(order.totalCents)}</strong> · Pagamento: {ORDER_STATUS_LABEL[order.status] ?? order.status}</p>
          <p className="admin-muted">Criado em {order.createdAt.toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })}{order.paidAt ? ` · Pago em ${order.paidAt.toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })}` : ""}</p>
        </section>

        <section className="admin-box">
          <h2 className="admin-h2">Cliente</h2>
          <p>{snap.name}</p>
          <p className="admin-muted">{order.customer.email} · {order.customer.phone}</p>
          {snap.cpf && <p className="admin-muted">CPF: {snap.cpf}</p>}
        </section>

        <section className="admin-box">
          <h2 className="admin-h2">Entrega</h2>
          <p>{addr.street}, {addr.number}{addr.complement ? ` · ${addr.complement}` : ""}</p>
          <p className="admin-muted">{addr.district} · {addr.city}/{addr.state} · CEP {addr.cep}</p>
          <FulfillmentForm orderNumber={order.orderNumber!} status={order.fulfillmentStatus} trackingCode={order.trackingCode ?? ""} />
        </section>

        <section className="admin-box">
          <h2 className="admin-h2">Histórico</h2>
          <ul className="admin-timeline">
            {order.events.map((e) => (
              <li key={e.id}>
                <span>{e.createdAt.toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}</span>
                <span>{e.message}</span>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </main>
  );
}
