"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { IconCart } from "@/components/Icons";
import { addToCart, useCart, type CartItem } from "@/lib/cart";

export function CartLink() {
  const items = useCart();
  const count = items.reduce((n, i) => n + i.qty, 0);
  const ref = useRef<HTMLSpanElement>(null);
  const first = useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    const el = ref.current;
    if (!el) return;
    el.classList.remove("bump");
    void el.offsetWidth;
    el.classList.add("bump");
  }, [count]);
  return (
    <Link href="/cart" className="cart-link" aria-label={`עגלת קניות, ${count} פריטים`}>
      <IconCart size={26} color="#fff" />
      <span ref={ref} className="cart-count" aria-hidden="true">
        {count}
      </span>
    </Link>
  );
}

type AddProps = {
  item: Omit<CartItem, "qty"> | null;
  qty?: number;
  label?: string;
  className?: string;
  disabled?: boolean;
};

export function AddToCartButton({ item, qty = 1, label = "הוספה לעגלה", className = "btn btn-primary", disabled }: AddProps) {
  const [added, setAdded] = useState(false);
  useEffect(() => {
    if (!added) return;
    const t = setTimeout(() => setAdded(false), 1800);
    return () => clearTimeout(t);
  }, [added]);
  if (!item || disabled) {
    return (
      <button type="button" className={className} disabled>
        {disabled ? "אזל מהמלאי" : label}
      </button>
    );
  }
  return (
    <button
      type="button"
      className={className}
      onClick={() => {
        addToCart(item, qty);
        setAdded(true);
      }}
    >
      <span aria-live="polite">{added ? "✓ נוסף לעגלה" : label}</span>
    </button>
  );
}
