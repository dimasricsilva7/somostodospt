"use client";

import { useRouter } from "next/navigation";
import { type ChangeEvent, type FormEvent, useState } from "react";

type Initial = { title: string; description: string; priceReais: string; compareReais: string; active: boolean; imageId: string | null };

function reaisToCents(v: string): number | null {
  const n = Number(v.replace(/\./g, "").replace(",", "."));
  if (!Number.isFinite(n) || n <= 0) return null;
  return Math.round(n * 100);
}

export function OfferEditor({ type, id, initial }: { type: "bump" | "upsell"; id: string | null; initial: Initial }) {
  const router = useRouter();
  const [title, setTitle] = useState(initial.title);
  const [description, setDescription] = useState(initial.description);
  const [priceReais, setPriceReais] = useState(initial.priceReais);
  const [compareReais, setCompareReais] = useState(initial.compareReais);
  const [active, setActive] = useState(initial.active);
  const [imageId, setImageId] = useState<string | null>(initial.imageId);
  const [preview, setPreview] = useState<string | null>(initial.imageId ? `/media/${initial.imageId}` : null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string }>();

  async function onUpload(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setMsg(undefined);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/admin/upload", { method: "POST", body: fd });
      const data = (await res.json().catch(() => ({}))) as { id?: string; url?: string; error?: string };
      if (res.ok && data.id && data.url) {
        setImageId(data.id);
        setPreview(data.url);
      } else setMsg({ type: "err", text: data.error ?? "Falha no upload." });
    } catch {
      setMsg({ type: "err", text: "Falha de conexão no upload." });
    } finally {
      setUploading(false);
    }
  }

  async function save(e: FormEvent) {
    e.preventDefault();
    if (saving) return;
    setSaving(true);
    setMsg(undefined);
    try {
      const res = await fetch("/api/admin/offer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, id, title, description, priceCents: reaisToCents(priceReais), compareAtPriceCents: reaisToCents(compareReais), active, imageId }),
      });
      const data = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string };
      if (res.ok && data.ok) {
        router.push("/admin/ofertas");
        router.refresh();
        return;
      }
      setMsg({ type: "err", text: data.error ?? "Não foi possível salvar." });
    } catch {
      setMsg({ type: "err", text: "Falha de conexão." });
    } finally {
      setSaving(false);
    }
  }

  async function del() {
    if (!id || !confirm("Excluir esta oferta?")) return;
    await fetch("/api/admin/offer", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ type, id, action: "delete" }) }).catch(() => {});
    router.push("/admin/ofertas");
    router.refresh();
  }

  return (
    <form className="admin-form admin-editor" onSubmit={save}>
      <div className="admin-editor__image">
        {preview ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={preview} alt="Prévia" />
        ) : (
          <div className="admin-editor__noimg">Sem imagem</div>
        )}
        <label className="button button--outline button--small">
          {uploading ? "Enviando…" : "Enviar imagem"}
          <input type="file" accept="image/webp,image/jpeg,image/png,image/avif" onChange={onUpload} hidden disabled={uploading} />
        </label>
      </div>

      <label className="admin-field"><span>Título da oferta</span><input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ex.: Adicione um boné por apenas" autoFocus /></label>
      <label className="admin-field"><span>Descrição</span><textarea rows={3} value={description} onChange={(e) => setDescription(e.target.value)} /></label>

      <div className="admin-row">
        <label className="admin-field"><span>Preço (R$)</span><input inputMode="decimal" value={priceReais} onChange={(e) => setPriceReais(e.target.value)} placeholder="29,90" /></label>
        <label className="admin-field"><span>Preço cheio riscado (opcional)</span><input inputMode="decimal" value={compareReais} onChange={(e) => setCompareReais(e.target.value)} placeholder="49,90" /></label>
      </div>

      <label className="admin-check">
        <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} />
        <span>Ativar esta oferta (aparece {type === "bump" ? "no checkout" : "na página do pedido pago"}).</span>
      </label>

      {msg && <p className={msg.type === "ok" ? "admin-ok" : "admin-error"}>{msg.text}</p>}
      <div className="payment-actions__buttons">
        <button type="submit" className="button" disabled={saving || uploading}>{saving ? "Salvando…" : "Salvar oferta"}</button>
        {id && <button type="button" className="button button--small button--outline" onClick={del}>Excluir</button>}
      </div>
    </form>
  );
}
