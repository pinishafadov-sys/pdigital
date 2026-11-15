import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Breadcrumbs, JsonLd } from "@/components/site/Shared";
import { formatDate } from "@/lib/format";
import { getArticle } from "@/lib/queries";
import { plainText, RichText } from "@/lib/rich-text";
import { getSettings, siteUrl } from "@/lib/settings";

type Params = Promise<{ slug: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug } = await params;
  const a = await getArticle(decodeURIComponent(slug));
  if (!a) return {};
  const title = a.seoTitle || a.title;
  const description = a.seoDescription || a.excerpt || plainText(a.body);
  return {
    title,
    description,
    alternates: { canonical: `/articles/${a.slug}` },
    openGraph: {
      type: "article",
      title,
      description,
      url: `/articles/${a.slug}`,
      publishedTime: a.publishedAt?.toISOString(),
      modifiedTime: a.updatedAt.toISOString(),
      ...(a.coverImageUrl ? { images: [{ url: a.coverImageUrl, alt: a.coverImageAlt ?? a.title }] } : {}),
    },
  };
}

export default async function ArticlePage({ params }: { params: Params }) {
  const { slug } = await params;
  const a = await getArticle(decodeURIComponent(slug));
  if (!a) notFound();
  const s = await getSettings();
  const base = siteUrl();

  return (
    <main className="page">
      <div className="container">
        <Breadcrumbs items={[{ name: "מאמרים", href: "/articles" }, { name: a.title }]} />
        <article className="panel prose-panel">
          <h1 style={{ marginTop: 0, fontSize: "clamp(1.75rem, 4vw, 2.25rem)" }}>{a.title}</h1>
          {a.publishedAt && (
            <p className="article-meta">
              פורסם: <time dateTime={a.publishedAt.toISOString()}>{formatDate(a.publishedAt)}</time>
            </p>
          )}
          {a.coverImageUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={a.coverImageUrl} alt={a.coverImageAlt ?? ""} style={{ borderRadius: 12, margin: "16px 0", width: "100%" }} />
          )}
          <RichText text={a.body} />
        </article>
      </div>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "Article",
          headline: a.title,
          description: a.excerpt || plainText(a.body),
          datePublished: a.publishedAt?.toISOString(),
          dateModified: a.updatedAt.toISOString(),
          mainEntityOfPage: `${base}/articles/${a.slug}`,
          inLanguage: "he-IL",
          ...(a.coverImageUrl ? { image: a.coverImageUrl.startsWith("http") ? a.coverImageUrl : `${base}${a.coverImageUrl}` } : {}),
          author: { "@type": "Organization", name: s.business.name },
          publisher: { "@type": "Organization", name: s.business.name, logo: { "@type": "ImageObject", url: `${base}/icon.svg` } },
        }}
      />
    </main>
  );
}
