"use client";

import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";
import type { SiteTexts } from "@/app/types/content";

const LABELS: Record<keyof SiteTexts, string> = {
  heroEyebrow: "Etiqueta do topo",
  heroTitle: "Título principal",
  heroLead: "Texto de apoio do topo",
  heroStatement: "Frase de destaque (pagamento/entrega)",
  collectionTitle: "Título da coleção",
  collectionSubtitle: "Subtítulo da coleção",
  paymentProcessorName: "Nome do recebedor no PIX (adquirente)",
  announcementText: "Barra do topo (entrega full • 2 camisetas 20% off • frete)",
  urgencyMessage: "Barra de urgência (últimos dias) — deixe vazio para ocultar",
};

const MULTI: (keyof SiteTexts)[] = ["heroLead", "heroStatement", "collectionSubtitle", "announcementText"];

export function TextsEditor({ initial }: { initial: SiteTexts }) {
  const router = useRouter();
  const [values, setValues] = useState<SiteTexts>(initial);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string }>();

  function set(key: keyof SiteTexts, v: string) {
    setValues((cur) => ({ ...cur, [key]: v }));
  }

  async function save(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMsg(undefined);
    try {
      const res = await fetch("/api/admin/texts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (res.ok) {
        setMsg({ type: "ok", text: "Salvo!" });
        router.refresh();
      } else {
        setMsg({ type: "err", text: data.error ?? "Não foi possível salvar." });
      }
    } catch {
      setMsg({ type: "err", text: "Falha de conexão." });
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="admin-form" onSubmit={save}>
      {(Object.keys(LABELS) as (keyof SiteTexts)[]).map((key) => (
        <label className="admin-field" key={key}>
          <span>{LABELS[key]}</span>
          {MULTI.includes(key) ? (
            <textarea rows={2} value={values[key]} onChange={(e) => set(key, e.target.value)} />
          ) : (
            <input value={values[key]} onChange={(e) => set(key, e.target.value)} />
          )}
        </label>
      ))}
      {msg && <p className={msg.type === "ok" ? "admin-ok" : "admin-error"}>{msg.text}</p>}
      <button type="submit" className="button" disabled={saving}>{saving ? "Salvando…" : "Salvar textos"}</button>
    </form>
  );
}
