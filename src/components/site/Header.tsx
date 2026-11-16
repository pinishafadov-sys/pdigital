import Link from "next/link";
import { Logo } from "@/components/Logo";
import { IconPhone, IconSearch, IconUser, IconWhatsapp } from "@/components/Icons";
import { getSettings, telLink, whatsappLink } from "@/lib/settings";
import { getNavCategories } from "@/lib/queries";
import { CartLink } from "./CartBits";

function Bubble({ href, label, cls, children }: { href: string | null; label: string; cls: string; children: React.ReactNode }) {
  const inner = (
    <>
      <span className={`bubble ${cls}`}>{children}</span>
      {label}
    </>
  );
  return href ? (
    <a href={href} className="contact-bubble" {...(href.startsWith("http") ? { target: "_blank", rel: "noopener noreferrer" } : {})}>
      {inner}
    </a>
  ) : (
    <span className="contact-bubble" title={`[${label} - יש להגדיר במערכת הניהול]`}>
      {inner}
    </span>
  );
}

export async function Header() {
  const s = await getSettings();
  const cats = await getNavCategories();
  const wa = whatsappLink(s.business.whatsapp);
  const tel = telLink(s.business.phone);

  return (
    <header className="site-header">
      <div className="container">
        <Link href="/" className="header-logo" aria-label={`${s.business.name} - דף הבית`}>
          <Logo />
        </Link>

        <div className="header-contacts">
          <Bubble href={wa} label="וואטסאפ" cls="bubble-whatsapp">
            <IconWhatsapp size={24} color="#fff" />
          </Bubble>
          <Bubble href={tel} label="טלפון" cls="bubble-phone">
            <IconPhone size={22} color="#fff" />
          </Bubble>
        </div>

        <form action="/search" method="get" role="search" className="header-search">
          <label htmlFor="site-search" className="visually-hidden">
            חיפוש מוצר
          </label>
          <input id="site-search" type="search" name="q" placeholder="חיפוש מוצר..." maxLength={80} autoComplete="off" />
          <button type="submit" aria-label="חיפוש">
            <IconSearch size={24} />
          </button>
        </form>

        <div className="header-actions">
          <div className="mobile-contacts">
            {wa && (
              <a href={wa} target="_blank" rel="noopener noreferrer" aria-label="וואטסאפ" style={{ background: "var(--whatsapp)" }}>
                <IconWhatsapp size={20} color="#fff" />
              </a>
            )}
            {tel && (
              <a href={tel} aria-label="התקשרו אלינו" style={{ background: "var(--bg-dark)" }}>
                <IconPhone size={18} color="#fff" />
              </a>
            )}
          </div>
          <CartLink />
          <Link href="/account" className="login-link">
            <IconUser size={26} />
            התחברות
          </Link>
        </div>
      </div>
      {cats.length > 0 && (
        <nav aria-label="מחלקות" className="cat-chips">
          {cats.map((c) => (
            <Link key={c.id} href={`/category/${c.slug}`}>
              {c.name}
            </Link>
          ))}
          <Link href="/articles">מאמרים</Link>
          <Link href="/contact">צור קשר</Link>
        </nav>
      )}
    </header>
  );
}
