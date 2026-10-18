"use client";

import { ArrowRight, Minus, Plus, ShoppingBag, Trash2, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { formatPrice } from "@/app/config/product";
import { discountCentsFor, multiBuyDiscount, shipping } from "@/app/config/commerce";
import { productPriceCents, type CatalogProduct } from "@/app/config/catalog";
import { cartCount, removeItem, updateQty, useCart } from "@/app/lib/cart";
import { ProductMedia } from "./ProductMedia";

const money = (c: number) => formatPrice(c) ?? "—";

export function CartDrawer({ products }: { products: CatalogProduct[] }) {
  const router = useRouter();
  const cart = useCart();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const openCart = () => setOpen(true);
    window.addEventListener("stpt-open-cart", openCart);
    return () => window.removeEventListener("stpt-open-cart", openCart);
  }, []);

  const bySlug = new Map(products.map((p) => [p.slug, p]));
  const lines = cart
    .map((i) => {
      const p = bySlug.get(i.slug);
      const price = p ? productPriceCents(p) : undefined;
      if (!p || price === undefined) return null;
      return { slug: i.slug, size: i.size, qty: i.qty, name: p.name, price, media: p.media[0] };
    })
    .filter((x): x is NonNullable<typeof x> => x !== null);

  const count = cartCount(cart);
  const subtotal = lines.reduce((s, l) => s + l.price * l.qty, 0);
  const discount = discountCentsFor(subtotal, count);
  const total = subtotal - discount + (shipping.mode === "flat" ? shipping.cents : 0);
  const faltaPromo = multiBuyDiscount.enabled && count === multiBuyDiscount.minUnits - 1;

  return (
    <>
      <button type="button" className="cart-fab" onClick={() => setOpen(true)} aria-label={`Abrir carrinho (${count})`}>
        <ShoppingBag size={22} aria-hidden="true" />
        {count > 0 && <span className="cart-fab__count">{count}</span>}
      </button>

      {open && (
        <div className="cart-overlay" role="dialog" aria-modal="true" aria-label="Carrinho" onClick={() => setOpen(false)}>
          <aside className="cart-drawer" onClick={(e) => e.stopPropagation()}>
            <header className="cart-drawer__top">
              <strong>Seu carrinho</strong>
              <button type="button" aria-label="Fechar" onClick={() => setOpen(false)}><X size={20} /></button>
            </header>

            {lines.length === 0 ? (
              <div className="cart-empty">
                <ShoppingBag size={34} aria-hidden="true" />
                <p>Seu carrinho está vazio.</p>
                <button type="button" className="button button--outline button--small" onClick={() => setOpen(false)}>Ver a coleção</button>
              </div>
            ) : (
              <>
                <div className="cart-items">
                  {lines.map((l) => (
                    <div className="cart-item" key={`${l.slug}:${l.size}`}>
                      <div className="cart-item__media"><ProductMedia asset={l.media} sizes="64px" /></div>
                      <div className="cart-item__info">
                        <strong>{l.name}</strong>
                        <span>Tam {l.size} · {money(l.price)}</span>
                        <div className="cart-item__qty">
                          <button type="button" aria-label="Diminuir" onClick={() => updateQty(l.slug, l.size, l.qty - 1)}><Minus size={14} /></button>
                          <span>{l.qty}</span>
                          <button type="button" aria-label="Aumentar" onClick={() => updateQty(l.slug, l.size, l.qty + 1)}><Plus size={14} /></button>
                          <button type="button" className="cart-item__remove" aria-label="Remover" onClick={() => removeItem(l.slug, l.size)}><Trash2 size={15} /></button>
                        </div>
                      </div>
                      <strong className="cart-item__total">{money(l.price * l.qty)}</strong>
                    </div>
                  ))}
                </div>

                {faltaPromo && (
                  <p className="cart-promo-hint">🎯 Adicione mais 1 camiseta e <strong>ganhe {multiBuyDiscount.percent}% OFF</strong> no total!</p>
                )}
                {discount > 0 && (
                  <p className="cart-promo-hint cart-promo-hint--on">🎉 Desconto de {multiBuyDiscount.percent}% aplicado: <strong>-{money(discount)}</strong></p>
                )}

                <dl className="cart-totals">
                  <div><dt>Subtotal</dt><dd>{money(subtotal)}</dd></div>
                  {discount > 0 && <div className="cart-totals__disc"><dt>Desconto</dt><dd>-{money(discount)}</dd></div>}
                  <div><dt>Frete</dt><dd>{shipping.mode === "free" ? "Grátis" : money(shipping.cents)}</dd></div>
                  <div className="cart-totals__total"><dt>Total</dt><dd>{money(total)}</dd></div>
                </dl>

                <button type="button" className="button button--large cart-checkout" onClick={() => { setOpen(false); router.push("/checkout"); }}>
                  FINALIZAR COMPRA <ArrowRight size={18} aria-hidden="true" />
                </button>
              </>
            )}
          </aside>
        </div>
      )}
    </>
  );
}
