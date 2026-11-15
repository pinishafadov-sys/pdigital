import Link from "next/link";
import { IconChat, IconLock, IconShield, IconTruck } from "@/components/Icons";
import { siteUrl } from "@/lib/settings";

export function JsonLd({ data, nonce }: { data: object; nonce?: string }) {
  return (
    <script
      type="application/ld+json"
      nonce={nonce}
      // JSON.stringify + escaping "<" prevents breaking out of the script tag
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }}
    />
  );
}

export type Crumb = { name: string; href?: string };

export function Breadcrumbs({ items }: { items: Crumb[] }) {
  const all: Crumb[] = [{ name: "דף הבית", href: "/" }, ...items];
  const base = siteUrl();
  return (
    <>
      <nav aria-label="פירורי לחם" className="crumbs">
        <ol>
          {all.map((c, i) => (
            <li key={i}>
              {c.href && i < all.length - 1 ? <Link href={c.href}>{c.name}</Link> : <span aria-current="page">{c.name}</span>}
            </li>
          ))}
        </ol>
      </nav>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: all.map((c, i) => ({
            "@type": "ListItem",
            position: i + 1,
            name: c.name,
            ...(c.href ? { item: `${base}${c.href}` } : {}),
          })),
        }}
      />
    </>
  );
}

export function TrustStrip() {
  const items = [
    { Icon: IconTruck, bg: "var(--bg-orange-soft)", color: "var(--text-orange-ink)", title: "משלוחים לכל הארץ", text: "עד הבית או לנקודת איסוף" },
    { Icon: IconLock, bg: "var(--bg-blue-soft)", color: "var(--text-blue-ink)", title: "תשלום מאובטח", text: "כרטיס אשראי ואמצעי תשלום נוספים" },
    { Icon: IconShield, bg: "var(--bg-pink-soft)", color: "var(--text-pink-ink)", title: "אחריות ושירות", text: "מדיניות ברורה לאחריות והחזרות" },
    { Icon: IconChat, bg: "var(--bg-purple-soft)", color: "var(--brand-purple)", title: "שירות אישי", text: "חנות פיזית, וואטסאפ ותמיכה בטלפון" },
  ];
  return (
    <section className="container section" aria-label="למה לקנות אצלנו">
      <div className="trust">
        {items.map(({ Icon, bg, color, title, text }) => (
          <div key={title} className="trust-item">
            <span className="trust-icon" style={{ background: bg }}>
              <Icon size={26} color={color} />
            </span>
            <div>
              <b>{title}</b>
              <span>{text}</span>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
