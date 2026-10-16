import Link from "next/link";
import { redirect } from "next/navigation";
import { isAuthed } from "@/app/lib/auth";
import { listAbandoned } from "@/app/server/leads";
import { formatPrice } from "@/app/config/product";
import { onlyDigits } from "@/app/lib/validators";

export const dynamic = "force-dynamic";

export default async function AdminAbandonedPage() {
  if (!(await isAuthed())) redirect("/admin/login");
  const { rows, ok } = await listAbandoned();

  return (
    <main className="admin-shell">
      <header className="admin-top">
        <h1>Checkouts abandonados</h1>
        <Link href="/admin" className="admin-link">← Voltar</Link>
      </header>
      <p className="admin-muted">Pessoas que começaram a comprar (preencheram contato) mas não pagaram em 15+ min.</p>

      {!ok && <p className="admin-warn">Não foi possível ler (banco indisponível).</p>}
      {ok && rows.length === 0 && <p className="admin-muted">Nenhum checkout abandonado por enquanto.</p>}

      {rows.length > 0 && (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead><tr><th>Quando</th><th>Nome</th><th>Contato</th><th>Produto</th><th>Total</th><th></th></tr></thead>
            <tbody>
              {rows.map((l, i) => {
                const wa = l.phone ? `https://wa.me/55${onlyDigits(l.phone)}` : null;
                return (
                  <tr key={i}>
                    <td>{new Date(l.updatedAt).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}</td>
                    <td>{l.name ?? "—"}</td>
                    <td>{l.email ?? ""}{l.email && l.phone ? " · " : ""}{l.phone ?? ""}</td>
                    <td>{l.productName ?? "—"}{l.size ? ` · ${l.size}` : ""}</td>
                    <td>{formatPrice(l.totalCents)}</td>
                    <td>{wa && <a className="admin-link" href={wa} target="_blank" rel="noreferrer">WhatsApp ↗</a>}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
