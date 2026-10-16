import type { Metadata } from "next";
import Link from "next/link";
import { getProduct, productPriceCents } from "@/app/config/catalog";
import { sellableMerged } from "@/app/server/content";
import { BrandMark } from "@/app/components/BrandMark";
import { CheckoutClient } from "./CheckoutClient";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Checkout",
  robots: { index: false, follow: false },
};

export default async function CheckoutPage({ searchParams }: { searchParams: Promise<{ produto?: string; tam?: string }> }) {
  const { produto, tam } = await searchParams;
  const model = await sellableMerged(produto);

  if (!model) {
    const exists = getProduct(produto);
    const message = exists
      ? "Este modelo ainda não está disponível para compra. Volte em breve."
      : "Escolha um dos modelos disponíveis na página inicial para continuar.";
    return (
      <main className="checkout-shell checkout-shell--notice">
        <Link href="/" className="brand-mark-link" aria-label="Voltar para a página inicial"><BrandMark compact /></Link>
        <div className="checkout-empty">
          <h1>Compra indisponível</h1>
          <p>{message}</p>
          <Link href="/" className="button button--outline">Ver os modelos</Link>
        </div>
      </main>
    );
  }

  const requested = tam?.toUpperCase();
  const initialSize = requested && model.sizes.includes(requested) ? requested : undefined;

  return (
    <CheckoutClient
      model={{
        slug: model.slug,
        name: model.name,
        priceInCents: productPriceCents(model)!,
        compareAtPriceInCents: model.compareAtPriceInCents,
        sizes: model.sizes,
        media: model.media[0],
      }}
      initialSize={initialSize}
    />
  );
}
