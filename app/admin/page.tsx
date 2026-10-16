import Link from "next/link";
import { redirect } from "next/navigation";
import { isAuthed } from "@/app/lib/auth";
import { mergedCatalog } from "@/app/server/content";
import { productPriceCents } from "@/app/config/catalog";
import { formatPrice } from "@/app/config/product";
import { db } from "@/app/lib/db";
import { LogoutButton } from "./LogoutButton";

export const dynamic = "force-dynamic";

async function orderStats() {
  try {
    const [total, paid, pending] = await Promise.all([
      db.order.count(),
      db.order.count({ where: { status: "PAID" } }),
      db.order.count({ where: { status: { in: ["PENDING", "PIX_GENERATED"] } } }),
    ]);
    return { total, paid, pending, ok: true as const };
  } catch {
    return { total: 0, paid: 0, pending: 0, ok: false as const };
  }
}

export default async function AdminHome() {
  if (!(await isAuthed())) redirect("/admin/login");
  const [products, stats] = await Promise.all([mergedCatalog(), orderStats()]);

  return (
    <main className="admin-shell">
      <header className="admin-top">
        <h1>Painel Somos Todos PT</h1>
        <div className="admin-top__actions">
          <Link href="/" className="admin-link" target="_blank">Ver a loja ↗</Link>
          <Link href="/admin/textos" className="admin-link">Textos da página</Link>
          <LogoutButton />
        </div>
      </header>

      {!stats.ok && (
        <p className="admin-warn">O banco de dados ainda não está acessível — as edições só serão salvas depois que o banco estiver configurado na Vercel.</p>
      )}

      <section className="admin-stats">
        <div><strong>{stats.total}</strong><span>Pedidos</span></div>
        <div><strong>{stats.paid}</strong><span>Pagos</span></div>
        <div><strong>{stats.pending}</strong><span>Aguardando PIX</span></div>
      </section>

      <h2 className="admin-h2">Modelos</h2>
      <div className="admin-products">
        {products.map((p) => {
          const price = productPriceCents(p);
          const sellable = p.active && p.media.length > 0 && price !== undefined;
          return (
            <Link key={p.slug} href={`/admin/produtos/${p.slug}`} className="admin-product">
              <div className="admin-product__thumb">
                {p.media[0] ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={p.media[0].src} alt={p.name} width={64} height={64} />
                ) : (
                  <span className="admin-product__noimg">sem arte</span>
                )}
              </div>
              <div className="admin-product__info">
                <strong>{p.name}</strong>
                <span>{price !== undefined ? formatPrice(price) : "sem preço"} · {p.sizes.length} tamanhos</span>
              </div>
              <span className={`admin-tag ${sellable ? "admin-tag--on" : "admin-tag--off"}`}>{sellable ? "À venda" : "Em breve"}</span>
            </Link>
          );
        })}
      </div>
    </main>
  );
}
