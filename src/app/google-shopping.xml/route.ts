import { buildFeed, feedXml } from "@/lib/google-feed";
import { getSettings } from "@/lib/settings";

// Public product feed for Google Merchant Center: https://<domain>/google-shopping.xml
// Rebuilt on every request, so new products, prices and stock changes appear automatically.
export const dynamic = "force-dynamic";

export async function GET() {
  const [{ items }, s] = await Promise.all([buildFeed(), getSettings()]);
  return new Response(feedXml(items, s.business.name), {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=900",
    },
  });
}
