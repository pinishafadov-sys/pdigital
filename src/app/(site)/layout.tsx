import { headers } from "next/headers";
import { AccessibilityMenu } from "@/components/site/AccessibilityMenu";
import { Footer } from "@/components/site/Footer";
import { Header } from "@/components/site/Header";
import { VisitTracker } from "@/components/site/VisitTracker";
import { JsonLd } from "@/components/site/Shared";
import { isPlaceholder } from "@/lib/format";
import { getSettings, siteUrl } from "@/lib/settings";

export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const s = await getSettings();
  const nonce = (await headers()).get("x-nonce") ?? undefined;
  const base = siteUrl();
  const sameAs = [s.business.facebook, s.business.instagram, s.business.tiktok].filter((u) => u.startsWith("http"));

  return (
    <>
      <a href="#main" className="skip-link">
        דילוג לתוכן הראשי
      </a>
      <Header />
      <div className="shipping-bar" role="note">
        {s.shipping.barText}
      </div>
      <div id="main" tabIndex={-1} style={{ outline: "none" }}>
        {children}
      </div>
      <Footer />
      <AccessibilityMenu />
      <VisitTracker />
      <JsonLd
        nonce={nonce}
        data={{
          "@context": "https://schema.org",
          "@graph": [
            {
              "@type": "WebSite",
              "@id": `${base}/#website`,
              url: base,
              name: s.business.name,
              inLanguage: "he-IL",
              potentialAction: {
                "@type": "SearchAction",
                target: { "@type": "EntryPoint", urlTemplate: `${base}/search?q={search_term_string}` },
                "query-input": "required name=search_term_string",
              },
            },
            {
              "@type": ["Organization", "Store"],
              "@id": `${base}/#organization`,
              name: s.business.name,
              url: base,
              logo: `${base}/icon.svg`,
              slogan: "הכל באתר אחד!",
              ...(isPlaceholder(s.business.phone) ? {} : { telephone: s.business.phone }),
              ...(isPlaceholder(s.business.email) ? {} : { email: s.business.email }),
              ...(isPlaceholder(s.business.address)
                ? {}
                : {
                    address: {
                      "@type": "PostalAddress",
                      streetAddress: s.business.address,
                      ...(isPlaceholder(s.business.city) ? {} : { addressLocality: s.business.city }),
                      addressCountry: "IL",
                    },
                  }),
              ...(sameAs.length ? { sameAs } : {}),
            },
          ],
        }}
      />
    </>
  );
}
