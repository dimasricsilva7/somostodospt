"use client";

import { Truck, X } from "lucide-react";
import { useEffect, useState } from "react";
import { deliveryNotice } from "@/app/config/commerce";

const KEY = "stpt-delivery-modal";

export function DeliveryModal() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!deliveryNotice.enabled) return;
    try {
      if (sessionStorage.getItem(KEY)) return;
    } catch {
      /* ignore */
    }
    const id = setTimeout(() => setOpen(true), deliveryNotice.delaySeconds * 1000);
    return () => clearTimeout(id);
  }, []);

  function close() {
    setOpen(false);
    try {
      sessionStorage.setItem(KEY, "1");
    } catch {
      /* ignore */
    }
  }

  function goToCollection() {
    close();
    document.getElementById("colecao")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  if (!open) return null;

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="entrega-modal-titulo" onClick={close}>
      <div className="modal-card delivery-modal" onClick={(e) => e.stopPropagation()}>
        <button type="button" className="modal-card__close" aria-label="Fechar aviso" onClick={close}><X size={19} /></button>
        <div className="delivery-modal__icon"><Truck size={30} aria-hidden="true" /></div>
        <p className="eyebrow">ENTREGA</p>
        <h2 id="entrega-modal-titulo">{deliveryNotice.title}</h2>
        <ul className="delivery-modal__list">
          {deliveryNotice.lines.map((line, i) => (
            <li key={i}>{line}</li>
          ))}
        </ul>
        <button type="button" className="button button--large" onClick={goToCollection}>{deliveryNotice.ctaLabel}</button>
      </div>
    </div>
  );
}
