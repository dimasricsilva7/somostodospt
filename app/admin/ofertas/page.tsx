import Link from "next/link";
import { redirect } from "next/navigation";
import { isAuthed } from "@/app/lib/auth";
import { listBumpsAdmin, listUpsellsAdmin, MAX_BUMPS, type AdminOffer } from "@/app/server/offers";
import { formatPrice } from "@/app/config/product";

export const dynamic = "force-dynamic";

function OfferRow({ type, o }: { type: "bump" | "upsell"; o: AdminOffer }) {
  return (
    <Link href={`/admin/ofertas/${type}/${o.id}`} className="admin-product">
      <div className="admin-product__thumb">
        {o.imageId ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={`/media/${o.imageId}`} alt={o.title} width={56} height={56} />
        ) : <span className="admin-product__noimg">sem img</span>}
      </div>
      <div className="admin-product__info">
        <strong>{o.title}</strong>
        <span>{formatPrice(o.priceCents)}</span>
      </div>
      <span className={`admin-tag ${o.active ? "admin-tag--on" : "admin-tag--off"}`}>{o.active ? "Ativo" : "Desativado"}</span>
    </Link>
  );
}

export default async function AdminOffersPage() {
  if (!(await isAuthed())) redirect("/admin/login");
  const [bumps, upsells] = await Promise.all([listBumpsAdmin(), listUpsellsAdmin()]);

  return (
    <main className="admin-shell">
      <header className="admin-top">
        <h1>Ofertas</h1>
        <Link href="/admin" className="admin-link">← Voltar</Link>
      </header>

      <h2 className="admin-h2">Order bumps (no checkout)</h2>
      <p className="admin-muted">Ofertas que o cliente pode marcar durante o checkout. Até {MAX_BUMPS}. Nascem desativadas — você ativa quando quiser.</p>
      <div className="admin-products" style={{ marginTop: 10 }}>
        {bumps.map((o) => <OfferRow key={o.id} type="bump" o={o} />)}
      </div>
      {bumps.length < MAX_BUMPS && (
        <div className="admin-toolbar" style={{ marginTop: 10 }}>
          <Link href="/admin/ofertas/bump/novo" className="button button--small">+ Adicionar order bump</Link>
        </div>
      )}

      <h2 className="admin-h2" style={{ marginTop: 28 }}>Upsell (após o pagamento)</h2>
      <p className="admin-muted">Oferta mostrada na página do pedido pago. Aceitar gera um novo PIX vinculado. Nasce desativada.</p>
      <div className="admin-products" style={{ marginTop: 10 }}>
        {upsells.map((o) => <OfferRow key={o.id} type="upsell" o={o} />)}
      </div>
      <div className="admin-toolbar" style={{ marginTop: 10 }}>
        <Link href="/admin/ofertas/upsell/novo" className="button button--small">+ Adicionar upsell</Link>
      </div>
    </main>
  );
}
