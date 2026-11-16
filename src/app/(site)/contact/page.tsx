import type { Metadata } from "next";
import { IconPhone, IconPin, IconWhatsapp } from "@/components/Icons";
import { Breadcrumbs } from "@/components/site/Shared";
import { getSettings, telLink, whatsappLink } from "@/lib/settings";
import { ContactForm } from "./ContactForm";

export const metadata: Metadata = {
  title: "צור קשר",
  description: "יש שאלה על מוצר או הזמנה? השאירו פרטים ונחזור אליכם, או דברו איתנו בוואטסאפ ובטלפון.",
  alternates: { canonical: "/contact" },
};

export default async function ContactPage() {
  const s = await getSettings();
  const wa = whatsappLink(s.business.whatsapp);
  const tel = telLink(s.business.phone);
  return (
    <main className="page">
      <div className="container">
        <Breadcrumbs items={[{ name: "צור קשר" }]} />
        <div className="page-title">
          <h1>צור קשר</h1>
        </div>
        <div className="contact-layout">
          <section className="panel contact-card" aria-labelledby="form-title">
            <h2 id="form-title">השאירו פרטים ונחזור אליכם</h2>
            <ContactForm />
          </section>
          <aside className="panel contact-card" aria-labelledby="direct-title">
            <h2 id="direct-title">או דברו איתנו ישירות</h2>
            <ul className="contact-direct">
              <li>
                <span className="contact-ico" style={{ background: "var(--whatsapp)" }}><IconWhatsapp size={20} color="#fff" /></span>
                {wa ? <a href={wa} target="_blank" rel="noopener noreferrer">וואטסאפ</a> : <span>{s.business.whatsapp}</span>}
              </li>
              <li>
                <span className="contact-ico" style={{ background: "var(--bg-dark)" }}><IconPhone size={18} color="#fff" /></span>
                {tel ? <a href={tel} dir="ltr">{s.business.phone}</a> : <span>{s.business.phone}</span>}
              </li>
              <li>
                <span className="contact-ico" style={{ background: "var(--brand-blue-on-dark)" }}><IconPin size={20} color="var(--text-ink)" /></span>
                {s.business.navigationUrl ? (
                  <a href={s.business.navigationUrl} target="_blank" rel="noopener noreferrer">{s.business.address}</a>
                ) : (
                  <span>{s.business.address}</span>
                )}
              </li>
            </ul>
            <h3>שעות פעילות</h3>
            <p style={{ whiteSpace: "pre-line", margin: 0 }}>{s.business.hours}</p>
          </aside>
        </div>
      </div>
    </main>
  );
}
