import type { Metadata } from "next";
import Link from "next/link";
import { LogoMark } from "@/components/Logo";
import { Breadcrumbs } from "@/components/site/Shared";
import { formatDate } from "@/lib/format";
import { getArticles } from "@/lib/queries";
import { plainText } from "@/lib/rich-text";

export const metadata: Metadata = {
  title: "מאמרים ומדריכים",
  description: "מדריכים, טיפים והמלצות על גיימינג, גאדג'טים, סלולר ואלקטרוניקה מצוות pdigital.",
  alternates: { canonical: "/articles" },
};

export default async function ArticlesPage() {
  const articles = await getArticles(60);
  return (
    <main className="page">
      <div className="container">
        <Breadcrumbs items={[{ name: "מאמרים" }]} />
        <div className="page-title">
          <h1>מאמרים ומדריכים</h1>
        </div>
        {articles.length ? (
          <div className="articles-grid">
            {articles.map((a) => (
              <Link key={a.id} href={`/articles/${a.slug}`} className="panel article-card">
                <div className="cover">
                  {a.coverImageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={a.coverImageUrl} alt={a.coverImageAlt ?? ""} loading="lazy" width={400} height={225} />
                  ) : (
                    <LogoMark size={60} onDark />
                  )}
                </div>
                <div className="body">
                  {a.publishedAt && <time dateTime={a.publishedAt.toISOString()}>{formatDate(a.publishedAt)}</time>}
                  <h2>{a.title}</h2>
                  <p style={{ margin: 0, color: "var(--text-muted)" }}>{a.excerpt || plainText(a.body, 140)}</p>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="panel empty">[מאמרים יופיעו כאן לאחר שיפורסמו במערכת הניהול]</div>
        )}
      </div>
    </main>
  );
}
