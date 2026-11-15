import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ProductCard } from "@/components/site/ProductCard";
import { Breadcrumbs, JsonLd } from "@/components/site/Shared";
import { formatPrice } from "@/lib/format";
import { getCategoryBySlug, getCategoryProducts, type CategoryFilters } from "@/lib/queries";
import { siteUrl } from "@/lib/settings";
import { AutoSubmit } from "./AutoSubmit";

type Params = Promise<{ slug: string }>;
type Search = Promise<Record<string, string | string[] | undefined>>;

const PAGE = 24;
const list = (v: string | string[] | undefined) => (Array.isArray(v) ? v : v ? [v] : []).map((s) => s.slice(0, 80)).slice(0, 30);
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v)?.slice(0, 80);
const money = (v: string | undefined) => {
  const n = Number(v);
  return v && Number.isFinite(n) && n >= 0 ? Math.round(n * 100) : undefined;
};

function parseFilters(sp: Record<string, string | string[] | undefined>): CategoryFilters {
  const specs: Record<string, string[]> = {};
  for (const [k, v] of Object.entries(sp)) if (k.startsWith("spec_")) specs[k.slice(5)] = list(v);
  const sort = one(sp.sort);
  return {
    min: money(one(sp.min)),
    max: money(one(sp.max)),
    brands: list(sp.brand),
    types: list(sp.type),
    specs,
    inStock: one(sp.stock) === "1",
    sort: sort === "price-asc" || sort === "price-desc" || sort === "newest" ? sort : "recommended",
    sub: one(sp.sub),
    limit: Math.min(Math.max(Number(one(sp.limit)) || PAGE, PAGE), 500),
  };
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug } = await params;
  const cat = await getCategoryBySlug(decodeURIComponent(slug));
  if (!cat) return {};
  const title = cat.seoTitle || cat.name;
  const description = cat.seoDescription || cat.description || `${cat.name} - מבחר מוצרים במחירים משתלמים ב-pdigital.`;
  return {
    title,
    description,
    alternates: { canonical: `/category/${cat.slug}` },
    openGraph: { title, description, url: `/category/${cat.slug}`, ...(cat.imageUrl ? { images: [cat.imageUrl] } : {}) },
  };
}

