import type { Metadata } from "next";
import Link from "next/link";
import { BrandMark } from "@/app/components/BrandMark";
import { getTexts } from "@/app/server/content";
import { getActiveUpsell } from "@/app/server/offers";
import { OrderClient } from "./OrderClient";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Seu pedido",
  robots: { index: false, follow: false },
};

export default async function OrderPage({
  params,
  searchParams,
}: {
  params: Promise<{ numero: string }>;
  searchParams: Promise<{ t?: string }>;
}) {
  const { numero } = await params;
  const { t } = await searchParams;

  if (!t) {
    return (
      <main className="checkout-shell checkout-shell--notice">
        <Link href="/" className="brand-mark-link" aria-label="Voltar para a página inicial"><BrandMark compact /></Link>
        <div className="checkout-empty">
          <h1>Link do pedido incompleto</h1>
          <p>Para acompanhar um pedido, use o link completo que aparece após a compra.</p>
          <Link href="/" className="button button--outline">Ir para a página do produto</Link>
        </div>
      </main>
    );
  }

  const [texts, upsell] = await Promise.all([getTexts(), getActiveUpsell()]);
  return <OrderClient orderNumber={decodeURIComponent(numero)} token={t} processorName={texts.paymentProcessorName} announcementText={texts.announcementText} upsell={upsell} />;
}
