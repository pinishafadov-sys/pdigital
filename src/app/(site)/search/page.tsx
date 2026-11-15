import type { Metadata } from "next";
import { ProductCard } from "@/components/site/ProductCard";
import { Breadcrumbs } from "@/components/site/Shared";
import { productsByTag, searchProducts } from "@/lib/queries";

type Search = Promise<{ q?: string; tag?: string }>;
const TAGS = { SALE: "מבצעים", NEW: "חדש באתר", HOT: "להיטים" } as const;

export const metadata: Metadata = { title: "חיפוש", robots: { index: false, follow: true } };

export default async function SearchPage({ searchParams }: { searchParams: Search }) {
  const { q = "", tag } = await searchParams;
  const term = q.slice(0, 80);
  const tagKey = tag && tag in TAGS ? (tag as keyof typeof TAGS) : null;
  const results = tagKey ? await productsByTag(tagKey) : await searchProducts(term);
  const title = tagKey ? TAGS[tagKey] : term ? `תוצאות חיפוש: ${term}` : "חיפוש";

  return (
    <main className="page">
      <div className="container">
        <Breadcrumbs items={[{ name: title }]} />
        <div className="page-title">
          <h1>{title}</h1>
          <span aria-live="polite">{results.length} מוצרים</span>
        </div>
        {!tagKey && (
          <form action="/search" method="get" role="search" className="header-search" style={{ maxWidth: 640, marginBottom: 20 }}>
            <label htmlFor="q2" className="visually-hidden">חיפוש מוצר</label>
            <input id="q2" type="search" name="q" defaultValue={term} placeholder="חיפוש לפי שם מוצר, דגם או מק״ט..." maxLength={80} />
            <button type="submit" className="btn btn-primary">חיפוש</button>
          </form>
        )}
        {results.length ? (
          <div className="grid-products">
            {results.map((p) => (
              <ProductCard key={p.id} p={p} />
            ))}
          </div>
        ) : (
          <div className="panel empty">
            {term.length === 1 ? "הקלידו לפחות 2 תווים" : term || tagKey ? "לא נמצאו מוצרים." : "מה תרצו למצוא היום?"}
          </div>
        )}
      </div>
    </main>
  );
}
