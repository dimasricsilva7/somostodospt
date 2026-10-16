"use client";

import { Clock, Flame } from "lucide-react";
import { useEffect, useState } from "react";
import { urgency } from "@/app/config/commerce";

function format(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return h > 0 ? `${pad(h)}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
}

/**
 * Barra de urgência honesta. Só aparece quando `urgency.enabled` é true no config.
 * Promoção com prazo real: conta até `endsAt` verdadeiro (some quando acaba).
 * Nunca cria cronômetro falso nem estoque artificial.
 */
export function UrgencyBar() {
  const endsAtMs = urgency.endsAt ? new Date(urgency.endsAt).getTime() : null;
  const [remaining, setRemaining] = useState<number | null>(endsAtMs ? endsAtMs - Date.now() : null);

  useEffect(() => {
    if (!endsAtMs) return;
    const id = setInterval(() => setRemaining(endsAtMs - Date.now()), 1000);
    return () => clearInterval(id);
  }, [endsAtMs]);

  if (!urgency.enabled || !urgency.message) return null;
  // Promoção com prazo que já expirou → não mostra nada (sem contagem falsa).
  if (urgency.type === "promo" && endsAtMs && remaining !== null && remaining <= 0) return null;
  if (urgency.type === "stock" && (urgency.stockLeft == null || urgency.stockLeft <= 0)) return null;

  return (
    <div className="urgency-bar" role="status">
      <div className="container urgency-bar__inner">
        {urgency.type === "promo" ? <Clock size={17} aria-hidden="true" /> : <Flame size={17} aria-hidden="true" />}
        <span>{urgency.message}</span>
        {urgency.type === "promo" && endsAtMs && remaining !== null && <strong>{format(remaining)}</strong>}
        {urgency.type === "stock" && urgency.stockLeft != null && <strong>{urgency.stockLeft} restantes</strong>}
      </div>
    </div>
  );
}
