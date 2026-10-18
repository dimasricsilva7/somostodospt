import Link from "next/link";
import { redirect } from "next/navigation";
import { isAuthed } from "@/app/lib/auth";
import { getOfferAdmin } from "@/app/server/offers";
import { OfferEditor } from "./OfferEditor";

export const dynamic = "force-dynamic";

export default async function OfferEditorPage({ params }: { params: Promise<{ tipo: string; id: string }> }) {
  if (!(await isAuthed())) redirect("/admin/login");
  const { tipo, id } = await params;
  if (tipo !== "bump" && tipo !== "upsell") redirect("/admin/ofertas");

  const offer = id === "novo" ? null : await getOfferAdmin(tipo, id);
  if (id !== "novo" && !offer) redirect("/admin/ofertas");

  const label = tipo === "bump" ? "order bump" : "upsell";
  return (
    <main className="admin-shell">
      <header className="admin-top">
        <h1>{id === "novo" ? `Novo ${label}` : `Editar ${label}`}</h1>
        <Link href="/admin/ofertas" className="admin-link">← Voltar</Link>
      </header>
      <OfferEditor
        type={tipo}
        id={id === "novo" ? null : id}
        initial={{
          title: offer?.title ?? "",
          description: offer?.description ?? "",
          priceReais: offer ? (offer.priceCents / 100).toFixed(2) : "",
          compareReais: offer?.compareAtPriceCents ? (offer.compareAtPriceCents / 100).toFixed(2) : "",
          active: offer?.active ?? false,
          imageId: offer?.imageId ?? null,
        }}
      />
    </main>
  );
}
