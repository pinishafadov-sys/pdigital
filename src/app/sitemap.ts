import type { MetadataRoute } from "next";
import { db } from "@/lib/db";
import { siteUrl } from "@/lib/settings";

export const dynamic = "force-dynamic";

// /sitemap.xml - submitted to Google Search Console. Updates automatically from the database.
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = siteUrl();
  const [cats, products, pages, articles] = await Promise.all([
    db.category.findMany({ where: { isActive: true }, select: { slug: true, updatedAt: true, parentId: true } }),
    db.product.findMany({
      where: { status: "ACTIVE" },
      select: { slug: true, updatedAt: true, images: { select: { url: true }, take: 5, orderBy: { sortOrder: "asc" } } },
    }),
    db.page.findMany({ where: { isPublished: true }, select: { slug: true, updatedAt: true } }),
    db.article.findMany({ where: { isPublished: true, publishedAt: { lte: new Date() } }, select: { slug: true, updatedAt: true } }),
  ]);
  const abs = (u: string) => (u.startsWith("http") ? u : `${base}${u}`);

  return [
    { url: base, changeFrequency: "daily", priority: 1 },
    { url: `${base}/articles`, changeFrequency: "weekly", priority: 0.6 },
    { url: `${base}/contact`, changeFrequency: "yearly", priority: 0.5 },
    { url: `${base}/site-map`, changeFrequency: "monthly", priority: 0.3 },
    ...cats
      .filter((c) => !c.parentId)
      .map((c) => ({ url: `${base}/category/${encodeURIComponent(c.slug)}`, lastModified: c.updatedAt, changeFrequency: "daily" as const, priority: 0.9 })),
    ...products.map((p) => ({
      url: `${base}/product/${encodeURIComponent(p.slug)}`,
      lastModified: p.updatedAt,
      changeFrequency: "weekly" as const,
      priority: 0.8,
      images: p.images.map((i) => abs(i.url)),
    })),
    ...articles.map((a) => ({ url: `${base}/articles/${encodeURIComponent(a.slug)}`, lastModified: a.updatedAt, changeFrequency: "monthly" as const, priority: 0.6 })),
    ...pages.map((p) => ({ url: `${base}/pages/${encodeURIComponent(p.slug)}`, lastModified: p.updatedAt, changeFrequency: "yearly" as const, priority: 0.3 })),
  ];
}
