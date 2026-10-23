"use client";

import { ArrowLeft, BadgeCheck, Loader2, Lock, Minus, Plus, ShieldCheck, Trash2, Truck, Zap } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { type FormEvent, type ReactNode, useEffect, useRef, useState } from "react";
import { AnnounceBar } from "@/app/components/AnnounceBar";
import { Heartbeat } from "@/app/components/Heartbeat";
import { BrandMark } from "@/app/components/BrandMark";
import { ProductMedia } from "@/app/components/ProductMedia";
import { formatPrice, type ProductMedia as ProductMediaType } from "@/app/config/product";
import { MAX_QUANTITY, discountCentsFor, multiBuyDiscount, shipping } from "@/app/config/commerce";
import { maskCep, maskCpf, maskPhone, onlyDigits } from "@/app/lib/validators";
import { buildClientContext, getConsentChoice, newEventId, track } from "@/app/lib/tracking";
import { addItem, clearCart, removeItem, updateQty, useCart } from "@/app/lib/cart";

type CheckoutProduct = { slug: string; name: string; priceInCents: number; compareAtPriceInCents?: number; sizes: string[]; media: ProductMediaType };
type Bump = { id: string; title: string; description: string | null; priceCents: number; compareAtPriceCents: number | null; imageUrl: string | null };
type Fields = Record<string, string>;

const CURRENCY = "BRL";
const money = (c: number) => formatPrice(c) ?? "—";

