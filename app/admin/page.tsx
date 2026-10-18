import Link from "next/link";
import { redirect } from "next/navigation";
import { isAuthed } from "@/app/lib/auth";
import { mergedCatalog } from "@/app/server/content";
import { getDashboardData } from "@/app/server/dashboard";
import { AdminDashboard } from "./AdminDashboard";
import { LogoutButton } from "./LogoutButton";

export const dynamic = "force-dynamic";

export default async function AdminHome() {
  if (!(await isAuthed())) redirect("/admin/login");
  const [products, data] = await Promise.all([mergedCatalog(), getDashboardData()]);

  return (
    <main className="admin-shell">
      <header className="admin-top">
        <h1>Painel Somos Todos PT</h1>
        <div className="admin-top__actions">
          <Link href="/" className="admin-link" target="_blank">Ver a loja ↗</Link>
          <Link href="/admin/ofertas" className="admin-link">Ofertas</Link>
          <Link href="/admin/textos" className="admin-link">Textos da página</Link>
          <LogoutButton />
        </div>
      </header>

      {!data.ok && (
        <p className="admin-warn">O banco de dados ainda não está acessível — os números podem aparecer zerados.</p>
      )}

      <AdminDashboard initial={data} products={products} />
    </main>
  );
}
