import Link from "next/link";
import { redirect } from "next/navigation";
import { isAuthed } from "@/app/lib/auth";
import { getSectionImages, getSectionImageOverrides } from "@/app/server/content";
import { SECTION_SLOTS } from "@/app/config/sections";
import { SectionImagesEditor, type SlotInitial } from "./SectionImagesEditor";

export const dynamic = "force-dynamic";

export default async function AdminImagesPage() {
  if (!(await isAuthed())) redirect("/admin/login");
  const [images, overrides] = await Promise.all([getSectionImages(), getSectionImageOverrides()]);

  const slots: SlotInitial[] = SECTION_SLOTS.map((s) => ({
    key: s.key,
    label: s.label,
    currentSrc: images[s.key].src,
    mediaId: overrides[s.key] ?? null,
  }));

  return (
    <main className="admin-shell">
      <header className="admin-top">
        <h1>Imagens das seções</h1>
        <Link href="/admin" className="admin-link">← Voltar</Link>
      </header>
      <p className="admin-intro">Troque a imagem de cada seção da página inicial. Ao remover, volta para a imagem padrão.</p>
      <SectionImagesEditor slots={slots} />
    </main>
  );
}
