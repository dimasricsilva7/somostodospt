import Link from "next/link";
import { redirect } from "next/navigation";
import { isAuthed } from "@/app/lib/auth";
import { productPriceCents, ALL_SIZES } from "@/app/config/catalog";
import { getCustomProduct, getProductOverride, mergedProduct } from "@/app/server/content";
import { ProductEditor } from "./ProductEditor";

export const dynamic = "force-dynamic";

export default async function AdminProductPage({ params }: { params: Promise<{ slug: string }> }) {
  if (!(await isAuthed())) redirect("/admin/login");
  const { slug } = await params;

  const [merged, override, custom] = await Promise.all([mergedProduct(slug), getProductOverride(slug), getCustomProduct(slug)]);
  if (!merged) redirect("/admin");
  const p = merged;
  const price = productPriceCents(p);

  return (
    <main className="admin-shell">
      <header className="admin-top">
        <h1>Editar modelo</h1>
        <Link href="/admin" className="admin-link">← Voltar</Link>
      </header>
      <ProductEditor
        slug={slug}
        allSizes={[...ALL_SIZES]}
        initial={{
          name: p.name,
          description: p.description,
          priceReais: price !== undefined ? (price / 100).toFixed(2) : "",
          compareReais: p.compareAtPriceInCents ? (p.compareAtPriceInCents / 100).toFixed(2) : "",
          sizes: p.sizes,
          active: p.active,
          mainImageId: override?.mainImageId ?? custom?.mainImageId ?? null,
          currentImage: p.media[0]?.src ?? null,
        }}
      />
    </main>
  );
}
