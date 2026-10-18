import Link from "next/link";
import { redirect } from "next/navigation";
import { isAuthed } from "@/app/lib/auth";
import { ALL_SIZES } from "@/app/config/catalog";
import { NewProductForm } from "./NewProductForm";

export const dynamic = "force-dynamic";

export default async function NewProductPage() {
  if (!(await isAuthed())) redirect("/admin/login");
  return (
    <main className="admin-shell">
      <header className="admin-top">
        <h1>Novo modelo</h1>
        <Link href="/admin" className="admin-link">← Voltar</Link>
      </header>
      <NewProductForm allSizes={[...ALL_SIZES]} />
    </main>
  );
}
