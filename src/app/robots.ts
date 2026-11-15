import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/settings";

export default function robots(): MetadataRoute.Robots {
  const base = siteUrl();
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/admin", "/cart", "/account", "/search", "/*?*sort=", "/*?*limit="] }],
    sitemap: `${base}/sitemap.xml`,
    host: base,
  };
}
