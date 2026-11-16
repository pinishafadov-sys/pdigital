import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { IconReturn, IconShield, IconTruck } from "@/components/Icons";
import { ProductCard } from "@/components/site/ProductCard";
import { Breadcrumbs, JsonLd } from "@/components/site/Shared";
import { isPlaceholder } from "@/lib/format";
import { cardsFromAccessories, getProduct, getRelatedAccessories } from "@/lib/queries";
import { plainText, RichText } from "@/lib/rich-text";
import { getSettings, siteUrl } from "@/lib/settings";
import { BuyBox } from "./BuyBox";
import { Gallery } from "./Gallery";

type Params = Promise<{ slug: string }>;
const TAG_LABEL = { NEW: "חדש", SALE: "מבצע", HOT: "להיט" } as const;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug } = await params;
  const p = await getProduct(decodeURIComponent(slug));
  if (!p) return {};
  const title = p.seoTitle || `${p.name}${p.brand ? ` - ${p.brand.name}` : ""}`;
  const description = p.seoDescription || plainText(p.shortDescription || p.description || p.name);
  const soldOut = !p.variants.some((v) => v.stock > 0);
  return {
    title,
    description,
    alternates: { canonical: `/product/${p.slug}` },
    // Sold-out products are hidden from listings; tell Google not to show them either.
    ...(soldOut ? { robots: { index: false, follow: true } } : {}),
    openGraph: {
      type: "website",
      title,
      description,
      url: `/product/${p.slug}`,
      images: p.images.slice(0, 4).map((i) => ({ url: i.url, alt: i.alt })),
    },
  };
}

export default async function ProductPage({ params }: { params: Params }) {
  const { slug } = await params;
  const p = await getProduct(decodeURIComponent(slug));
  if (!p) notFound();
  const s = await getSettings();

  const top = p.category.parent;
  const crumbs = [
    ...(top ? [{ name: top.name, href: `/category/${top.slug}` }] : []),
    { name: p.category.name, href: `/category/${p.category.slug}` },
    { name: p.name },
  ];
  const specs = p.specValues.sort((a, b) => a.specField.sortOrder - b.specField.sortOrder);
  const groups = new Map<string, typeof specs>();
  for (const sv of specs) {
    const g = sv.specField.group || "מפרט טכני";
    groups.set(g, [...(groups.get(g) ?? []), sv]);
  }
  const linked = cardsFromAccessories(p.accessories);
  const accessories = linked.length ? linked : await getRelatedAccessories(top?.id ?? p.categoryId, p.id);
  const base = siteUrl();
  const v0 = p.variants[0];

  return (
    <main className="page">
      <div className="container">
        <Breadcrumbs items={crumbs} />
        <section className="product-top">
          <Gallery images={p.images.map((i) => ({ url: i.url, alt: i.alt }))} name={p.name} />
          <div className="panel buybox">
            <div className="meta">
              {p.tags.map((t) => (
                <span key={t} className={`badge badge-tag-${t}`}>
                  {TAG_LABEL[t]}
                </span>
              ))}
              {p.brand && <span>{p.brand.name}</span>}
              {v0 && <span>· מק&quot;ט: {v0.sku}</span>}
            </div>
            <h1>{p.name}</h1>
            {p.shortDescription && <p style={{ margin: 0, color: "var(--text-body)" }}>{p.shortDescription}</p>}
            <BuyBox
              product={{ slug: p.slug, name: p.name, imageUrl: p.images[0]?.url ?? null }}
              variants={p.variants.map((v) => ({
                id: v.id,
                name: v.name,
                sku: v.sku,
                price: v.price,
                compareAt: v.compareAtPrice,
                stock: v.stock,
              }))}
            />
            <div className="policy-list">
              <div>
                <span className="policy-icon" style={{ background: "var(--bg-orange-soft)" }}>
                  <IconTruck size={20} color="var(--text-orange-ink)" />
                </span>
                <div>
                  <b>משלוח</b>
                  <span className="text">
                    {s.shipping.deliveryTime} · חינם מעל {s.shipping.freeShippingFrom} ₪
                  </span>
                </div>
              </div>
              <div>
                <span className="policy-icon" style={{ background: "var(--bg-pink-soft)" }}>
                  <IconShield size={20} color="var(--text-pink-ink)" />
                </span>
                <div>
                  <b>אחריות</b>
                  <span className="text">
                    {p.warrantyMonths ? `${p.warrantyMonths} חודשי אחריות. ` : ""}
                    {s.shipping.warrantyText}
                  </span>
                </div>
              </div>
              <div>
                <span className="policy-icon" style={{ background: "var(--bg-blue-soft)" }}>
                  <IconReturn size={20} color="var(--text-blue-ink)" />
                </span>
                <div>
                  <b>החזרות</b>
                  <span className="text">{s.shipping.returnsText}</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="panel accordion" aria-label="פרטי המוצר">
          <details open>
            <summary>תיאור המוצר</summary>
            <div className="acc-body">
              {p.description ? <RichText text={p.description} /> : <p className="placeholder">[תיאור המוצר]</p>}
            </div>
          </details>
          {[...groups.entries()].map(([group, rows]) => (
            <details key={group} open={group === "מפרט טכני"}>
              <summary>{group}</summary>
              <dl className="acc-body" style={{ margin: 0 }}>
                {rows.map((r) => (
                  <div key={r.specFieldId} className="spec-row">
                    <dt>{r.specField.label}</dt>
                    <dd>
                      {r.value} {r.specField.unit}
                    </dd>
                  </div>
                ))}
              </dl>
            </details>
          ))}
          <details>
            <summary>משלוחים, אחריות והחזרות</summary>
            <div className="acc-body">
              <p>{s.shipping.warrantyText}</p>
              <p>{s.shipping.returnsText}</p>
              <p>
                לפרטים מלאים: <Link href="/pages/shipping">משלוחים</Link> · <Link href="/pages/returns">אחריות והחזרות</Link>
              </p>
            </div>
          </details>
        </section>

        {accessories.length > 0 && (
          <section aria-labelledby="acc-title">
            <h2 id="acc-title" style={{ fontSize: 26 }}>
              אביזרים שמתאימים למוצר
            </h2>
            <div className="grid-products">
              {accessories.map((a) => (
                <ProductCard key={a.id} p={a} />
              ))}
            </div>
          </section>
        )}
      </div>

      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "Product",
          name: p.name,
          description: plainText(p.description || p.shortDescription || p.name, 5000),
          image: p.images.map((i) => (i.url.startsWith("http") ? i.url : `${base}${i.url}`)),
          sku: v0?.sku,
          ...(v0?.barcode ? { gtin: v0.barcode } : {}),
          ...(p.brand ? { brand: { "@type": "Brand", name: p.brand.name } } : {}),
          category: p.category.name,
          offers: p.variants.map((v) => ({
            "@type": "Offer",
            url: `${base}/product/${p.slug}`,
            priceCurrency: "ILS",
            price: (v.price / 100).toFixed(2),
            sku: v.sku,
            itemCondition: "https://schema.org/NewCondition",
            availability: v.stock > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
            seller: { "@type": "Organization", name: isPlaceholder(s.business.name) ? "pdigital" : s.business.name },
          })),
        }}
      />
    </main>
  );
}