export default async function CategoryPage({ params, searchParams }: { params: Params; searchParams: Search }) {
  const { slug } = await params;
  const sp = await searchParams;
  const cat = await getCategoryBySlug(decodeURIComponent(slug));
  if (!cat) notFound();

  const f = parseFilters(sp);
  const { products, total, facets } = await getCategoryProducts(cat.id, cat.children.map((c) => c.id), f);
  const base = `/category/${cat.slug}`;

  // Build URLs for removing a single filter (active filter chips with ×)
  const qs = (mutate: (p: URLSearchParams) => void) => {
    const p = new URLSearchParams();
    for (const [k, v] of Object.entries(sp)) for (const x of list(v)) p.append(k, x);
    mutate(p);
    p.delete("limit");
    const s = p.toString();
    return s ? `${base}?${s}` : base;
  };
  const without = (key: string, value?: string) =>
    qs((p) => {
      if (value === undefined) p.delete(key);
      else {
        const rest = p.getAll(key).filter((x) => x !== value);
        p.delete(key);
        rest.forEach((x) => p.append(key, x));
      }
    });

  const active: { label: string; href: string }[] = [];
  if (f.min !== undefined || f.max !== undefined)
    active.push({
      label: `מחיר: ${f.min !== undefined ? formatPrice(f.min) : "0"} עד ${f.max !== undefined ? formatPrice(f.max) : "∞"} ₪`,
      href: qs((p) => {
        p.delete("min");
        p.delete("max");
      }),
    });
  for (const b of f.brands) active.push({ label: facets.brands.find((x) => x.slug === b)?.name ?? b, href: without("brand", b) });
  for (const t of f.types) active.push({ label: facets.types.find((x) => x.slug === t)?.name ?? t, href: without("type", t) });
  for (const [id, values] of Object.entries(f.specs))
    for (const v of values) {
      const spec = facets.specs.find((s) => s.id === id);
      active.push({ label: `${spec?.label ?? ""} ${v}`.trim(), href: without(`spec_${id}`, v) });
    }
  if (f.inStock) active.push({ label: "במלאי בלבד", href: without("stock") });

  const crumbs = cat.parent
    ? [{ name: cat.parent.name, href: `/category/${cat.parent.slug}` }, { name: cat.name }]
    : [{ name: cat.name }];
  const moreParams = new URLSearchParams();
  for (const [k, v] of Object.entries(sp)) if (k !== "limit") for (const x of list(v)) moreParams.append(k, x);
  moreParams.set("limit", String(f.limit + PAGE));
  const nextLimitHref = `${base}?${moreParams.toString()}`;

  return (
    <main className="page">
      <div className="container">
        <Breadcrumbs items={crumbs} />
        <div className="page-title">
          <h1>{cat.name}</h1>
          <span>{total} מוצרים</span>
        </div>
        {cat.description && <p style={{ marginTop: -8, color: "var(--text-muted)", maxWidth: 760 }}>{cat.description}</p>}

        {cat.children.length > 0 && (
          <nav className="chips" aria-label="תת-קטגוריות">
            <Link href={base} className="chip" aria-current={!f.sub ? "page" : undefined}>
              כל המוצרים
            </Link>
            {cat.children.map((c) => (
              <Link key={c.id} href={`${base}?sub=${c.id}`} className="chip" aria-current={f.sub === c.id ? "page" : undefined}>
                {c.name}
              </Link>
            ))}
          </nav>
        )}

        <div className="cat-layout">
          <details className="panel filters" open>
            <summary>
              <span>סינון</span>
              <span className="toggle-hint" aria-hidden="true">⌄</span>
            </summary>
            <form method="get" action={base} id="filters">
              {f.sub && <input type="hidden" name="sub" value={f.sub} />}
              {f.sort !== "recommended" && <input type="hidden" name="sort" value={f.sort} />}
              <fieldset className="filter-group">
                <legend>מחיר (₪)</legend>
                <div className="row">
                  <label style={{ flex: 1, fontSize: 13, color: "var(--text-muted)" }}>
                    מ-
                    <input className="input" name="min" inputMode="numeric" defaultValue={f.min !== undefined ? f.min / 100 : ""} />
                  </label>
                  <label style={{ flex: 1, fontSize: 13, color: "var(--text-muted)" }}>
                    עד
                    <input className="input" name="max" inputMode="numeric" defaultValue={f.max !== undefined ? f.max / 100 : ""} />
                  </label>
                </div>
              </fieldset>
              {facets.types.length > 1 && (
                <fieldset className="filter-group">
                  <legend>סוג מוצר</legend>
                  {facets.types.map((t) => (
                    <label key={t.slug} className="opt">
                      <input type="checkbox" name="type" value={t.slug} defaultChecked={f.types.includes(t.slug)} />
                      {t.name} <span className="count">({t.count})</span>
                    </label>
                  ))}
                </fieldset>
              )}
              {facets.brands.length > 0 && (
                <fieldset className="filter-group">
                  <legend>מותג</legend>
                  {facets.brands.map((b) => (
                    <label key={b.slug} className="opt">
                      <input type="checkbox" name="brand" value={b.slug} defaultChecked={f.brands.includes(b.slug)} />
                      {b.name} <span className="count">({b.count})</span>
                    </label>
                  ))}
                </fieldset>
              )}
              {facets.specs.map((s) => (
                <fieldset key={s.id} className="filter-group">
                  <legend>{s.label}</legend>
                  {s.options.map(([value, count]) => (
                    <label key={value} className="opt">
                      <input type="checkbox" name={`spec_${s.id}`} value={value} defaultChecked={f.specs[s.id]?.includes(value)} />
                      {value} {s.unit} <span className="count">({count})</span>
                    </label>
                  ))}
                </fieldset>
              ))}
              <fieldset className="filter-group">
                <legend>זמינות</legend>
                <label className="opt">
                  <input type="checkbox" name="stock" value="1" defaultChecked={f.inStock} />
                  במלאי בלבד
                </label>
              </fieldset>
              <div className="filter-actions">
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>
                  החלת סינון
                </button>
                <Link href={f.sub ? `${base}?sub=${f.sub}` : base} className="btn btn-ghost">
                  ניקוי הכל
                </Link>
              </div>
              <AutoSubmit formId="filters" />
            </form>
          </details>

          <section aria-label="תוצאות">
            <div className="panel toolbar">
              <div className="active-filters">
                {active.length ? (
                  <>
                    <span style={{ color: "var(--text-muted)" }}>סינון פעיל:</span>
                    {active.map((a) => (
                      <span key={a.label} className="active-filter">
                        {a.label}
                        <Link href={a.href} aria-label={`הסרת סינון ${a.label}`} scroll={false}>
                          ×
                        </Link>
                      </span>
                    ))}
                  </>
                ) : (
                  <span style={{ color: "var(--text-muted)" }}>מציג את כל המוצרים</span>
                )}
              </div>
              <form method="get" action={base} id="sort-form">
                {Object.entries(sp)
                  .filter(([k]) => k !== "sort" && k !== "limit")
                  .flatMap(([k, v]) => list(v).map((x) => <input key={`${k}=${x}`} type="hidden" name={k} value={x} />))}
                <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14, color: "var(--text-muted)" }}>
                  מיון
                  <select name="sort" defaultValue={f.sort} className="input" style={{ width: "auto", minHeight: 40 }}>
                    <option value="recommended">מומלץ</option>
                    <option value="price-asc">מחיר: מהנמוך לגבוה</option>
                    <option value="price-desc">מחיר: מהגבוה לנמוך</option>
                    <option value="newest">הכי חדשים</option>
                  </select>
                </label>
                <noscript>
                  <button type="submit" className="btn btn-ghost">מיון</button>
                </noscript>
                <AutoSubmit formId="sort-form" />
              </form>
            </div>

            {products.length ? (
              <div className="grid-products">
                {products.map((p) => (
                  <ProductCard key={p.id} p={p} />
                ))}
              </div>
            ) : (
              <div className="panel empty">
                {total === 0 && !active.length
                  ? "[מוצרים יופיעו כאן לאחר הוספתם במערכת הניהול]"
                  : "לא נמצאו מוצרים שמתאימים לסינון. נסו להסיר חלק מהסינונים."}
              </div>
            )}

            {total > products.length && (
              <div className="load-more">
                <span>
                  מוצגים {products.length} מתוך {total} מוצרים
                </span>
                <Link href={nextLimitHref} scroll={false} className="btn btn-outline btn-lg">
                  טען עוד מוצרים
                </Link>
              </div>
            )}
          </section>
        </div>
      </div>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "CollectionPage",
          name: cat.name,
          url: `${siteUrl()}${base}`,
          mainEntity: {
            "@type": "ItemList",
            numberOfItems: total,
            itemListElement: products.slice(0, 24).map((p, i) => ({
              "@type": "ListItem",
              position: i + 1,
              url: `${siteUrl()}/product/${p.slug}`,
              name: p.name,
            })),
          },
        }}
      />
    </main>
  );
}
