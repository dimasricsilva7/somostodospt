import type { Metadata } from "next";
import Link from "next/link";
import { product } from "@/app/config/product";
import { priceReady } from "@/app/config/commerce";
import { BrandMark } from "@/app/components/BrandMark";
import { CheckoutClient } from "./CheckoutClient";

export const metadata: Metadata = {
  title: "Checkout",
  robots: { index: false, follow: false },
};

export default async function CheckoutPage({ searchParams }: { searchParams: Promise<{ tam?: string }> }) {
  const { tam } = await searchParams;
  const sizes = product.availableSizes as readonly string[];
  const requested = tam?.toUpperCase();
  const initialSize = requested && sizes.includes(requested) ? requested : undefined;

  if (!priceReady()) {
    return (
      <main className="checkout-shell checkout-shell--notice">
        <Link href="/" className="brand-mark-link" aria-label="Voltar para a página inicial"><BrandMark compact /></Link>
        <div className="checkout-empty">
          <h1>Compra em preparação</h1>
          <p>O preço desta camiseta ainda não foi publicado pelo responsável pela loja. A finalização da compra será ativada em seguida.</p>
          <Link href="/" className="button button--outline">Voltar à página do produto</Link>
        </div>
      </main>
    );
  }

  return <CheckoutClient initialSize={initialSize} />;
}
