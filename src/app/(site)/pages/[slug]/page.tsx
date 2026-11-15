import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Breadcrumbs } from "@/components/site/Shared";
import { formatDate } from "@/lib/format";
import { getPage } from "@/lib/queries";
import { plainText, RichText } from "@/lib/rich-text";
import { getSettings } from "@/lib/settings";

type Params = Promise<{ slug: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug } = await params;
  const page = await getPage(decodeURIComponent(slug));
  if (!page) return {};
  return {
    title: page.seoTitle || page.title,
    description: page.seoDescription || plainText(page.body),
    alternates: { canonical: `/pages/${page.slug}` },
  };
}

export default async function ContentPage({ params }: { params: Params }) {
  const { slug } = await params;
  const page = await getPage(decodeURIComponent(slug));
  if (!page) notFound();

  // Accessibility statement: fill coordinator details from settings
  let body = page.body;
  if (page.slug === "accessibility") {
    const s = await getSettings();
    body = body
      .replaceAll("{{coordinatorName}}", s.accessibility.coordinatorName)
      .replaceAll("{{coordinatorPhone}}", s.accessibility.coordinatorPhone)
      .replaceAll("{{coordinatorEmail}}", s.accessibility.coordinatorEmail)
      .replaceAll("{{updatedAt}}", formatDate(page.updatedAt));
  }

  return (
    <main className="page">
      <div className="container">
        <Breadcrumbs items={[{ name: page.title }]} />
        <article className="panel prose-panel">
          <h1 style={{ marginTop: 0 }}>{page.title}</h1>
          <RichText text={body} />
          <p className="article-meta" style={{ marginTop: 32 }}>
            עודכן לאחרונה: {formatDate(page.updatedAt)}
          </p>
        </article>
      </div>
    </main>
  );
}
