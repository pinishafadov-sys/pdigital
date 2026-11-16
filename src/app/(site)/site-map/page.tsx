import type { Metadata } from "next";
import Link from "next/link";
import { Breadcrumbs } from "@/components/site/Shared";
import { db } from "@/lib/db";
import { getArticles, getPublishedPages } from "@/lib/queries";

export const metadata: Metadata = {
  title: "מפת האתר",
  description: "כל הדפים, המחלקות והמאמרים באתר pdigital במקום אחד.",
  alternates: { canonical: "/site-map" },
};

export default async function SiteMapPage() {
  const [cats, pages, articles] = await Promise.all([
    db.category.findMany({
      where: { isActive: true, parentId: null },
      orderBy: { sortOrder: "asc" },
      include: { children: { where: { isActive: true }, orderBy: { sortOrder: "asc" } } },
    }),
    getPublishedPages(),
    getArticles(100),
  ]);

  return (
    <main className="page">
      <div className="container">
        <Breadcrumbs items={[{ name: "מפת האתר" }]} />
        <div className="page-title">
          <h1>מפת האתר</h1>
        </div>
        <div className="sitemap-cols">
          <section className="panel" aria-labelledby="sm-main">
            <h2 id="sm-main">ראשי</h2>
            <ul>
              <li><Link href="/">דף הבית</Link></li>
              <li><Link href="/search?tag=SALE">מבצעים</Link></li>
              <li><Link href="/search?tag=NEW">חדש באתר</Link></li>
              <li><Link href="/cart">עגלת קניות</Link></li>
              <li><Link href="/articles">מאמרים</Link></li>
              <li><Link href="/contact">צור קשר</Link></li>
            </ul>
          </section>
          <section className="panel" aria-labelledby="sm-cats">
            <h2 id="sm-cats">מחלקות</h2>
            <ul>
              {cats.map((c) => (
                <li key={c.id}>
                  <Link href={`/category/${c.slug}`}>{c.name}</Link>
                  {c.children.length > 0 && (
                    <ul>
                      {c.children.map((ch) => (
                        <li key={ch.id}>
                          <Link href={`/category/${c.slug}?sub=${ch.id}`}>{ch.name}</Link>
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              ))}
            </ul>
          </section>
          <section className="panel" aria-labelledby="sm-info">
            <h2 id="sm-info">מידע ושירות</h2>
            <ul>
              {pages.map((p) => (
                <li key={p.slug}>
                  <Link href={`/pages/${p.slug}`}>{p.title}</Link>
                </li>
              ))}
            </ul>
          </section>
          {articles.length > 0 && (
            <section className="panel" aria-labelledby="sm-articles">
              <h2 id="sm-articles">מאמרים</h2>
              <ul>
                {articles.map((a) => (
                  <li key={a.id}>
                    <Link href={`/articles/${a.slug}`}>{a.title}</Link>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      </div>
    </main>
  );
}
