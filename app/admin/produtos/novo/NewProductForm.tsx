"use client";

import { useRouter } from "next/navigation";
import { type ChangeEvent, type FormEvent, useState } from "react";

function reaisToCents(v: string): number | null {
  const n = Number(v.replace(/\./g, "").replace(",", "."));
  if (!Number.isFinite(n) || n <= 0) return null;
  return Math.round(n * 100);
}

export function NewProductForm({ allSizes }: { allSizes: string[] }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [priceReais, setPriceReais] = useState("");
  const [compareReais, setCompareReais] = useState("");
  const [sizes, setSizes] = useState<string[]>([...allSizes]);
  const [active, setActive] = useState(true);
  const [mainImageId, setMainImageId] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string }>();

  function toggleSize(s: string) {
    setSizes((cur) => (cur.includes(s) ? cur.filter((x) => x !== s) : [...cur, s]));
  }

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
        setMainImageId(data.id);
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
      const res = await fetch("/api/admin/product-create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, description, priceCents: reaisToCents(priceReais), compareAtPriceCents: reaisToCents(compareReais), sizes, active, mainImageId }),
      });
      const data = (await res.json().catch(() => ({}))) as { ok?: boolean; slug?: string; error?: string };
      if (res.ok && data.slug) {
        router.push(`/admin/produtos/${data.slug}`);
        return;
      }
      setMsg({ type: "err", text: data.error ?? "Não foi possível criar." });
    } catch {
      setMsg({ type: "err", text: "Falha de conexão." });
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="admin-form admin-editor" onSubmit={save}>
      <div className="admin-editor__image">
        {preview ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={preview} alt="Prévia da imagem" />
        ) : (
          <div className="admin-editor__noimg">Sem imagem</div>
        )}
        <label className="button button--outline button--small">
          {uploading ? "Enviando…" : "Enviar imagem"}
          <input type="file" accept="image/webp,image/jpeg,image/png,image/avif" onChange={onUpload} hidden disabled={uploading} />
        </label>
      </div>

      <label className="admin-field"><span>Nome do modelo</span><input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex.: Camiseta Lula Presidente" autoFocus /></label>
      <label className="admin-field"><span>Descrição</span><textarea rows={3} value={description} onChange={(e) => setDescription(e.target.value)} /></label>

      <div className="admin-row">
        <label className="admin-field"><span>Preço (R$)</span><input inputMode="decimal" value={priceReais} onChange={(e) => setPriceReais(e.target.value)} placeholder="49,90" /></label>
        <label className="admin-field"><span>Preço cheio riscado (opcional)</span><input inputMode="decimal" value={compareReais} onChange={(e) => setCompareReais(e.target.value)} placeholder="69,90" /></label>
      </div>

      <div className="admin-field">
        <span>Tamanhos disponíveis</span>
        <div className="admin-sizes">
          {allSizes.map((s) => (
            <button type="button" key={s} className={`size-button size-button--sm${sizes.includes(s) ? " is-selected" : ""}`} onClick={() => toggleSize(s)} aria-pressed={sizes.includes(s)}>{s}</button>
          ))}
        </div>
      </div>

      <label className="admin-check">
        <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} />
        <span>Já colocar à venda (precisa de imagem e preço).</span>
      </label>

      {msg && <p className={msg.type === "ok" ? "admin-ok" : "admin-error"}>{msg.text}</p>}
      <button type="submit" className="button" disabled={saving || uploading}>{saving ? "Criando…" : "Criar modelo"}</button>
    </form>
  );
}
