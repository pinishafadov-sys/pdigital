"use client";

import { SmartImage } from "@/components/SmartImage";
import Link from "next/link";
import { setQty, useCart } from "@/lib/cart";
import { formatPrice } from "@/lib/format";

export function CartView({ freeShippingFrom }: { freeShippingFrom: number | null }) {
  const items = useCart();
  const subtotal = items.reduce((s, i) => s + i.price * i.qty, 0);

  if (!items.length) {
    return (
      <div className="panel empty">
        <p>העגלה ריקה.</p>
        <Link href="/" className="btn btn-primary">
          להתחיל לקנות
        </Link>
      </div>
    );
  }

  const missing = freeShippingFrom ? freeShippingFrom - subtotal : null;

  return (
    <div className="cart-layout">
      <section className="panel" aria-label="מוצרים בעגלה">
        {items.map((i) => (
          <div key={i.variantId} className="cart-line">
            {i.imageUrl ? (
              <SmartImage src={i.imageUrl} alt="" width={72} height={72} sizes="72px" />
            ) : (
              <span className="ph" />
            )}
            <div>
              <Link href={`/product/${i.slug}`} style={{ fontWeight: 600 }}>
                {i.name}
              </Link>
              {i.variantName && <div style={{ fontSize: 14, color: "var(--text-muted)" }}>{i.variantName}</div>}
              <div style={{ fontSize: 14 }}>₪{formatPrice(i.price)} ליחידה</div>
            </div>
            <div className="cart-controls">
              <div className="qty" role="group" aria-label={`כמות עבור ${i.name}`}>
                <button type="button" aria-label="הגדלת כמות" onClick={() => setQty(i.variantId, i.qty + 1)}>+</button>
                <output>{i.qty}</output>
                <button type="button" aria-label="הקטנת כמות" onClick={() => setQty(i.variantId, i.qty - 1)}>−</button>
              </div>
              <button
                type="button"
                onClick={() => setQty(i.variantId, 0)}
                aria-label={`הסרת ${i.name} מהעגלה`}
                style={{ background: "none", border: 0, color: "var(--text-danger)", cursor: "pointer", fontSize: 14, minHeight: 44, minWidth: 44, padding: "0 8px" }}
              >
                הסרה
              </button>
            </div>
          </div>
        ))}
      </section>
      <aside className="panel cart-summary" aria-label="סיכום הזמנה">
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 18 }}>
          <span>סה&quot;כ מוצרים</span>
          <b>₪{formatPrice(subtotal)}</b>
        </div>
        {missing !== null && (
          <p className="notice" style={{ margin: 0 }}>
            {missing > 0 ? `חסרים ₪${formatPrice(missing)} למשלוח חינם` : "🎉 מגיע לכם משלוח חינם!"}
          </p>
        )}
        <Link href="/checkout" className="btn btn-primary btn-lg">
          מעבר לקופה ›
        </Link>
        <p style={{ margin: 0, fontSize: 13, color: "var(--text-muted)" }}>לא צריך להירשם כדי לקנות.</p>
      </aside>
    </div>
  );
}
