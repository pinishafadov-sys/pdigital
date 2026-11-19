import type { Metadata, Viewport } from "next";
import { Poppins, Rubik, Secular_One } from "next/font/google";
import { headers } from "next/headers";
import { getSettings, siteUrl } from "@/lib/settings";
import { isPlaceholder } from "@/lib/format";
import "./globals.css";

const rubik = Rubik({ subsets: ["hebrew", "latin"], variable: "--font-rubik", display: "swap" });
const poppins = Poppins({ subsets: ["latin"], weight: "600", variable: "--font-poppins", display: "swap" });
const secularOne = Secular_One({
  subsets: ["hebrew", "latin"],
  weight: "400",
  variable: "--font-secular-one",
  display: "swap",
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover", // lets the bottom buy bar respect the iPhone home-bar area
  themeColor: "#5b2a7e",
};

export async function generateMetadata(): Promise<Metadata> {
  const s = await getSettings();
  const verification: Metadata["verification"] = {};
  if (s.seo.googleVerification) verification.google = s.seo.googleVerification;
  if (s.seo.bingVerification) verification.other = { "msvalidate.01": s.seo.bingVerification };
  return {
    metadataBase: new URL(siteUrl()),
    title: { default: s.seo.title, template: `%s | ${s.business.name}` },
    description: s.seo.description,
    applicationName: s.business.name,
    alternates: { canonical: "/" },
    openGraph: {
      type: "website",
      locale: "he_IL",
      siteName: s.business.name,
      title: s.seo.title,
      description: s.seo.description,
      images: [{ url: "/opengraph-image", width: 1200, height: 630 }],
    },
    twitter: { card: "summary_large_image" },
    robots: { index: true, follow: true, "max-image-preview": "large" },
    verification,
    formatDetection: { telephone: false },
  };
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const h = await headers();
  const nonce = h.get("x-nonce") ?? undefined;
  const isAdmin = h.get("x-pd-admin") === "1";
  const s = await getSettings();
  // No analytics or tracking pixels on admin pages.
  const gaId = !isAdmin && /^G-[A-Z0-9]+$/.test(s.seo.gaId) ? s.seo.gaId : null;
  const gtmId = !isAdmin && /^GTM-[A-Z0-9]+$/.test(s.seo.gtmId) ? s.seo.gtmId : null;
  const fbPixel = !isAdmin && !isPlaceholder(s.seo.facebookPixel) && /^\d+$/.test(s.seo.facebookPixel) ? s.seo.facebookPixel : null;

  return (
    <html
      lang="he"
      dir="rtl"
      className={`${rubik.variable} ${poppins.variable} ${secularOne.variable}`}
      suppressHydrationWarning
    >
      <head>
        {/* Applies saved accessibility preferences before paint (no flash). */}
        <script
          nonce={nonce}
          dangerouslySetInnerHTML={{
            __html: `try{var a=JSON.parse(localStorage.getItem('pd-a11y')||'{}');var d=document.documentElement;if(a.fs)d.style.setProperty('--a11y-scale',a.fs);['contrast','links','readable','still'].forEach(function(k){if(a[k])d.classList.add('a11y-'+k)})}catch(e){}`,
          }}
        />
        {/*
          Tracking scripts (Tag Manager, Analytics, Facebook) load only after the page has
          finished showing, when the browser is idle, so they never slow down what the
          visitor (and Google's speed test) sees. Events are queued until then.
        */}
        {(gtmId || gaId || fbPixel) && (
          <script
            nonce={nonce}
            dangerouslySetInnerHTML={{
              __html: [
                `(function(w,d){function idle(f){var r=function(){(w.requestIdleCallback||function(c){setTimeout(c,300)})(f,{timeout:4000})};d.readyState==='complete'?r():w.addEventListener('load',r)}`,
                `function load(src){var j=d.createElement('script');j.async=true;j.src=src;var n=d.querySelector('script[nonce]');n&&j.setAttribute('nonce',n.nonce||n.getAttribute('nonce'));d.head.appendChild(j)}`,
                `w.dataLayer=w.dataLayer||[];`,
                gtmId ? `w.dataLayer.push({'gtm.start':new Date().getTime(),event:'gtm.js'});idle(function(){load('https://www.googletagmanager.com/gtm.js?id=${gtmId}')});` : "",
                gaId ? `w.gtag=function(){w.dataLayer.push(arguments)};gtag('js',new Date());gtag('config','${gaId}',{anonymize_ip:true});idle(function(){load('https://www.googletagmanager.com/gtag/js?id=${gaId}')});` : "",
                fbPixel
                  ? `var n=w.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};w._fbq=n;n.push=n;n.loaded=true;n.version='2.0';n.queue=[];fbq('init','${fbPixel}');fbq('track','PageView');idle(function(){load('https://connect.facebook.net/en_US/fbevents.js')});`
                  : "",
                `})(window,document);`,
              ].join(""),
            }}
          />
        )}
      </head>
      <body>{children}</body>
    </html>
  );
}
