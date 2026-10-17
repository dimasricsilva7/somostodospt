"use client";

import { ArrowLeft, Loader2, Lock, Minus, Plus, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { type FormEvent, type ReactNode, useEffect, useRef, useState } from "react";
import { AnnounceBar } from "@/app/components/AnnounceBar";
import { Heartbeat } from "@/app/components/Heartbeat";
import { BrandMark } from "@/app/components/BrandMark";
import { ProductMedia } from "@/app/components/ProductMedia";
import { formatPrice, type ProductMedia as ProductMediaType } from "@/app/config/product";
import { MAX_QUANTITY, shipping, shippingCents } from "@/app/config/commerce";
import { computeTotals } from "@/app/lib/pricing";
import { maskCep, maskCpf, maskPhone, onlyDigits } from "@/app/lib/validators";
import { buildClientContext, getConsentChoice, newEventId, track } from "@/app/lib/tracking";

type CheckoutModel = {
  slug: string;
  name: string;
  priceInCents: number;
  compareAtPriceInCents?: number;
  sizes: string[];
  media: ProductMediaType;
};

type Fields = Record<string, string>;

const CURRENCY = "BRL";
const money = (c: number) => formatPrice(c) ?? "—";

export function CheckoutClient({ model, initialSize }: { model: CheckoutModel; initialSize?: string }) {
  const router = useRouter();
  const sizes = model.sizes;
  const unitPrice = model.priceInCents;

  const [size, setSize] = useState<string>(initialSize ?? "");
  const [quantity, setQuantity] = useState(1);
  const [form, setForm] = useState({ name: "", email: "", phone: "", cpf: "", cep: "", street: "", number: "", complement: "", district: "", city: "", state: "" });
  const [hp, setHp] = useState("");
  const [consent, setConsent] = useState(false);
  const [errors, setErrors] = useState<Fields>({});
  const [error, setError] = useState<string>();
  const [submitting, setSubmitting] = useState(false);
  const startedAt = useRef(0);
  const checkoutToken = useRef("");

  const totals = computeTotals([{ unitPriceCents: unitPrice, quantity }], shippingCents());

  useEffect(() => {
    startedAt.current = Date.now();
    checkoutToken.current = newEventId().replace(/-/g, "").slice(0, 32).padEnd(16, "0");
    track("InitiateCheckout", { content_name: model.name, value: totals.totalCents / 100, currency: CURRENCY }, { eventId: newEventId(), once: true });
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
    if ((!form.email && !form.phone) || !checkoutToken.current) return;
    fetch("/api/checkout/lead", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      keepalive: true,
      body: JSON.stringify({
        clientKey: checkoutToken.current,
        name: form.name,
        email: form.email,
        phone: form.phone,
        productSlug: model.slug,
        productName: model.name,
        size,
        totalCents: totals.totalCents,
      }),
    }).catch(() => {});
  }

  async function lookupCep(cep: string) {
    const digits = onlyDigits(cep);
    if (digits.length !== 8) return;
    try {
      const res = await fetch(`https://viacep.com.br/ws/${digits}/json/`);
      const data = (await res.json()) as { logradouro?: string; bairro?: string; localidade?: string; uf?: string; erro?: boolean };
      if (data.erro) return;
      setForm((f) => ({
        ...f,
        street: f.street || data.logradouro || "",
        district: f.district || data.bairro || "",
        city: data.localidade || f.city,
        state: data.uf || f.state,
      }));
    } catch {
      /* preenchimento manual */
    }
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError(undefined);
    if (!size) {
      setErrors((x) => ({ ...x, size: "Escolha um tamanho" }));
      return;
    }
    if (submitting) return;
    setSubmitting(true);

    const adsConsent = getConsentChoice() !== "rejected";
    const paymentEventId = newEventId();
    track("AddPaymentInfo", { value: totals.totalCents / 100, currency: CURRENCY, content_name: model.name }, { eventId: paymentEventId });

    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          checkoutToken: checkoutToken.current,
          hp,
          elapsedMs: Date.now() - startedAt.current,
          productSlug: model.slug,
          size,
          quantity,
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

  return (
    <div className="checkout-shell">
      <Heartbeat />
      <AnnounceBar />
      <header className="checkout-top">
        <Link href="/" className="brand-mark-link" aria-label="Voltar para a página inicial"><BrandMark compact /></Link>
        <span className="checkout-top__secure"><Lock size={14} aria-hidden="true" /> Checkout seguro</span>
      </header>

      <div className="checkout-grid">
        <form className="checkout-form" onSubmit={submit} noValidate>
          <Link href="/" className="text-link checkout-back"><ArrowLeft size={15} aria-hidden="true" /> Trocar de modelo</Link>
          <h1>Finalizar compra</h1>

          <fieldset className="field-group">
            <legend>Tamanho</legend>
            <div className="size-selector__controls">
              {sizes.map((s) => (
                <button key={s} type="button" className={`size-button${size === s ? " is-selected" : ""}`} onClick={() => { setSize(s); setErrors((e) => { const n = { ...e }; delete n.size; return n; }); }} aria-pressed={size === s}>
                  {s}
                </button>
              ))}
            </div>
            {err("size") && <p className="field__error">{err("size")}</p>}
            <div className="qty-row">
              <span>Quantidade</span>
              <div className="qty-stepper">
                <button type="button" aria-label="Diminuir" onClick={() => setQuantity((q) => Math.max(1, q - 1))} disabled={quantity <= 1}><Minus size={16} /></button>
                <strong aria-live="polite">{quantity}</strong>
                <button type="button" aria-label="Aumentar" onClick={() => setQuantity((q) => Math.min(MAX_QUANTITY, q + 1))} disabled={quantity >= MAX_QUANTITY}><Plus size={16} /></button>
              </div>
            </div>
          </fieldset>

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

          {/* honeypot anti-robô (invisível para pessoas) */}
          <div aria-hidden="true" className="hp-field">
            <label>Não preencha<input tabIndex={-1} autoComplete="off" value={hp} onChange={(e) => setHp(e.target.value)} /></label>
          </div>

          <label className="consent-row">
            <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
            <span>Quero receber novidades e acompanhar meu pedido por e-mail e WhatsApp.</span>
          </label>

          {error && <p className="checkout-error" role="alert">{error}</p>}

          <button type="submit" className="button button--large pay-button" disabled={submitting}>
            {submitting ? <><Loader2 size={18} className="spin" aria-hidden="true" /> GERANDO PIX…</> : <>PAGAR {money(totals.totalCents)} COM PIX</>}
          </button>
          <p className="secure-note"><ShieldCheck size={14} aria-hidden="true" /> Seus dados são usados apenas para o pedido e a entrega. O pagamento é processado por PIX.</p>
        </form>

        <aside className="checkout-summary" aria-label="Resumo do pedido">
          <div className="summary-product">
            <div className="summary-product__media"><ProductMedia asset={model.media} sizes="90px" /></div>
            <div>
              <strong>{model.name}</strong>
              <span>Tamanho: {size || "a escolher"}</span>
              <span>Quantidade: {quantity}</span>
            </div>
          </div>
          <dl className="summary-rows">
            <div><dt>Subtotal</dt><dd>{money(totals.subtotalCents)}</dd></div>
            <div><dt>Frete</dt><dd>{shipping.mode === "free" ? "Grátis" : money(totals.shippingCents)}</dd></div>
            <div className="summary-total"><dt>Total</dt><dd>{money(totals.totalCents)}</dd></div>
          </dl>
          <p className="summary-note">{shipping.mode === "free" ? shipping.label : ""}</p>
        </aside>
      </div>
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
