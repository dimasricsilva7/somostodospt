"use client";

import { Mail } from "lucide-react";
import { useState } from "react";

export function LeadEmailButton({ email }: { email: string | null }) {
  const [state, setState] = useState<"idle" | "sending" | "ok" | "err">("idle");
  if (!email) return null;

  async function send() {
    if (state === "sending") return;
    setState("sending");
    try {
      const res = await fetch("/api/admin/lead-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      setState(res.ok && (await res.json().catch(() => ({})))?.ok ? "ok" : "err");
    } catch {
      setState("err");
    } finally {
      setTimeout(() => setState("idle"), 3000);
    }
  }

  return (
    <button type="button" className={`admin-link admin-link--button lead-email${state === "ok" ? " is-ok" : state === "err" ? " is-err" : ""}`} onClick={send} disabled={state === "sending"}>
      <Mail size={13} aria-hidden="true" /> {state === "sending" ? "Enviando…" : state === "ok" ? "Enviado!" : state === "err" ? "Falhou" : "E-mail"}
    </button>
  );
}
