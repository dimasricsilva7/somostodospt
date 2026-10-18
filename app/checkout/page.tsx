import type { Metadata } from "next";
import { mergedCatalog, getTexts } from "@/app/server/content";
import { listActiveBumps } from "@/app/server/offers";
import { productPriceCents } from "@/app/config/catalog";
import { CheckoutClient } from "./CheckoutClient";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Checkout",
  robots: { index: false, follow: false },
};

export default async function CheckoutPage({ searchParams }: { searchParams: Promise<{ produto?: string; tam?: string }> }) {
  const { produto, tam } = await searchParams;
  const [catalog, texts, bumps] = await Promise.all([mergedCatalog(), getTexts(), listActiveBumps()]);

  const products = catalog
    .map((p) => {
      const price = productPriceCents(p);
      if (!p.active || p.media.length === 0 || price === undefined) return null;
      return { slug: p.slug, name: p.name, priceInCents: price, compareAtPriceInCents: p.compareAtPriceInCents, sizes: p.sizes, media: p.media[0] };
    })
    .filter((x): x is NonNullable<typeof x> => x !== null);

  return (
    <CheckoutClient
      products={products}
      bumps={bumps}
      processorName={texts.paymentProcessorName}
      initialSlug={produto}
      initialSize={tam?.toUpperCase()}
    />
  );
}
