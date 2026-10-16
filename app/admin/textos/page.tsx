import Link from "next/link";
import { redirect } from "next/navigation";
import { isAuthed } from "@/app/lib/auth";
import { getTexts } from "@/app/server/content";
import { TextsEditor } from "./TextsEditor";

export const dynamic = "force-dynamic";

export default async function AdminTextsPage() {
  if (!(await isAuthed())) redirect("/admin/login");
  const texts = await getTexts();
  return (
    <main className="admin-shell">
      <header className="admin-top">
        <h1>Textos da página</h1>
        <Link href="/admin" className="admin-link">← Voltar</Link>
      </header>
      <TextsEditor initial={texts} />
    </main>
  );
}
