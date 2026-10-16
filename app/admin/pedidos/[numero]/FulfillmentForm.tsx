"use client";

import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";

const OPTIONS = [
  { value: "PENDING", label: "A preparar" },
  { value: "PROCESSING", label: "Separando" },
  { value: "SHIPPED", label: "Enviado" },
  { value: "DELIVERED", label: "Entregue" },
];

export function FulfillmentForm({ orderNumber, status, trackingCode }: { orderNumber: string; status: string; trackingCode: string }) {
  const router = useRouter();
  const [value, setValue] = useState(status);
  const [code, setCode] = useState(trackingCode);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string }>();

  async function save(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMsg(undefined);
    try {
      const res = await fetch("/api/admin/order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderNumber, fulfillmentStatus: value, trackingCode: code }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (res.ok) {
        setMsg({ type: "ok", text: "Salvo!" });
        router.refresh();
      } else setMsg({ type: "err", text: data.error ?? "Não foi possível salvar." });
    } catch {
      setMsg({ type: "err", text: "Falha de conexão." });
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="admin-form admin-fulfill" onSubmit={save}>
      <label className="admin-field">
        <span>Status da entrega</span>
        <select value={value} onChange={(e) => setValue(e.target.value)}>
          {OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </label>
      <label className="admin-field">
        <span>Código de rastreio (opcional)</span>
        <input value={code} onChange={(e) => setCode(e.target.value)} placeholder="Ex.: AA123456789BR" />
      </label>
      {msg && <p className={msg.type === "ok" ? "admin-ok" : "admin-error"}>{msg.text}</p>}
      <button type="submit" className="button button--small" disabled={saving}>{saving ? "Salvando…" : "Salvar entrega"}</button>
    </form>
  );
}
