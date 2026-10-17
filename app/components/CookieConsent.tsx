"use client";

import { Cookie, X } from "lucide-react";
import { useEffect, useState, useSyncExternalStore } from "react";
import { getConsentChoice, setConsentChoice, type ConsentChoice } from "@/app/lib/tracking";

export function CookieConsent() {
  const choice = useSyncExternalStore(
    (callback) => {
      window.addEventListener("stpt-consent-change", callback);
      return () => window.removeEventListener("stpt-consent-change", callback);
    },
    getConsentChoice,
    () => "undecided" as ConsentChoice,
  );
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const openPreferences = () => setIsOpen(true);
    window.addEventListener("stpt-open-preferences", openPreferences);
    return () => window.removeEventListener("stpt-open-preferences", openPreferences);
  }, []);

  function decide(nextChoice: Exclude<ConsentChoice, "undecided">) {
    setConsentChoice(nextChoice);
    setIsOpen(false);
  }

  if (choice !== "undecided" && !isOpen) return null;

  return (
    <aside className="cookie-banner" aria-label="Preferências de cookies">
      <div className="cookie-banner__icon" aria-hidden="true"><Cookie size={22} /></div>
      <div className="cookie-banner__content">
        <strong>Cookies</strong>
        <p>Usamos cookies para melhorar sua experiência e medir resultados. Você pode recusar quando quiser.</p>
      </div>
      <div className="cookie-banner__actions">
        <button type="button" className="button button--small button--outline" onClick={() => decide("rejected")}>Recusar</button>
        <button type="button" className="button button--small" onClick={() => decide("accepted")}>Aceitar cookies</button>
      </div>
      {isOpen && choice !== "undecided" && (
        <button type="button" className="cookie-banner__close" onClick={() => setIsOpen(false)} aria-label="Fechar preferências">
          <X size={18} />
        </button>
      )}
    </aside>
  );
}
