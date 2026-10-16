import { redirect } from "next/navigation";
import { isAuthed } from "@/app/lib/auth";
import { LoginForm } from "./LoginForm";

export default async function AdminLoginPage() {
  if (await isAuthed()) redirect("/admin");
  return (
    <main className="admin-login">
      <div className="admin-card">
        <h1>Painel Somos Todos PT</h1>
        <p className="admin-muted">Acesso restrito ao responsável pela loja.</p>
        <LoginForm />
      </div>
    </main>
  );
}
