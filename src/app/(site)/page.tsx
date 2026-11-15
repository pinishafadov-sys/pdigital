import Link from "next/link";
import { DeptIcon, IconStar } from "@/components/Icons";
import { LogoMark } from "@/components/Logo";
import { DealsTabs } from "@/components/site/DealsTabs";
import { PlaceholderCard, ProductCard } from "@/components/site/ProductCard";
import { TrustStrip } from "@/components/site/Shared";
import { getHomeData, getNavCategories } from "@/lib/queries";
import { getSettings } from "@/lib/settings";

export default async function HomePage() {
  const [s, cats, home] = await Promise.all([getSettings(), getNavCategories(), getHomeData()]);
  const hero = home.hero;
  const depts = cats.filter((c) => c.showOnHome).slice(0, 6);
  const sideDefaults = [
    { eyebrow: "גיימינג", title: "כל מה שגיימר צריך", href: "/category/gaming", cls: "blue" },
    { eyebrow: "רק אצלנו", title: "מוצרים מיוחדים", href: "/category/special", cls: "pink" },
  ];
  const dealTabs = cats.filter((c) => home.deals.some((d) => d.topCategorySlug === c.slug));

  return (
    <main>
      {/* ---------- hero + side banners */}
      <section className="container hero" aria-label="מבצעים מובילים">
        <div
          className={`hero-main ${hero?.imageUrl ? "has-image" : ""}`}
          style={hero?.imageUrl ? { backgroundImage: `url(${JSON.stringify(hero.imageUrl)})` } : undefined}
          role={hero?.imageUrl ? "img" : undefined}
          aria-label={hero?.imageUrl ? hero.alt : undefined}
        >
          <div className="hero-copy">
            <span className="hero-pill">הכל באתר אחד!</span>
            <h1>{hero?.title ?? "הטכנולוגיה שאתם אוהבים, במקום אחד"}</h1>
            <p>{hero?.subtitle ?? "גיימינג, גאדג'טים, מוצרים מיוחדים וסלולר ואלקטרוניקה."}</p>
            <Link href={hero?.linkUrl ?? "/search?tag=SALE"} className="btn btn-primary btn-lg" style={{ marginTop: 6 }}>
              {hero?.buttonText ?? "לכל המבצעים"}
            </Link>
          </div>
          <div className="hero-mark">
            <LogoMark size={150} onDark />
          </div>
        </div>
        <div className="hero-side">
          {[0, 1].map((i) => {
            const b = home.side[i];
            const d = sideDefaults[i];
            return (
              <Link
                key={i}
                href={b?.linkUrl ?? d.href}
                className={`side-banner ${d.cls}`}
                style={b?.imageUrl ? { backgroundImage: `url(${JSON.stringify(b.imageUrl)})` } : undefined}
              >
                <span className="eyebrow">{b?.subtitle ?? d.eyebrow}</span>
                <span className="title">{b?.title ?? d.title}</span>
                <span className="cta">{b?.buttonText ?? "לצפייה"} ←</span>
              </Link>
            );
          })}
        </div>
      </section>

      {/* ---------- departments */}
      <section className="container section" aria-labelledby="depts-title">
        <div className="section-title">
          <h2 id="depts-title">המחלקות שלנו</h2>
          <span className="underline" aria-hidden="true" />
        </div>
        <div className="depts">
          {depts.map((c) => (
            <Link key={c.id} href={`/category/${c.slug}`} className="dept">
              <span className="dept-circle">
                {c.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={c.imageUrl} alt="" loading="lazy" width={180} height={180} />
                ) : (
                  <DeptIcon slug={c.slug} />
                )}
              </span>
              {c.name}
            </Link>
          ))}
        </div>
      </section>

      {/* ---------- weekly deals */}
      <section className="band-orange" aria-labelledby="deals-title">
        <div className="container section">
          <div className="section-head">
            <h2 id="deals-title">מבצעי השבוע</h2>
            <Link href="/search?tag=SALE">לכל המבצעים ←</Link>
          </div>
          {home.deals.length ? (
            <DealsTabs
              tabs={dealTabs.map((c) => ({ slug: c.slug, name: c.name }))}
              cards={home.deals.map((p) => ({ key: p.id, cat: p.topCategorySlug, node: <ProductCard p={p} variant="deal" /> }))}
            />
          ) : (
            <div className="rail">
              {depts.slice(0, 5).map((c) => (
                <PlaceholderCard key={c.id} label={c.name} />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ---------- club */}
      <section className="container section" aria-label="מועדון לקוחות">
        <div className="club">
          <span className="club-badge">{s.home.clubBadge}</span>
          <IconStar className="club-star" />
          <div className="club-text">
            <strong>{s.home.clubTitle}</strong>
            <span>{s.home.clubText}</span>
          </div>
          <Link href="/account?join=1" className="btn btn-purple btn-lg">
            להצטרפות ›
          </Link>
        </div>
      </section>

      {/* ---------- brands */}
      <section className="brands" aria-label="המותגים שלנו">
        <div className="container">
          {(home.brands.length ? home.brands : Array.from({ length: 6 }, (_, i) => ({ id: `ph${i}`, name: "[לוגו מותג]", logoUrl: null, slug: "" }))).map(
            (b) => (
              <div key={b.id} className="brand-tile">
                {b.logoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={b.logoUrl} alt={b.name} loading="lazy" />
                ) : (
                  b.name
                )}
              </div>
            ),
          )}
        </div>
      </section>

      {/* ---------- new arrivals */}
      <section className="band-blue" aria-labelledby="new-title">
        <div className="container section">
          <div className="section-head">
            <h2 id="new-title">חדש באתר</h2>
            <Link href="/search?tag=NEW">לכל החדשים ←</Link>
          </div>
          <div className="rail">
            {home.fresh.length
              ? home.fresh.map((p) => (
                  <div key={p.id}>
                    <ProductCard p={p} variant="new" />
                  </div>
                ))
              : depts.slice(0, 5).map((c) => <PlaceholderCard key={c.id} label={c.name} />)}
          </div>
        </div>
      </section>

      <TrustStrip />
    </main>
  );
}
