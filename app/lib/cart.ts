"use client";

import { useMemo, useSyncExternalStore } from "react";

export type CartItem = { slug: string; size: string; qty: number };

const KEY = "stpt-cart";
const EVENT = "stpt-cart-change";
export const MAX_QTY_PER_ITEM = 5;
export const MAX_ITEMS = 10;

function isBrowser() {
  return typeof window !== "undefined";
}

export function getCart(): CartItem[] {
  if (!isBrowser()) return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    const list = raw ? (JSON.parse(raw) as CartItem[]) : [];
    return Array.isArray(list)
      ? list.filter((i) => i && typeof i.slug === "string" && typeof i.size === "string" && Number.isFinite(i.qty)).slice(0, MAX_ITEMS)
      : [];
  } catch {
    return [];
  }
}

function save(items: CartItem[]) {
  if (!isBrowser()) return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(items));
  } catch {
    /* ignore */
  }
  window.dispatchEvent(new Event(EVENT));
}

export function addItem(slug: string, size: string, qty = 1) {
  const items = getCart();
  const existing = items.find((i) => i.slug === slug && i.size === size);
  if (existing) {
    existing.qty = Math.min(MAX_QTY_PER_ITEM, existing.qty + qty);
  } else {
    if (items.length >= MAX_ITEMS) return;
    items.push({ slug, size, qty: Math.min(MAX_QTY_PER_ITEM, Math.max(1, qty)) });
  }
  save(items);
}

export function updateQty(slug: string, size: string, qty: number) {
  const items = getCart();
  const item = items.find((i) => i.slug === slug && i.size === size);
  if (!item) return;
  if (qty <= 0) {
    save(items.filter((i) => !(i.slug === slug && i.size === size)));
    return;
  }
  item.qty = Math.min(MAX_QTY_PER_ITEM, qty);
  save(items);
}

export function removeItem(slug: string, size: string) {
  save(getCart().filter((i) => !(i.slug === slug && i.size === size)));
}

export function clearCart() {
  save([]);
}

export function cartCount(items = getCart()): number {
  return items.reduce((s, i) => s + i.qty, 0);
}

function parse(raw: string): CartItem[] {
  try {
    const list = JSON.parse(raw) as CartItem[];
    return Array.isArray(list) ? list.filter((i) => i && typeof i.slug === "string" && typeof i.size === "string" && Number.isFinite(i.qty)) : [];
  } catch {
    return [];
  }
}

/** Hook reativo do carrinho. */
export function useCart(): CartItem[] {
  const raw = useSyncExternalStore(
    (cb) => {
      window.addEventListener(EVENT, cb);
      window.addEventListener("storage", cb);
      return () => {
        window.removeEventListener(EVENT, cb);
        window.removeEventListener("storage", cb);
      };
    },
    () => (isBrowser() ? window.localStorage.getItem(KEY) ?? "[]" : "[]"),
    () => "[]"
  );
  return useMemo(() => parse(raw), [raw]);
}
