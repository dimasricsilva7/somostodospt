import Link from "next/link";
import { redirect } from "next/navigation";
import { isAuthed } from "@/app/lib/auth";
import { onlineNow } from "@/app/server/sessions";
import { OnlineLive } from "./OnlineLive";

export const dynamic = "force-dynamic";

export default async function AdminOnlinePage() {
  if (!(await isAuthed())) redirect("/admin/login");
  const initial = await onlineNow();
  return (
    <main className="admin-shell">
      <header className="admin-top">
        <h1>Online ao vivo</h1>
        <Link href="/admin" className="admin-link">← Voltar</Link>
      </header>
      <OnlineLive initial={initial} />
    </main>
  );
}
