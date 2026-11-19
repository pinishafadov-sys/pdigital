import type { Metadata } from "next";
import Link from "next/link";
import { Breadcrumbs } from "@/components/site/Shared";
import { db } from "@/lib/db";
import { getSettings, telLink, whatsappLink } from "@/lib/settings";
import { CancelForm } from "./CancelForm";

export const metadata: Metadata = {
  title: "ביטול עסקה",
  description: "בקשה לביטול עסקה שבוצעה באתר",
  robots: { index: true, follow: true },
};

export default async function CancelPage({ searchParams }: { searchParams: Promise<{ t?: string }> }) {
  const { t } = await searchParams;
  const s = await getSettings();
  const order = t && /^[a-z0-9]{20,40}$/.test(t) ? await db.order.findUnique({ where: { publicToken: t }, select: { orderNumber: true } }) : null;
  const wa = whatsappLink(s.business.whatsapp);
  const tel = telLink(s.business.phone);

  return (
    <main className="page">
      <div className="container" style={{ maxWidth: 760 }}>
        <Breadcrumbs items={[{ name: "ביטול עסקה" }]} />
        <h1>ביטול עסקה</h1>
        <section className="panel prose-panel">
          <p style={{ marginTop: 0 }}>
            קניתם באתר ורוצים לבטל? מלאו את הטופס ונטפל בבקשה בהקדם. ביטול העסקה וההחזר הכספי נעשים בהתאם לחוק הגנת הצרכן ול
            <Link href="/pages/returns">מדיניות הביטולים וההחזרות</Link> שלנו.
          </p>
          <CancelForm token={order ? t : undefined} orderNumber={order?.orderNumber} />
          <p className="muted" style={{ marginBottom: 0 }}>
            אפשר גם לבקש ביטול
            {tel && <> בטלפון <a href={tel} dir="ltr">{s.business.phone}</a>,</>}
            {wa && <> ב<a href={wa} target="_blank" rel="noopener noreferrer">וואטסאפ</a>,</>}
            {tel || wa ? " או" : ""} דרך עמוד <Link href="/contact">צור קשר</Link>.
          </p>
        </section>
      </div>
    </main>
  );
}
