"use client";

import { Check, Copy, Loader2, RefreshCw, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { AnnounceBar } from "@/app/components/AnnounceBar";
import { Heartbeat } from "@/app/components/Heartbeat";
import { BrandMark } from "@/app/components/BrandMark";
import { formatPrice } from "@/app/config/product";
import { PIX_EXPIRATION_MINUTES } from "@/app/config/commerce";
import { track } from "@/app/lib/tracking";
import type { PublicOrder } from "@/app/types/order";

type ApiResponse = { order: PublicOrder; qr: string | null };
type Upsell = { id: string; title: string; description: string | null; priceCents: number; compareAtPriceCents: number | null; imageUrl: string | null };

const money = (c: number) => formatPrice(c) ?? "—";
const AWAITING = ["PENDING", "PIX_GENERATED"];

export function OrderClient({ orderNumber, token, processorName, upsell }: { orderNumber: string; token: string; processorName?: string; upsell?: Upsell | null }) {
  const [order, setOrder] = useState<PublicOrder | null>(null);
  const [qr, setQr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [copied, setCopied] = useState(false);
  const [renewing, setRenewing] = useState(false);
  const [remaining, setRemaining] = useState<number | null>(null);
  const purchaseFired = useRef(false);

  const qs = `order=${encodeURIComponent(orderNumber)}&token=${encodeURIComponent(token)}`;

  const refresh = useCallback(async () => {
    try {
      const res = await fetch(`/api/orders/status?${qs}`, { cache: "no-store" });
      if (res.status === 404) {
        setNotFound(true);
        return;
      }
      if (!res.ok) return;
      const data = (await res.json()) as ApiResponse;
      setOrder(data.order);
      setQr(data.qr);
    } finally {
      setLoading(false);
    }
  }, [qs]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  // Polling enquanto aguarda pagamento
  useEffect(() => {
    if (!order || !AWAITING.includes(order.status)) return;
    const id = setInterval(() => void refresh(), 4000);
    return () => clearInterval(id);
  }, [order, refresh]);

  // Contagem regressiva do PIX
  useEffect(() => {
    if (!order?.pixExpiresAt) {
      setRemaining(null);
      return;
    }
    const end = new Date(order.pixExpiresAt).getTime();
    const tick = () => setRemaining(Math.max(0, end - Date.now()));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [order?.pixExpiresAt]);

  // Purchase (navegador) com o event_id do servidor → deduplicação com o CAPI
  useEffect(() => {
    if (order?.status === "PAID" && order.metaEventId && !purchaseFired.current) {
      purchaseFired.current = true;
      track("Purchase", { value: (order.totalCents ?? 0) / 100, currency: order.currency, content_name: order.productName, order_id: order.orderNumber, num_items: order.quantity }, { eventId: order.metaEventId, once: true });
    }
  }, [order]);

  async function copy() {
    if (!order?.pixCopyPaste) return;
    try {
      await navigator.clipboard.writeText(order.pixCopyPaste);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      /* fallback: seleção manual */
    }
  }

  async function renew() {
    if (renewing) return;
    setRenewing(true);
    try {
      const res = await fetch("/api/orders/status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ order: orderNumber, token, action: "renew" }),
      });
      if (res.ok) {
        const data = (await res.json()) as ApiResponse;
        setOrder(data.order);
        setQr(data.qr);
      }
    } finally {
      setRenewing(false);
    }
  }

  const fmtClock = (ms: number) => {
    const total = Math.floor(ms / 1000);
    const m = Math.floor(total / 60);
    const s = total % 60;
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  };

  return (
    <div className="checkout-shell">
      <Heartbeat />
      <AnnounceBar />
      <header className="checkout-top">
        <Link href="/" className="brand-mark-link" aria-label="Voltar para a página inicial"><BrandMark compact /></Link>
        <span className="checkout-top__secure">Pedido {orderNumber}</span>
      </header>

      <div className="order-page">
        {loading && (
          <div className="order-loading"><Loader2 size={26} className="spin" aria-hidden="true" /><p>Carregando seu pedido…</p></div>
        )}

        {notFound && !loading && (
          <div className="checkout-empty">
            <h1>Pedido não encontrado</h1>
            <p>Confira se o link está completo. Em caso de dúvida, entre em contato com a loja.</p>
            <Link href="/" className="button button--outline">Voltar ao produto</Link>
          </div>
        )}

        {order && !loading && (
          <>
            <OrderSummaryHead order={order} />

            {AWAITING.includes(order.status) && order.pixCopyPaste && (
              <div className="pix-box">
                <h1>Pague com PIX para confirmar</h1>
                <p className="pix-box__sub">Abra o app do seu banco, escaneie o QR Code ou use o código copia e cola. A confirmação é automática.</p>
                <p className="pix-expire-warn">⏱️ Este PIX expira em <strong>{PIX_EXPIRATION_MINUTES} minutos</strong>. Pague agora para garantir o seu pedido.</p>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {qr ? <img className="pix-qr" src={qr} alt={`QR Code PIX do pedido ${order.orderNumber}`} width={240} height={240} /> : null}
                <div className="pix-value">{money(order.totalCents)}</div>

                <div className="pix-copy">
                  <code>{order.pixCopyPaste}</code>
                  <button type="button" className="button button--small" onClick={copy}>
                    {copied ? <><Check size={15} aria-hidden="true" /> Copiado</> : <><Copy size={15} aria-hidden="true" /> Copiar código</>}
                  </button>
                </div>

                {processorName && (
                  <div className="processor-note processor-note--pix">
                    <ShieldCheck size={16} aria-hidden="true" />
                    <span>
                      <span className="processor-note__badge">Pagamento processado por: <strong>{processorName}</strong></span>
                      É o processador de pagamentos oficial da Somos Todos PT — no app do seu banco o recebedor aparece como <strong>{processorName}</strong>. Pode concluir com tranquilidade: seu pedido <strong>{order.orderNumber}</strong> está associado a esta compra.
                    </span>
                  </div>
                )}

                <div className="pix-status">
                  <Loader2 size={16} className="spin" aria-hidden="true" />
                  <span>Aguardando pagamento…</span>
                  {remaining !== null && remaining > 0 && <span className="pix-timer">expira em {fmtClock(remaining)}</span>}
                </div>
                {remaining === 0 && (
                  <p className="pix-expired-note">O prazo deste PIX terminou. Gere um novo código para pagar.<br />
                    <button type="button" className="button button--small button--outline" onClick={renew} disabled={renewing}>
                      {renewing ? <><Loader2 size={14} className="spin" aria-hidden="true" /> Gerando…</> : <><RefreshCw size={14} aria-hidden="true" /> Gerar novo PIX</>}
                    </button>
                  </p>
                )}
              </div>
            )}

            {AWAITING.includes(order.status) && !order.pixCopyPaste && (
              <div className="pix-box">
                <h1>Gerando seu PIX…</h1>
                <p className="pix-box__sub">{order.pixError ? "Houve um problema ao gerar o PIX. Tente gerar novamente." : "Isso leva apenas alguns segundos."}</p>
                <button type="button" className="button button--small button--outline" onClick={renew} disabled={renewing}>
                  {renewing ? "Gerando…" : "Gerar PIX"}
                </button>
              </div>
            )}

            {order.status === "PAID" && (
              <div className="order-result order-result--paid">
                <div className="order-result__icon"><Check size={34} aria-hidden="true" /></div>
                <h1>Pagamento confirmado!</h1>
                <p>Obrigado, {order.customerFirstName}. Recebemos o pagamento do pedido <strong>{order.orderNumber}</strong> e já estamos preparando o envio.</p>
              </div>
            )}

            {order.status === "PAID" && upsell && <UpsellOffer upsell={upsell} orderNumber={orderNumber} token={token} />}

            {order.status === "EXPIRED" && (
              <div className="order-result order-result--warn">
                <h1>PIX expirado</h1>
                <p>O prazo de pagamento terminou, mas você pode gerar um novo PIX para o mesmo pedido.</p>
                <button type="button" className="button" onClick={renew} disabled={renewing}>
                  {renewing ? <><Loader2 size={16} className="spin" aria-hidden="true" /> Gerando…</> : <><RefreshCw size={16} aria-hidden="true" /> Gerar novo PIX</>}
                </button>
              </div>
            )}

            {["FAILED", "CANCELLED"].includes(order.status) && (
              <div className="order-result order-result--warn">
                <h1>Pagamento não concluído</h1>
                <p>Este pedido não foi pago. Você pode fazer um novo pedido na página do produto.</p>
                <Link href="/" className="button">Voltar ao produto</Link>
              </div>
            )}

            {["REFUNDED", "CHARGEBACK"].includes(order.status) && (
              <div className="order-result order-result--warn">
                <h1>Pagamento revertido</h1>
                <p>Houve um reembolso ou contestação neste pedido. Em caso de dúvida, fale com a loja.</p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function UpsellOffer({ upsell, orderNumber, token }: { upsell: Upsell; orderNumber: string; token: string }) {
  const [loading, setLoading] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [err, setErr] = useState<string>();
  if (dismissed) return null;

  async function accept() {
    if (loading) return;
    setLoading(true);
    setErr(undefined);
    try {
      const res = await fetch("/api/orders/upsell", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ order: orderNumber, token, upsellId: upsell.id }) });
      const data = (await res.json().catch(() => ({}))) as { orderNumber?: string; token?: string; error?: string };
      if (res.ok && data.orderNumber && data.token) {
        window.location.assign(`/pedido/${encodeURIComponent(data.orderNumber)}?t=${encodeURIComponent(data.token)}`);
        return;
      }
      setErr(data.error ?? "Não foi possível adicionar.");
      setLoading(false);
    } catch {
      setErr("Falha de conexão.");
      setLoading(false);
    }
  }

  return (
    <div className="upsell-offer">
      <span className="eyebrow">OFERTA ESPECIAL — SÓ AGORA</span>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      {upsell.imageUrl && <img className="upsell-offer__img" src={upsell.imageUrl} alt="" />}
      <h2>{upsell.title}</h2>
      {upsell.description && <p>{upsell.description}</p>}
      <p className="upsell-offer__price">{upsell.compareAtPriceCents ? <s>{money(upsell.compareAtPriceCents)}</s> : null} <strong>{money(upsell.priceCents)}</strong></p>
      {err && <p className="admin-error">{err}</p>}
      <button type="button" className="button button--large" onClick={accept} disabled={loading}>{loading ? "Gerando PIX…" : "SIM, QUERO ADICIONAR"}</button>
      <button type="button" className="text-link upsell-offer__decline" onClick={() => setDismissed(true)}>Não, obrigado</button>
    </div>
  );
}

function OrderSummaryHead({ order }: { order: PublicOrder }) {
  return (
    <div className="order-summary-head">
      <span className="eyebrow">PEDIDO {order.orderNumber}</span>
      <p>
        {order.quantity}x {order.productName} · Tamanho <strong>{order.size}</strong> · Total {money(order.totalCents)}
      </p>
    </div>
  );
}
