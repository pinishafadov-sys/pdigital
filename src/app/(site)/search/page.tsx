import type { Metadata } from "next";
import { ProductCard } from "@/components/site/ProductCard";
import { Breadcrumbs } from "@/components/site/Shared";
import Link from "next/link";
import { productsByTag, searchLinks, searchProducts } from "@/lib/queries";

type Search = Promise<{ q?: string; tag?: string }>;
const TAGS = { SALE: "מבצעים", NEW: "חדש באתר", HOT: "להיטים" } as const;

export const metadata: Metadata = { title: "חיפוש", robots: { index: false, follow: true } };

export default async function SearchPage({ searchParams }: { searchParams: Search }) {
  const { q = "", tag } = await searchParams;
  const term = q.slice(0, 80);
  const tagKey = tag && tag in TAGS ? (tag as keyof typeof TAGS) : null;
  const [results, links] = tagKey
    ? [await productsByTag(tagKey), []]
    : await Promise.all([searchProducts(term), term.length >= 2 ? searchLinks(term, 8) : []]);
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
            <input id="q2" type="search" name="q" defaultValue={term} placeholder="חיפוש לפי מוצר, מותג, דגם או עמוד..." maxLength={80} />
            <button type="submit" className="btn btn-primary">חיפוש</button>
          </form>
        )}
        {links.length > 0 && (
          <nav aria-label="עמודים ומחלקות שנמצאו" className="search-links">
            {links.map((l) => (
              <Link key={l.href} href={l.href}>
                <span className="sp-kind">{l.kind}</span>
                {l.label}
              </Link>
            ))}
          </nav>
        )}
        {results.length ? (
          <div className="grid-products">
            {results.map((p) => (
              <ProductCard key={p.id} p={p} />
            ))}
          </div>
        ) : (
          <div className="panel empty">
            {term.length === 1
              ? "הקלידו לפחות 2 תווים"
              : term || tagKey
                ? "לא נמצאו מוצרים. נסו מילה אחרת, שם מותג או דגם."
                : "מה תרצו למצוא היום?"}
          </div>
        )}
      </div>
    </main>
  );
}
