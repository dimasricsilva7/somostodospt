"use client";

import { ArrowRight, ImageOff } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { formatPrice } from "@/app/config/product";
import { productPriceCents, type CatalogProduct } from "@/app/config/catalog";
import { newEventId, track } from "@/app/lib/tracking";
import { ProductMedia } from "./ProductMedia";

export function CatalogCard({ product }: { product: CatalogProduct }) {
  const router = useRouter();
  const [size, setSize] = useState<string>();
  const [notice, setNotice] = useState<string>();

  const price = productPriceCents(product);
  const priceLabel = price !== undefined ? formatPrice(price) : undefined;
  const compareLabel = product.compareAtPriceInCents ? formatPrice(product.compareAtPriceInCents) : undefined;
  const sellable = product.active && product.media.length > 0 && price !== undefined;

  function selectSize(s: string) {
    setSize(s);
    setNotice(undefined);
    track("SelectSize", { content_name: product.name, size: s });
  }

  function buy() {
    track("CTAClick", { source: "catalogo", content_name: product.name });
    if (!size) {
      setNotice("Escolha um tamanho.");
      return;
    }
    track("InitiateCheckout", { content_name: product.name, size, currency: "BRL", value: (price ?? 0) / 100 }, { eventId: newEventId() });
    router.push(`/checkout?produto=${encodeURIComponent(product.slug)}&tam=${encodeURIComponent(size)}`);
  }

  return (
    <article className={`catalog-card${sellable ? "" : " catalog-card--soon"}`}>
      <div className="catalog-card__media">
        {product.media.length > 0 ? (
          <ProductMedia asset={product.media[0]} sizes="(max-width: 640px) 100vw, (max-width: 900px) 50vw, 360px" />
        ) : (
          <div className="catalog-card__placeholder">
            <ImageOff size={26} aria-hidden="true" />
            <span>Arte em breve</span>
          </div>
        )}
        {!sellable && <span className="catalog-card__badge">Em breve</span>}
      </div>

      <div className="catalog-card__body">
        <h3>{product.name}</h3>
        {priceLabel && sellable ? (
          <p className="catalog-card__price">
            {compareLabel && <span className="price--compare">{compareLabel}</span>}
            {priceLabel}
          </p>
        ) : (
          <p className="catalog-card__price catalog-card__price--soon">Disponível em breve</p>
        )}

        {sellable ? (
          <>
            <div className="catalog-card__sizes" role="group" aria-label={`Tamanho — ${product.name}`}>
              {product.sizes.map((s) => (
                <button key={s} type="button" className={`size-button size-button--sm${size === s ? " is-selected" : ""}`} onClick={() => selectSize(s)} aria-pressed={size === s}>
                  {s}
                </button>
              ))}
            </div>
            {notice && <p className="catalog-card__notice" role="status">{notice}</p>}
            <button type="button" className="button catalog-card__buy" onClick={buy}>
              COMPRAR <ArrowRight size={16} aria-hidden="true" />
            </button>
          </>
        ) : (
          <p className="catalog-card__soon-note">Este modelo ainda não está à venda.</p>
        )}
      </div>
    </article>
  );
}
