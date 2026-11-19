import Link from "next/link";
import { Logo } from "@/components/Logo";
import { IconFacebook, IconInstagram, IconTiktok } from "@/components/Icons";
import { getNavCategories } from "@/lib/queries";
import { getSettings, telLink, whatsappLink } from "@/lib/settings";

export async function Footer() {
  const [s, cats] = await Promise.all([getSettings(), getNavCategories()]);
  const tel = telLink(s.business.phone);
  const wa = whatsappLink(s.business.whatsapp);
  const socials = [
    { url: s.business.facebook, label: "פייסבוק", Icon: IconFacebook },
    { url: s.business.instagram, label: "אינסטגרם", Icon: IconInstagram },
    { url: s.business.tiktok, label: "טיקטוק", Icon: IconTiktok },
  ].filter((x) => x.url.startsWith("http"));

  return (
    <footer className="site-footer">
      <div className="container footer-grid">
        <div className="footer-brand">
          <Logo onDark size="md" showSlogan={false} />
          <span className="footer-pill">הכל באתר אחד!</span>
          <p>{s.home.footerAbout}</p>
          {socials.length > 0 && (
            <div className="socials">
              {socials.map(({ url, label, Icon }) => (
                <a key={label} href={url} target="_blank" rel="noopener noreferrer" aria-label={label}>
                  <Icon size={20} color="#fff" />
                </a>
              ))}
            </div>
          )}
        </div>

        <nav className="footer-col" aria-labelledby="f-shop">
          <h2 id="f-shop">חנות</h2>
          <ul>
            {cats.map((c) => (
              <li key={c.id}>
                <Link href={`/category/${c.slug}`}>{c.name}</Link>
              </li>
            ))}
          </ul>
        </nav>

        <nav className="footer-col" aria-labelledby="f-service">
          <h2 id="f-service">שירות לקוחות</h2>
          <ul>
            <li><Link href="/contact">צור קשר</Link></li>
            <li><Link href="/pages/shipping">משלוחים</Link></li>
            <li><Link href="/pages/returns">אחריות והחזרות</Link></li>
            <li><Link href="/cancel">ביטול עסקה</Link></li>
            <li><Link href="/pages/faq">שאלות נפוצות</Link></li>
            <li><Link href="/pages/terms">תקנון האתר</Link></li>
            <li><Link href="/pages/privacy">מדיניות פרטיות</Link></li>
          </ul>
        </nav>

        <nav className="footer-col" aria-labelledby="f-info">
          <h2 id="f-info">מידע</h2>
          <ul>
            <li><Link href="/articles">מאמרים</Link></li>
            <li><Link href="/pages/about">אודות</Link></li>
            <li><Link href="/site-map">מפת האתר</Link></li>
            <li><Link href="/pages/accessibility">הצהרת נגישות</Link></li>
          </ul>
        </nav>

        <div className="footer-col">
          <h2>יצירת קשר</h2>
          <ul>
            <li>{tel ? <a href={tel}>{s.business.phone}</a> : s.business.phone}</li>
            <li>{wa ? <a href={wa} target="_blank" rel="noopener noreferrer">וואטסאפ</a> : s.business.whatsapp}</li>
            <li>{s.business.email.includes("@") ? <a href={`mailto:${s.business.email}`}>{s.business.email}</a> : s.business.email}</li>
            <li><Link href="/contact">טופס יצירת קשר</Link></li>
          </ul>
        </div>
      </div>
      <div className="container footer-bottom">
        <span>© {new Date().getFullYear()} {s.business.name}. כל הזכויות שמורות.</span>
        <nav aria-label="קישורים משפטיים">
          <Link href="/contact">צור קשר</Link>
          <Link href="/pages/terms">תקנון</Link>
          <Link href="/pages/privacy">פרטיות</Link>
          <Link href="/pages/accessibility">נגישות</Link>
          <Link href="/site-map">מפת האתר</Link>
          <Link href="/articles">מאמרים</Link>
        </nav>
      </div>
    </footer>
  );
}