export function CheckoutClient({ products, bumps = [], processorName, announcementText, initialSlug, initialSize }: { products: CheckoutProduct[]; bumps?: Bump[]; processorName?: string; announcementText?: string; initialSlug?: string; initialSize?: string }) {
  const router = useRouter();
  const cart = useCart();
  const bySlug = new Map(products.map((p) => [p.slug, p]));
  const [selectedBumps, setSelectedBumps] = useState<string[]>([]);

  const [form, setForm] = useState({ name: "", email: "", phone: "", cpf: "", cep: "", street: "", number: "", complement: "", district: "", city: "", state: "" });
  const [hp, setHp] = useState("");
  const [consent, setConsent] = useState(false);
  const [errors, setErrors] = useState<Fields>({});
  const [error, setError] = useState<string>();
  const [submitting, setSubmitting] = useState(false);
  const startedAt = useRef(0);
  const checkoutToken = useRef("");
  const didInit = useRef(false);

  const lines = cart
    .map((i) => {
      const p = bySlug.get(i.slug);
      if (!p || !p.sizes.includes(i.size)) return null;
      return { slug: i.slug, size: i.size, qty: i.qty, name: p.name, price: p.priceInCents, media: p.media };
    })
    .filter((x): x is NonNullable<typeof x> => x !== null);

  const count = lines.reduce((s, l) => s + l.qty, 0);
  const subtotal = lines.reduce((s, l) => s + l.price * l.qty, 0);
  const discount = discountCentsFor(subtotal, count);
  const shippingCents = shipping.mode === "flat" ? shipping.cents : 0;
  const bumpsTotal = bumps.filter((b) => selectedBumps.includes(b.id)).reduce((s, b) => s + b.priceCents, 0);
  const total = subtotal - discount + bumpsTotal + shippingCents;
  const faltaPromo = multiBuyDiscount.enabled && count === multiBuyDiscount.minUnits - 1;

  useEffect(() => {
    if (didInit.current) return;
    didInit.current = true;
    startedAt.current = Date.now();
    checkoutToken.current = newEventId().replace(/-/g, "").slice(0, 32).padEnd(16, "0");
    // Deep-link opcional: /checkout?produto=slug&tam=M adiciona ao carrinho
    if (initialSlug && initialSize) {
      const p = bySlug.get(initialSlug);
      if (p && p.sizes.includes(initialSize) && !cart.some((i) => i.slug === initialSlug && i.size === initialSize)) {
        addItem(initialSlug, initialSize, 1);
      }
    }
    track("InitiateCheckout", { currency: CURRENCY, num_items: count }, { eventId: newEventId(), once: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function update(key: keyof typeof form, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
    setErrors((e) => {
      if (!e[`customer.${key}`] && !e[`address.${key}`]) return e;
      const next = { ...e };
      delete next[`customer.${key}`];
      delete next[`address.${key}`];
      return next;
    });
  }

  function postLead() {
    if ((!form.email && !form.phone) || !checkoutToken.current || lines.length === 0) return;
    const first = lines[0];
    fetch("/api/checkout/lead", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      keepalive: true,
      body: JSON.stringify({ clientKey: checkoutToken.current, name: form.name, email: form.email, phone: form.phone, productSlug: first.slug, productName: count > 1 ? `${count} camisetas` : first.name, size: first.size, totalCents: total }),
    }).catch(() => {});
  }

  async function lookupCep(cep: string) {
    const digits = onlyDigits(cep);
    if (digits.length !== 8) return;
    try {
      const res = await fetch(`https://viacep.com.br/ws/${digits}/json/`);
      const data = (await res.json()) as { logradouro?: string; bairro?: string; localidade?: string; uf?: string; erro?: boolean };
      if (data.erro) return;
      setForm((f) => ({ ...f, street: f.street || data.logradouro || "", district: f.district || data.bairro || "", city: data.localidade || f.city, state: data.uf || f.state }));
    } catch {
      /* manual */
    }
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError(undefined);
    if (lines.length === 0) {
      setError("Seu carrinho está vazio.");
      return;
    }
    if (submitting) return;
    setSubmitting(true);

    const adsConsent = getConsentChoice() !== "rejected";
    const paymentEventId = newEventId();
    track("AddPaymentInfo", { value: total / 100, currency: CURRENCY, num_items: count }, { eventId: paymentEventId });

    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          checkoutToken: checkoutToken.current,
          hp,
          elapsedMs: Date.now() - startedAt.current,
          items: lines.map((l) => ({ productSlug: l.slug, size: l.size, quantity: l.qty })),
          bumpIds: selectedBumps,
          customer: { name: form.name, email: form.email, phone: form.phone, cpf: form.cpf },
          address: { cep: form.cep, street: form.street, number: form.number, complement: form.complement, district: form.district, city: form.city, state: form.state },
          marketingConsent: consent,
          paymentEventId,
          context: buildClientContext(adsConsent),
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { orderNumber?: string; token?: string; error?: string; fields?: Fields };
      if (!res.ok) {
        if (data.fields) setErrors(data.fields);
        setError(data.error ?? "Não foi possível concluir. Confira os dados e tente novamente.");
        setSubmitting(false);
        return;
      }
      if (data.orderNumber && data.token) {
        clearCart();
        router.push(`/pedido/${encodeURIComponent(data.orderNumber)}?t=${encodeURIComponent(data.token)}`);
        return;
      }
      setError("Resposta inesperada do servidor. Tente novamente.");
      setSubmitting(false);
    } catch {
      setError("Falha de conexão. Verifique sua internet e tente novamente.");
      setSubmitting(false);
    }
  }

  const err = (k: string) => errors[k];

  if (lines.length === 0) {
    return (
      <div className="checkout-shell">
        <Heartbeat />
        <AnnounceBar text={announcementText} />
        <header className="checkout-top">
          <Link href="/" className="brand-mark-link" aria-label="Voltar para a página inicial"><BrandMark compact /></Link>
          <span className="checkout-top__secure"><Lock size={14} aria-hidden="true" /> Checkout seguro</span>
        </header>
        <div className="checkout-empty">
          <h1>Seu carrinho está vazio</h1>
          <p>Escolha um ou mais modelos na página inicial para finalizar a compra.</p>
          <Link href="/" className="button button--outline">Ver a coleção</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="checkout-shell">
      <Heartbeat />
      <AnnounceBar text={announcementText} />
      <header className="checkout-top">
        <Link href="/" className="brand-mark-link" aria-label="Voltar para a página inicial"><BrandMark compact /></Link>
        <span className="checkout-top__secure"><Lock size={14} aria-hidden="true" /> Checkout seguro</span>
      </header>

      <ReserveTimer />

      <div className="checkout-grid">
        <form className="checkout-form" onSubmit={submit} noValidate>
          <Link href="/" className="text-link checkout-back"><ArrowLeft size={15} aria-hidden="true" /> Continuar comprando</Link>
          <h1>Finalizar compra</h1>

          <fieldset className="field-group">
            <legend>Seus dados</legend>
            <Field label="Nome completo" error={err("customer.name")}>
              <input autoComplete="name" value={form.name} onChange={(e) => update("name", e.target.value)} />
            </Field>
            <div className="field-row">
              <Field label="E-mail" error={err("customer.email")}>
                <input type="email" inputMode="email" autoComplete="email" value={form.email} onChange={(e) => update("email", e.target.value)} onBlur={postLead} />
              </Field>
              <Field label="WhatsApp / Celular" error={err("customer.phone")}>
                <input inputMode="tel" autoComplete="tel" value={form.phone} onChange={(e) => update("phone", maskPhone(e.target.value))} onBlur={postLead} placeholder="(11) 90000-0000" />
              </Field>
            </div>
            <Field label="CPF" error={err("customer.cpf")} hint="Necessário para gerar o PIX.">
              <input inputMode="numeric" value={form.cpf} onChange={(e) => update("cpf", maskCpf(e.target.value))} placeholder="000.000.000-00" />
            </Field>
          </fieldset>

          <fieldset className="field-group">
            <legend>Endereço de entrega</legend>
            <div className="field-row">
              <Field label="CEP" error={err("address.cep")}>
                <input inputMode="numeric" autoComplete="postal-code" value={form.cep} onChange={(e) => update("cep", maskCep(e.target.value))} onBlur={(e) => lookupCep(e.target.value)} placeholder="00000-000" />
              </Field>
              <Field label="Número" error={err("address.number")}>
                <input value={form.number} onChange={(e) => update("number", e.target.value)} />
              </Field>
            </div>
            <Field label="Endereço" error={err("address.street")}>
              <input autoComplete="address-line1" value={form.street} onChange={(e) => update("street", e.target.value)} />
            </Field>
            <Field label="Complemento (opcional)" error={err("address.complement")}>
              <input value={form.complement} onChange={(e) => update("complement", e.target.value)} />
            </Field>
            <Field label="Bairro" error={err("address.district")}>
              <input value={form.district} onChange={(e) => update("district", e.target.value)} />
            </Field>
            <div className="field-row">
              <Field label="Cidade" error={err("address.city")}>
                <input autoComplete="address-level2" value={form.city} onChange={(e) => update("city", e.target.value)} />
              </Field>
              <Field label="UF" error={err("address.state")}>
                <input maxLength={2} autoComplete="address-level1" value={form.state} onChange={(e) => update("state", e.target.value.toUpperCase().replace(/[^A-Z]/g, ""))} placeholder="SP" />
              </Field>
            </div>
          </fieldset>

          <div aria-hidden="true" className="hp-field">
            <label>Não preencha<input tabIndex={-1} autoComplete="off" value={hp} onChange={(e) => setHp(e.target.value)} /></label>
          </div>

          <label className="consent-row">
            <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
            <span>Quero receber novidades e acompanhar meu pedido por e-mail e WhatsApp.</span>
          </label>

          {bumps.length > 0 && (
            <div className="bumps">
              {bumps.map((b) => {
                const sel = selectedBumps.includes(b.id);
                return (
                  <label key={b.id} className={`bump${sel ? " is-on" : ""}`}>
                    <input type="checkbox" checked={sel} onChange={() => setSelectedBumps((cur) => (sel ? cur.filter((x) => x !== b.id) : [...cur, b.id]))} />
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    {b.imageUrl && <img className="bump__img" src={b.imageUrl} alt="" width={48} height={48} />}
                    <div className="bump__info">
                      <strong>{b.title}</strong>
                      {b.description && <span>{b.description}</span>}
                    </div>
                    <span className="bump__price">{b.compareAtPriceCents ? <s>{money(b.compareAtPriceCents)}</s> : null} {money(b.priceCents)}</span>
                  </label>
                );
              })}
            </div>
          )}

          {processorName && (
            <p className="processor-note">
              <ShieldCheck size={15} aria-hidden="true" />
              <span>No app do seu banco, o pagamento aparece como <strong>{processorName}</strong> — é o processador de pagamentos oficial da Somos Todos PT. Pode concluir com tranquilidade.</span>
            </p>
          )}

          {error && <p className="checkout-error" role="alert">{error}</p>}

          <button type="submit" className="button button--large pay-button" disabled={submitting}>
            {submitting ? <><Loader2 size={18} className="spin" aria-hidden="true" /> GERANDO PIX…</> : <>PAGAR {money(total)} COM PIX</>}
          </button>
          <TrustSeals />
          <p className="secure-note"><ShieldCheck size={14} aria-hidden="true" /> Seus dados são usados apenas para o pedido e a entrega. O pagamento é processado por PIX.</p>
        </form>

        <aside className="checkout-summary" aria-label="Resumo do pedido">
          <strong className="summary-title">Resumo do pedido</strong>
          <div className="summary-cart">
            {lines.map((l) => (
              <div className="summary-cart__item" key={`${l.slug}:${l.size}`}>
                <div className="summary-cart__media"><ProductMedia asset={l.media} sizes="56px" /></div>
                <div className="summary-cart__info">
                  <strong>{l.name}</strong>
                  <span>Tam {l.size}</span>
                  <div className="cart-item__qty">
                    <button type="button" aria-label="Diminuir" onClick={() => updateQty(l.slug, l.size, l.qty - 1)}><Minus size={13} /></button>
                    <span>{l.qty}</span>
                    <button type="button" aria-label="Aumentar" onClick={() => updateQty(l.slug, l.size, Math.min(MAX_QUANTITY, l.qty + 1))}><Plus size={13} /></button>
                    <button type="button" className="cart-item__remove" aria-label="Remover" onClick={() => removeItem(l.slug, l.size)}><Trash2 size={14} /></button>
                  </div>
                </div>
                <strong className="summary-cart__total">{money(l.price * l.qty)}</strong>
              </div>
            ))}
          </div>

          {faltaPromo && <p className="cart-promo-hint">🎯 Adicione mais 1 camiseta e <strong>ganhe {multiBuyDiscount.percent}% OFF</strong>!</p>}
          {discount > 0 && <p className="cart-promo-hint cart-promo-hint--on">🎉 {multiBuyDiscount.percent}% de desconto aplicado!</p>}

          <dl className="summary-rows">
            <div><dt>Subtotal</dt><dd>{money(subtotal)}</dd></div>
            {discount > 0 && <div className="cart-totals__disc"><dt>Desconto</dt><dd>-{money(discount)}</dd></div>}
            {bumpsTotal > 0 && <div><dt>Adicionais</dt><dd>{money(bumpsTotal)}</dd></div>}
            <div><dt>Frete</dt><dd className="summary-free">{shipping.mode === "free" ? "Grátis" : money(shippingCents)}</dd></div>
            <div className="summary-total"><dt>Total</dt><dd>{money(total)}</dd></div>
          </dl>
          <p className="summary-eta"><Truck size={15} aria-hidden="true" /> <span><strong>Entrega FULL</strong> — compre hoje e receba amanhã, frete grátis.</span></p>
          <div className="summary-seals">
            <span><ShieldCheck size={14} aria-hidden="true" /> Pagamento 100% seguro</span>
            <span><Lock size={14} aria-hidden="true" /> Ambiente SSL 256-bit</span>
            <span><BadgeCheck size={14} aria-hidden="true" /> Garantia de 7 dias</span>
          </div>
        </aside>
      </div>
    </div>
  );
}

/** Contador de reserva da oferta (frete grátis) — nudge de urgência no topo do checkout. */
function ReserveTimer() {
  const [left, setLeft] = useState(15 * 60);
  useEffect(() => {
    const id = setInterval(() => setLeft((s) => (s > 0 ? s - 1 : 0)), 1000);
    return () => clearInterval(id);
  }, []);
  const mm = String(Math.floor(left / 60)).padStart(2, "0");
  const ss = String(left % 60).padStart(2, "0");
  return (
    <div className="checkout-reserve" role="status">
      <span className="checkout-reserve__dot" aria-hidden="true" />
      <span>Oferta com <strong>frete grátis</strong> reservada por</span>
      <strong className="checkout-reserve__clock">{mm}:{ss}</strong>
    </div>
  );
}

/** Selos de confiança abaixo do botão de pagamento. */
function TrustSeals() {
  return (
    <div className="trust-seals" aria-label="Garantias">
      <div><ShieldCheck size={20} aria-hidden="true" /><span>Pagamento<br />100% seguro</span></div>
      <div><Lock size={20} aria-hidden="true" /><span>Ambiente<br />SSL 256-bit</span></div>
      <div><BadgeCheck size={20} aria-hidden="true" /><span>Garantia de<br />7 dias</span></div>
      <div><Zap size={20} aria-hidden="true" /><span>Confirmação<br />automática</span></div>
    </div>
  );
}

function Field({ label, error, hint, children }: { label: string; error?: string; hint?: string; children: ReactNode }) {
  return (
    <label className={`field${error ? " field--error" : ""}`}>
      <span className="field__label">{label}</span>
      {children}
      {hint && !error && <span className="field__hint">{hint}</span>}
      {error && <span className="field__error">{error}</span>}
    </label>
  );
}
