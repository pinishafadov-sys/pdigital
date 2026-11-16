import "server-only";
import { db } from "@/lib/db";
import { LISTED } from "@/lib/queries";
import { plainText } from "@/lib/rich-text";
import { siteUrl } from "@/lib/settings";

// Google Merchant Center product feed (RSS 2.0 with the g: namespace).
// One item per variant; variants of the same product share item_group_id.

export type FeedItem = {
  id: string;
  title: string;
  description: string;
  link: string;
  image: string;
  extraImages: string[];
  price: string;
  salePrice: string | null;
  availability: "in_stock" | "out_of_stock";
  brand: string | null;
  gtin: string | null;
  mpn: string;
  productType: string;
  groupId: string | null;
};

export type FeedProblem = { productId: string; name: string; reasons: string[] };

const money = (agorot: number) => `${(agorot / 100).toFixed(2)} ILS`;
const abs = (u: string) => (u.startsWith("http") ? u : `${siteUrl()}${u}`);
const validGtin = (s: string | null) => !!s && /^(\d{8}|\d{12}|\d{13}|\d{14})$/.test(s.trim());

export async function buildFeed() {
  const products = await db.product.findMany({
    where: LISTED,
    include: {
      brand: { select: { name: true } },
      category: { select: { name: true, parent: { select: { name: true } } } },
      images: { orderBy: { sortOrder: "asc" }, take: 11 },
      variants: { where: { isActive: true }, orderBy: { sortOrder: "asc" } },
    },
    orderBy: { updatedAt: "desc" },
  });

  const items: FeedItem[] = [];
  const problems: FeedProblem[] = [];
  for (const p of products) {
    const reasons: string[] = [];
    if (!p.inGoogleShopping) reasons.push('סומן "לא להציג בגוגל שופינג"');
    if (!p.images.length) reasons.push("חסרה תמונה (חובה בגוגל)");
    if (!p.brand) reasons.push("חסר מותג (מומלץ מאוד)");
    const description = plainText(p.description || p.shortDescription || "", 4900);
    if (!description) reasons.push("חסר תיאור (מומלץ)");
    if (!p.variants.some((v) => validGtin(v.barcode))) reasons.push("אין ברקוד (מומלץ - משפר הופעה בגוגל)");
    const blocking = !p.inGoogleShopping || !p.images.length;
    if (reasons.length) problems.push({ productId: p.id, name: p.name, reasons });
    if (blocking) continue;

    const productType = p.category.parent ? `${p.category.parent.name} > ${p.category.name}` : p.category.name;
    const multi = p.variants.length > 1;
    for (const v of p.variants) {
      if (v.price <= 0) continue;
      const onSale = v.compareAtPrice != null && v.compareAtPrice > v.price;
      items.push({
        id: v.sku,
        title: (v.name ? `${p.name} - ${v.name}` : p.name).slice(0, 150),
        description: description || p.name,
        link: `${siteUrl()}/product/${encodeURIComponent(p.slug)}`,
        image: abs(p.images[0].url),
        extraImages: p.images.slice(1).map((i) => abs(i.url)),
        price: money(onSale ? v.compareAtPrice! : v.price),
        salePrice: onSale ? money(v.price) : null,
        availability: v.stock > 0 ? "in_stock" : "out_of_stock",
        brand: p.brand?.name ?? null,
        gtin: validGtin(v.barcode) ? v.barcode!.trim() : null,
        mpn: v.sku,
        productType,
        groupId: multi ? p.id : null,
      });
    }
  }
  return { items, problems, productCount: products.length };
}

const x = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;" })[c]!).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "");

export function feedXml(items: FeedItem[], storeName: string) {
  const tag = (name: string, value: string | null | undefined) => (value ? `<${name}>${x(value)}</${name}>` : "");
  const body = items
    .map((i) =>
      [
        "<item>",
        tag("g:id", i.id),
        tag("title", i.title),
        tag("description", i.description),
        tag("link", i.link),
        tag("g:image_link", i.image),
        ...i.extraImages.map((u) => tag("g:additional_image_link", u)),
        tag("g:availability", i.availability),
        tag("g:price", i.price),
        tag("g:sale_price", i.salePrice),
        tag("g:condition", "new"),
        tag("g:brand", i.brand),
        tag("g:gtin", i.gtin),
        i.gtin ? "" : tag("g:mpn", i.mpn),
        !i.gtin && !i.brand ? tag("g:identifier_exists", "no") : "",
        tag("g:product_type", i.productType),
        tag("g:item_group_id", i.groupId),
        "</item>",
      ].join(""),
    )
    .join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">
<channel>
<title>${x(storeName)}</title>
<link>${x(siteUrl())}</link>
<description>${x(storeName)} - product feed</description>
${body}
</channel>
</rss>
`;
}
