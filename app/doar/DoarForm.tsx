"use client";

import { Loader2, HeartHandshake } from "lucide-react";
import { type FormEvent, useState } from "react";
import { formatPrice } from "@/app/config/product";
import { maskCpf } from "@/app/lib/validators";
import { DONATION_CENTS } from "@/app/config/commerce";

export function DoarForm() {
  const [form, setForm] = useState({ name: "", email: "", cpf: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<string>();
  const [loading, setLoading] = useState(false);

  function set(key: keyof typeof form, v: string) {
    setForm((f) => ({ ...f, [key]: v }));
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    setError(undefined);
    setErrors({});
    try {
      const res = await fetch("/api/doar", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...form, cpf: form.cpf.replace(/\D/g, "") }) });
      const data = (await res.json().catch(() => ({}))) as { orderNumber?: string; token?: string; error?: string; fields?: Record<string, string> };
      if (res.ok && data.orderNumber && data.token) {
        window.location.assign(`/pedido/${encodeURIComponent(data.orderNumber)}?t=${encodeURIComponent(data.token)}`);
        return;
      }
      if (data.fields) setErrors(data.fields);
      setError(data.error ?? "Não foi possível gerar o PIX.");
      setLoading(false);
    } catch {
      setError("Falha de conexão. Tente novamente.");
      setLoading(false);
    }
  }

  return (
    <form className="doar-form" onSubmit={submit} noValidate>
      <label className={`field${errors.name ? " field--error" : ""}`}>
        <span className="field__label">Seu nome</span>
        <input autoComplete="name" value={form.name} onChange={(e) => set("name", e.target.value)} />
        {errors.name && <span className="field__error">{errors.name}</span>}
      </label>
      <label className={`field${errors.email ? " field--error" : ""}`}>
        <span className="field__label">E-mail</span>
        <input type="email" inputMode="email" autoComplete="email" value={form.email} onChange={(e) => set("email", e.target.value)} />
        {errors.email && <span className="field__error">{errors.email}</span>}
      </label>
      <label className={`field${errors.cpf ? " field--error" : ""}`}>
        <span className="field__label">CPF</span>
        <input inputMode="numeric" value={form.cpf} onChange={(e) => set("cpf", maskCpf(e.target.value))} placeholder="000.000.000-00" />
        {errors.cpf && <span className="field__error">{errors.cpf}</span>}
      </label>

      {error && <p className="checkout-error" role="alert">{error}</p>}

      <button type="submit" className="button button--large pay-button" disabled={loading}>
        {loading ? <><Loader2 size={18} className="spin" aria-hidden="true" /> GERANDO PIX…</> : <><HeartHandshake size={18} aria-hidden="true" /> DOAR {formatPrice(DONATION_CENTS)} COM PIX</>}
      </button>
    </form>
  );
}
