"use client";

import { Ruler, X } from "lucide-react";
import { useEffect, useState } from "react";
import { sizeChart } from "@/app/config/commerce";

/** Modal da tabela de medidas. Abre com o evento global "stpt-open-sizechart". */
export function SizeChartModal() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const openIt = () => setOpen(true);
    window.addEventListener("stpt-open-sizechart", openIt);
    return () => window.removeEventListener("stpt-open-sizechart", openIt);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  if (!open) return null;

  return (
    <div className="sizechart-overlay" role="dialog" aria-modal="true" aria-labelledby="sizechart-title" onClick={() => setOpen(false)}>
      <div className="sizechart-modal" onClick={(e) => e.stopPropagation()}>
        <button type="button" className="sizechart-close" aria-label="Fechar" onClick={() => setOpen(false)}><X size={20} aria-hidden="true" /></button>
        <h2 id="sizechart-title"><Ruler size={20} aria-hidden="true" /> Tabela de medidas</h2>
        <table className="sizechart-table">
          <thead><tr><th>Tamanho</th><th>Largura (cm)</th><th>Altura (cm)</th></tr></thead>
          <tbody>
            {sizeChart.rows.map((r) => (
              <tr key={r.size}><td><strong>{r.size}</strong></td><td>{r.larguraCm}</td><td>{r.alturaCm}</td></tr>
            ))}
          </tbody>
        </table>
        <p className="sizechart-note">{sizeChart.note}</p>
      </div>
    </div>
  );
}
