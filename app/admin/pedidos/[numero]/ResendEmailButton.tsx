"use client";

import { Mail } from "lucide-react";
import { useState } from "react";

export function ResendEmailButton({ orderNumber }: { orderNumber: string }) {
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string }>();

  async function resend() {
    if (loading) return;
    setLoading(true);
    setMsg(undefined);
    try {
      const res = await fetch("/api/admin/order-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderNumber }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      setMsg(res.ok ? { type: "ok", text: "E-mail reenviado!" } : { type: "err", text: data.error ?? "Falha ao enviar." });
    } catch {
      setMsg({ type: "err", text: "Falha de conexão." });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="resend-email">
      <button type="button" className="button button--small button--outline" onClick={resend} disabled={loading}>
        <Mail size={14} aria-hidden="true" /> {loading ? "Enviando…" : "Reenviar e-mail ao cliente"}
      </button>
      {msg && <p className={msg.type === "ok" ? "admin-ok" : "admin-error"}>{msg.text}</p>}
    </div>
  );
}
