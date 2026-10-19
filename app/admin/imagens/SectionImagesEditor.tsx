"use client";

import { useRouter } from "next/navigation";
import { type ChangeEvent, type FormEvent, useState } from "react";
import type { SectionKey } from "@/app/config/sections";

export type SlotInitial = { key: SectionKey; label: string; currentSrc: string; mediaId: string | null };

type SlotState = { preview: string; mediaId: string | null; uploading: boolean };

export function SectionImagesEditor({ slots }: { slots: SlotInitial[] }) {
  const router = useRouter();
  const [state, setState] = useState<Record<string, SlotState>>(
    () => Object.fromEntries(slots.map((s) => [s.key, { preview: s.currentSrc, mediaId: s.mediaId, uploading: false }])),
  );
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string }>();

  function patch(key: string, p: Partial<SlotState>) {
    setState((cur) => ({ ...cur, [key]: { ...cur[key], ...p } }));
  }

  async function onUpload(key: string, e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    patch(key, { uploading: true });
    setMsg(undefined);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/admin/upload", { method: "POST", body: fd });
      const data = (await res.json().catch(() => ({}))) as { id?: string; url?: string; error?: string };
      if (res.ok && data.id && data.url) {
        patch(key, { mediaId: data.id, preview: data.url, uploading: false });
      } else {
        patch(key, { uploading: false });
        setMsg({ type: "err", text: data.error ?? "Falha no upload." });
      }
    } catch {
      patch(key, { uploading: false });
      setMsg({ type: "err", text: "Falha de conexão no upload." });
    }
  }

  async function save(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMsg(undefined);
    const images: Record<string, string | null> = {};
    for (const s of slots) images[s.key] = state[s.key].mediaId;
    try {
      const res = await fetch("/api/admin/section-images", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ images }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (res.ok) {
        setMsg({ type: "ok", text: "Imagens salvas!" });
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

  const anyUploading = Object.values(state).some((s) => s.uploading);

  return (
    <form className="admin-form" onSubmit={save}>
      <div className="admin-sections-grid">
        {slots.map((s) => {
          const st = state[s.key];
          return (
            <div className="admin-section-card" key={s.key}>
              <div className="admin-editor__image">
                {st.preview ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={st.preview} alt={`Prévia da seção ${s.label}`} />
                ) : (
                  <div className="admin-editor__noimg">Sem imagem</div>
                )}
              </div>
              <strong>{s.label}</strong>
              <label className="button button--outline button--small">
                {st.uploading ? "Enviando…" : "Trocar imagem"}
                <input type="file" accept="image/webp,image/jpeg,image/png,image/avif" onChange={(e) => onUpload(s.key, e)} hidden disabled={st.uploading} />
              </label>
              {st.mediaId && (
                <button type="button" className="text-link" onClick={() => patch(s.key, { mediaId: null, preview: "" })}>
                  Voltar para a imagem padrão
                </button>
              )}
            </div>
          );
        })}
      </div>
      {msg && <p className={msg.type === "ok" ? "admin-ok" : "admin-error"}>{msg.text}</p>}
      <button type="submit" className="button" disabled={saving || anyUploading}>{saving ? "Salvando…" : "Salvar imagens"}</button>
    </form>
  );
}
