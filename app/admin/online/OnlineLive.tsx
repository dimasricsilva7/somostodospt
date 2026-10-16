"use client";

import { useEffect, useState } from "react";

type OnlineRow = { path: string | null; device: string | null; lastSeenAt: string };
type Data = { count: number; rows: OnlineRow[]; ok: boolean };

const PAGE: Record<string, string> = { "/": "Página inicial", "/checkout": "Checkout" };
function pageName(path: string | null) {
  if (!path) return "—";
  if (PAGE[path]) return PAGE[path];
  if (path.startsWith("/pedido")) return "Pedido (PIX)";
  if (path.startsWith("/checkout")) return "Checkout";
  return path;
}

export function OnlineLive({ initial }: { initial: Data }) {
  const [data, setData] = useState<Data>(initial);

  useEffect(() => {
    let alive = true;
    async function load() {
      try {
        const res = await fetch("/api/admin/online", { cache: "no-store" });
        if (res.ok && alive) setData(await res.json());
      } catch {
        /* ignore */
      }
    }
    const id = setInterval(load, 10_000);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, []);

  return (
    <>
      <div className="online-hero">
        <span className="admin-live admin-live--big"><i /> {data.count}</span>
        <span>pessoa(s) navegando agora</span>
      </div>
      {data.rows.length > 0 && (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead><tr><th>Página</th><th>Dispositivo</th><th>Visto há</th></tr></thead>
            <tbody>
              {data.rows.map((r, i) => {
                const secs = Math.max(0, Math.round((Date.now() - new Date(r.lastSeenAt).getTime()) / 1000));
                return (
                  <tr key={i}>
                    <td>{pageName(r.path)}</td>
                    <td>{r.device ?? "—"}</td>
                    <td>{secs < 60 ? `${secs}s` : `${Math.round(secs / 60)}min`}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      <p className="admin-muted">Atualiza a cada 10s. Conta visitantes ativos nos últimos 5 minutos.</p>
    </>
  );
}
