"use client";

import Link from "next/link";
import { Mail, MessageCircle, Send } from "lucide-react";
import { useEffect, useState } from "react";
import { ORDER_STATUS_LABEL } from "@/app/lib/order-status";
import type { OrderStatus } from "@prisma/client";
import { formatPrice } from "@/app/config/product";
import { productPriceCents, type CatalogProduct } from "@/app/config/catalog";
import { onlyDigits } from "@/app/lib/validators";
import type { DashboardData, DashboardPeriod } from "@/app/types/admin";

const PERIODS: { key: DashboardPeriod; label: string }[] = [
  { key: "today", label: "Hoje" },
  { key: "yesterday", label: "Ontem" },
  { key: "7d", label: "7 dias" },
  { key: "30d", label: "30 dias" },
  { key: "all", label: "Tudo" },
];

type Tab = "pedidos" | "online" | "abandonados" | "modelos";

const money = (c: number) => formatPrice(c) ?? "—";
const FULFILL: Record<string, string> = { PENDING: "A preparar", PROCESSING: "Separando", SHIPPED: "Enviado", DELIVERED: "Entregue" };

function statusClass(s: string) {
  if (s === "PAID") return "admin-tag--on";
  if (["EXPIRED", "FAILED", "CANCELLED", "REFUNDED", "CHARGEBACK"].includes(s)) return "admin-tag--off";
  return "admin-tag--wait";
}

const PAGE: Record<string, string> = { "/": "Página inicial", "/checkout": "Checkout" };
function pageName(path: string | null) {
  if (!path) return "—";
  if (PAGE[path]) return PAGE[path];
  if (path.startsWith("/pedido")) return "Pedido (PIX)";
  if (path.startsWith("/checkout")) return "Checkout";
  return path;
}
function dt(iso: string) {
  return new Date(iso).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
}
/** Quanto tempo a pessoa está no site (desde a 1ª vez vista na sessão). */
function durLabel(fromIso: string): string {
  const s = Math.max(0, Math.round((Date.now() - new Date(fromIso).getTime()) / 1000));
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  return m < 60 ? `${m} min` : `${Math.floor(m / 60)}h${String(m % 60).padStart(2, "0")}`;
}
/** Status de atividade a partir do último "ping". */
function activity(lastIso: string): { live: boolean; text: string } {
  const s = Math.max(0, Math.round((Date.now() - new Date(lastIso).getTime()) / 1000));
  if (s < 65) return { live: true, text: "ativo agora" };
  return { live: false, text: `saindo (${Math.max(1, Math.round(s / 60))} min)` };
}

function RecoverMetaButton() {
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string>();
  async function run() {
    if (loading) return;
    if (!confirm("Reenviar ao Meta as conversões (Purchase) dos pedidos pagos dos últimos 7 dias? Seguro: o Meta deduplica por event_id.")) return;
    setLoading(true);
    setMsg(undefined);
    try {
      const res = await fetch("/api/admin/recover-meta", { method: "POST" });
      const data = (await res.json().catch(() => ({}))) as { message?: string; error?: string };
      setMsg(data.message ?? data.error ?? "Concluído.");
    } catch {
      setMsg("Falha de conexão.");
    } finally {
      setLoading(false);
    }
  }
  return (
    <div className="admin-toolbar">
      <button type="button" className="button button--small button--outline" onClick={run} disabled={loading}>
        <Send size={14} aria-hidden="true" /> {loading ? "Recuperando…" : "Recuperar conversões no Meta (7 dias)"}
      </button>
      {msg && <span className="admin-toolbar__msg">{msg}</span>}
    </div>
  );
}

