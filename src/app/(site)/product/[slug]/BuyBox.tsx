"use client";

import { useState } from "react";
import { AddToCartButton } from "@/components/site/CartBits";
import { discountPercent, formatPrice } from "@/lib/format";

type V = { id: string; name: string | null; sku: string; price: number; compareAt: number | null; stock: number };

export function BuyBox({ product, variants }: { product: { slug: string; name: string; imageUrl: string | null }; variants: V[] }) {
  const [vid, setVid] = useState(variants[0]?.id);
  const [qty, setQty] = useState(1);
  const v = variants.find((x) => x.id === vid);
  if (!v) return <p className="placeholder">[מחיר]</p>;
  const pct = discountPercent(v.price, v.compareAt);
  const inStock = v.stock > 0;
  const maxQty = Math.max(1, Math.min(v.stock, 10));

  return (
    <>
      <div className="price">
        <span className={`price-now ${pct ? "sale" : ""}`}>₪{formatPrice(v.price)}</span>
        {pct && v.compareAt && (
          <>
            <span className="price-old" style={{ fontSize: 18 }}>
              <span className="visually-hidden">במקום </span>₪{formatPrice(v.compareAt)}
            </span>
            <span className="badge badge-discount">חיסכון {pct}%</span>
          </>
        )}
      </div>
      <p className={`stock ${inStock ? "in" : "out"}`} style={{ margin: 0 }} aria-live="polite">
        {inStock ? (v.stock <= 3 ? `במלאי - נשארו ${v.stock} יחידות אחרונות` : "במלאי") : "אזל מהמלאי"}
      </p>
      {variants.length > 1 && (
        <label className="variant-select">
          בחירת דגם
          <select className="input" value={vid} onChange={(e) => { setVid(e.target.value); setQty(1); }}>
            {variants.map((x) => (
              <option key={x.id} value={x.id}>
                {x.name ?? x.sku} - ₪{formatPrice(x.price)}
                {x.stock <= 0 ? " (אזל)" : ""}
              </option>
            ))}
          </select>
        </label>
      )}
      <div className="buy-row">
        <div className="qty" role="group" aria-label="כמות">
          <button type="button" aria-label="הגדלת כמות" onClick={() => setQty((q) => Math.min(maxQty, q + 1))}>+</button>
          <output aria-live="polite">{qty}</output>
          <button type="button" aria-label="הקטנת כמות" onClick={() => setQty((q) => Math.max(1, q - 1))}>−</button>
        </div>
        <AddToCartButton
          className="btn btn-primary btn-lg"
          qty={qty}
          disabled={!inStock}
          item={{ variantId: v.id, slug: product.slug, name: product.name, variantName: v.name, price: v.price, imageUrl: product.imageUrl }}
        />
      </div>
    </>
  );
}
