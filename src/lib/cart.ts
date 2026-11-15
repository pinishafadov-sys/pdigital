"use client";

import { useSyncExternalStore } from "react";

// Client-side cart kept in localStorage. Prices here are for display only:
// at checkout the server re-reads every price and stock from the database.
export type CartItem = {
  variantId: string;
  slug: string;
  name: string;
  variantName: string | null;
  price: number; // agorot
  imageUrl: string | null;
  qty: number;
};

const KEY = "pd-cart";
const EVENT = "pd-cart-change";
const EMPTY: CartItem[] = [];
let cachedRaw: string | null = null;
let cachedItems: CartItem[] = EMPTY;

function read(): CartItem[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw === cachedRaw) return cachedItems;
    cachedRaw = raw;
    const parsed = raw ? JSON.parse(raw) : [];
    cachedItems = Array.isArray(parsed) ? parsed.filter((i) => i && typeof i.variantId === "string").slice(0, 100) : EMPTY;
    return cachedItems;
  } catch {
    return EMPTY;
  }
}

function write(items: CartItem[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(items));
  } catch {}
  window.dispatchEvent(new Event(EVENT));
}

function subscribe(cb: () => void) {
  window.addEventListener(EVENT, cb);
  window.addEventListener("storage", cb);
  return () => {
    window.removeEventListener(EVENT, cb);
    window.removeEventListener("storage", cb);
  };
}

export function useCart() {
  return useSyncExternalStore(subscribe, read, () => EMPTY);
}

export function addToCart(item: Omit<CartItem, "qty">, qty = 1) {
  const items = [...read()];
  const i = items.findIndex((x) => x.variantId === item.variantId);
  if (i >= 0) items[i] = { ...items[i], qty: Math.min(99, items[i].qty + qty) };
  else items.push({ ...item, qty: Math.min(99, qty) });
  write(items);
}

export function setQty(variantId: string, qty: number) {
  const items = read()
    .map((x) => (x.variantId === variantId ? { ...x, qty: Math.max(0, Math.min(99, qty)) } : x))
    .filter((x) => x.qty > 0);
  write(items);
}

export function clearCart() {
  write([]);
}
