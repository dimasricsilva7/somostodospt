"use client";

import { CheckCircle, RefreshCw, Send } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function PaymentActions({ orderNumber, status }: { orderNumber: string; status: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string }>();

  async function run(action: "verify" | "mark-paid" | "resend-meta") {
    if (loading) return;
    if (action === "mark-paid" && !confirm("Confirmar que este pedido foi pago? Isso marca como pago e envia o e-mail de confirmação.")) return;
    setLoading(action);
    setMsg(undefined);
    try {
      const res = await fetch("/api/admin/order-payment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderNumber, action }),
      });
      const data = (await res.json().catch(() => ({}))) as { ok?: boolean; message?: string; error?: string };
      setMsg({ type: data.ok ? "ok" : "err", text: data.message ?? data.error ?? "Concluído." });
      if (data.ok && action !== "resend-meta") router.refresh();
    } catch {
      setMsg({ type: "err", text: "Falha de conexão." });
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="payment-actions">
      <strong>{status === "PAID" ? "Conversão / Meta" : "Recuperar pagamento"}</strong>
      <div className="payment-actions__buttons">
        {status === "PAID" ? (
          <button type="button" className="button button--small button--outline" onClick={() => run("resend-meta")} disabled={!!loading}>
            <Send size={14} aria-hidden="true" /> {loading === "resend-meta" ? "Reenviando…" : "Reenviar conversão ao Meta"}
          </button>
        ) : (
          <>
            <button type="button" className="button button--small button--outline" onClick={() => run("verify")} disabled={!!loading}>
              <RefreshCw size={14} aria-hidden="true" /> {loading === "verify" ? "Verificando…" : "Verificar na BravoPay"}
            </button>
            <button type="button" className="button button--small" onClick={() => run("mark-paid")} disabled={!!loading}>
              <CheckCircle size={14} aria-hidden="true" /> {loading === "mark-paid" ? "Marcando…" : "Marcar como pago"}
            </button>
          </>
        )}
      </div>
      {msg && <p className={msg.type === "ok" ? "admin-ok" : "admin-error"}>{msg.text}</p>}
    </div>
  );
}