function OrderRowActions({ orderNumber, phone }: { orderNumber: string; phone: string }) {
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState<"ok" | "err" | null>(null);
  const wa = phone ? `https://wa.me/55${onlyDigits(phone)}` : null;

  async function resend() {
    if (sending) return;
    setSending(true);
    setDone(null);
    try {
      const res = await fetch("/api/admin/order-email", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ orderNumber }) });
      setDone(res.ok ? "ok" : "err");
    } catch {
      setDone("err");
    } finally {
      setSending(false);
      setTimeout(() => setDone(null), 3000);
    }
  }

  return (
    <div className="row-actions">
      {wa && (
        <a className="row-btn row-btn--wa" href={wa} target="_blank" rel="noreferrer" title="Abrir WhatsApp" aria-label="Abrir WhatsApp">
          <MessageCircle size={15} aria-hidden="true" />
        </a>
      )}
      <button type="button" className={`row-btn${done === "ok" ? " is-ok" : done === "err" ? " is-err" : ""}`} onClick={resend} disabled={sending} title="Reenviar e-mail" aria-label="Reenviar e-mail">
        <Mail size={15} aria-hidden="true" />
      </button>
    </div>
  );
}

export function AdminDashboard({ initial, products }: { initial: DashboardData; products: CatalogProduct[] }) {
  const [data, setData] = useState<DashboardData>(initial);
  const [tab, setTab] = useState<Tab>("pedidos");
  const [period, setPeriod] = useState<DashboardPeriod>(initial.period ?? "today");

  useEffect(() => {
    let alive = true;
    async function load() {
      try {
        const res = await fetch(`/api/admin/dashboard?period=${period}`, { cache: "no-store" });
        if (res.ok && alive) setData(await res.json());
      } catch {
        /* ignore */
      }
    }
    load(); // recarrega ao trocar de período
    const id = setInterval(load, 10_000); // atualiza tudo a cada 10s
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, [period]);

  const { stats, orders, abandoned, online } = data;

  return (
    <>
      <div className="admin-periods" role="tablist" aria-label="Período">
        {PERIODS.map((p) => (
          <button key={p.key} type="button" className={period === p.key ? "is-active" : ""} aria-pressed={period === p.key} onClick={() => setPeriod(p.key)}>{p.label}</button>
        ))}
      </div>
      <RecoverMetaButton />
      <div className="admin-stats admin-stats--4">
        <div><strong>{money(stats.revenueCents)}</strong><span>Receita (pagos)</span></div>
        <div><strong>{stats.paid}</strong><span>Pedidos pagos</span></div>
        <div><strong>{stats.pending}</strong><span>Aguardando PIX</span></div>
        <div><span className="admin-live"><i /> {online.count}</span><span>Online agora</span></div>
      </div>

      <div className="admin-tabs" role="tablist">
        <button role="tab" aria-selected={tab === "pedidos"} className={tab === "pedidos" ? "is-active" : ""} onClick={() => setTab("pedidos")}>Pedidos ({orders.length})</button>
        <button role="tab" aria-selected={tab === "online"} className={tab === "online" ? "is-active" : ""} onClick={() => setTab("online")}>Online ao vivo ({online.count})</button>
        <button role="tab" aria-selected={tab === "abandonados"} className={tab === "abandonados" ? "is-active" : ""} onClick={() => setTab("abandonados")}>Abandonados ({abandoned.length})</button>
        <button role="tab" aria-selected={tab === "modelos"} className={tab === "modelos" ? "is-active" : ""} onClick={() => setTab("modelos")}>Modelos</button>
      </div>

      {tab === "pedidos" && (
        <div className="admin-table-wrap">
          {orders.length === 0 ? <p className="admin-pad admin-muted">Nenhum pedido ainda.</p> : (
            <table className="admin-table">
              <thead><tr><th>Pedido</th><th>Data</th><th>Cliente</th><th>Contato</th><th>Local</th><th>Produto</th><th>Total</th><th>Pagamento</th><th>Entrega</th><th>Ações</th></tr></thead>
              <tbody>
                {orders.map((o) => (
                  <tr key={o.orderNumber}>
                    <td><Link href={`/admin/pedidos/${o.orderNumber}`} className="admin-link">{o.orderNumber}</Link></td>
                    <td>{dt(o.createdAt)}</td>
                    <td>{o.customerName}</td>
                    <td className="admin-contact">{o.customerEmail && <span>{o.customerEmail}</span>}{o.customerPhone && <span>{o.customerPhone}</span>}</td>
                    <td>{o.city}{o.city && o.state ? "/" : ""}{o.state}</td>
                    <td>{o.productName}{o.size && o.size !== "vários" && !o.productName.includes("×") ? ` · ${o.size}` : ""}</td>
                    <td>{money(o.totalCents)}</td>
                    <td><span className={`admin-tag ${statusClass(o.status)}`}>{ORDER_STATUS_LABEL[o.status as OrderStatus] ?? o.status}</span></td>
                    <td>{FULFILL[o.fulfillmentStatus] ?? o.fulfillmentStatus}</td>
                    <td><OrderRowActions orderNumber={o.orderNumber} phone={o.customerPhone} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {tab === "online" && (
        <div className="admin-table-wrap">
          <div className="online-hero">
            <span className="admin-live admin-live--big"><i /> {online.count}</span>
            <span>pessoa(s) no site agora<br /><small className="admin-muted">atividade no último minuto · atualiza a cada 10s</small></span>
          </div>
          {online.rows.length === 0 ? <p className="admin-pad admin-muted">Ninguém online no momento.</p> : (
            <table className="admin-table">
              <thead><tr><th>Onde está</th><th>Dispositivo</th><th>No site há</th><th>Atividade</th></tr></thead>
              <tbody>
                {online.rows.map((r, i) => {
                  const act = activity(r.lastSeenAt);
                  return (
                    <tr key={i}>
                      <td>{pageName(r.path)}</td>
                      <td>{r.device ?? "—"}</td>
                      <td>{durLabel(r.firstSeenAt)}</td>
                      <td><span className={act.live ? "online-dot online-dot--live" : "online-dot"}>{act.live && <i />}{act.text}</span></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      )}

      {tab === "abandonados" && (
        <div className="admin-table-wrap">
          {abandoned.length === 0 ? <p className="admin-pad admin-muted">Nenhum checkout abandonado por enquanto.</p> : (
            <table className="admin-table">
              <thead><tr><th>Quando</th><th>Nome</th><th>Contato</th><th>Produto</th><th>Total</th><th></th></tr></thead>
              <tbody>
                {abandoned.map((l, i) => {
                  const wa = l.phone ? `https://wa.me/55${onlyDigits(l.phone)}` : null;
                  return (
                    <tr key={i}>
                      <td>{dt(l.updatedAt)}</td>
                      <td>{l.name ?? "—"}</td>
                      <td className="admin-contact">{l.email && <span>{l.email}</span>}{l.phone && <span>{l.phone}</span>}</td>
                      <td>{l.productName ?? "—"}{l.size ? ` · ${l.size}` : ""}</td>
                      <td>{money(l.totalCents)}</td>
                      <td>{wa && <a className="admin-link" href={wa} target="_blank" rel="noreferrer">WhatsApp ↗</a>}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      )}

      {tab === "modelos" && (
        <div className="admin-products">
          {products.map((p) => {
            const price = productPriceCents(p);
            const sellable = p.active && p.media.length > 0 && price !== undefined;
            return (
              <Link key={p.slug} href={`/admin/produtos/${p.slug}`} className="admin-product">
                <div className="admin-product__thumb">
                  {p.media[0] ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={p.media[0].src} alt={p.name} width={56} height={56} />
                  ) : <span className="admin-product__noimg">sem arte</span>}
                </div>
                <div className="admin-product__info">
                  <strong>{p.name}</strong>
                  <span>{price !== undefined ? money(price) : "sem preço"} · {p.sizes.length} tamanhos</span>
                </div>
                <span className={`admin-tag ${sellable ? "admin-tag--on" : "admin-tag--off"}`}>{sellable ? "À venda" : "Em breve"}</span>
              </Link>
            );
          })}
        </div>
      )}
    </>
  );
}
