import Link from "next/link";
import { IconBox } from "@/components/Icons";
import { SmartImage } from "@/components/SmartImage";
import { discountPercent, formatPrice } from "@/lib/format";
import type { ProductCardData } from "@/lib/queries";
import { AddToCartButton } from "./CartBits";

const TAG_LABEL = { NEW: "חדש", SALE: "מבצע", HOT: "להיט" } as const;

type Variant = "deal" | "new" | "grid";

export function ProductCard({ p, variant = "grid" }: { p: ProductCardData; variant?: Variant }) {
  const pct = discountPercent(p.price, p.compareAt);
  const onSale = pct !== null;
  const href = `/product/${p.slug}`;
  const cartItem = p.variantId
    ? { variantId: p.variantId, slug: p.slug, name: p.name, variantName: null, price: p.price, imageUrl: p.imageUrl }
    : null;
  const needsChoice = p.variantCount > 1;

  return (
    <article className={`pcard ${variant !== "grid" ? "pcard-center" : ""}`}>
      <div className="pcard-badges">
        {variant === "grid" ? (
          p.tags[0] ? <span className={`badge badge-tag-${p.tags[0]}`}>{TAG_LABEL[p.tags[0]]}</span> : <span />
        ) : (
          <span className="badge badge-cat">{p.categoryName}</span>
        )}
        {variant === "new" ? (
          <span className="badge badge-new">חדש</span>
        ) : (
          onSale && <span className="badge badge-discount">-{pct}%</span>
        )}
      </div>
      <div className="pcard-img">
        {p.imageUrl ? (
          <SmartImage src={p.imageUrl} alt={p.imageAlt} width={220} height={220} sizes="(max-width: 600px) 45vw, 220px" />
        ) : (
          <>
            <IconBox size={40} />
            <span>[תמונת מוצר]</span>
          </>
        )}
      </div>
      <h3 className="pcard-name" style={{ margin: 0 }}>
        <Link href={href}>{p.name}</Link>
      </h3>
      {variant === "grid" && p.cardSpecs.length > 0 && (
        <div className="pcard-specs">
          {p.cardSpecs.map((s) => (
            <div key={s.label}>
              <span>{s.label}</span>
              <b>{s.value}</b>
            </div>
          ))}
        </div>
      )}
      <div className="price">
        <span className={`price-now ${onSale ? "sale" : ""}`}>₪{formatPrice(p.price)}</span>
        {onSale && p.compareAt && (
          <span className="price-old">
            <span className="visually-hidden">במקום </span>₪{formatPrice(p.compareAt)}
          </span>
        )}
      </div>
      {variant === "grid" && !needsChoice ? (
        <AddToCartButton item={cartItem} disabled={!p.inStock} />
      ) : (
        <Link href={href} className="btn btn-primary" style={{ position: "relative", zIndex: 2 }}>
          {variant === "grid" ? "לבחירת דגם ›" : "קנה עכשיו ›"}
        </Link>
      )}
    </article>
  );
}

/** Empty-state cards that match the design while there are no products yet. */
export function PlaceholderCard({ label }: { label?: string }) {
  return (
    <div className="pcard pcard-center" aria-hidden="true">
      <div className="pcard-badges">
        <span className="badge badge-cat">{label ?? "[קטגוריה]"}</span>
        <span />
      </div>
      <div className="pcard-img">
        <IconBox size={40} />
        <span>[תמונת מוצר]</span>
      </div>
      <span className="pcard-name placeholder">[שם מוצר]</span>
      <span className="price-now placeholder">₪ [מחיר]</span>
      <span className="btn btn-primary" style={{ opacity: 0.5 }}>קנה עכשיו ›</span>
    </div>
  );
}
