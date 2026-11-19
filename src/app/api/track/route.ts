import { createHash } from "node:crypto";
import { cookies, headers } from "next/headers";
import { SESSION_COOKIE } from "@/lib/auth/session";
import { db } from "@/lib/db";

// Counts storefront page views for the admin statistics.
// Privacy: no cookies are set, the IP address is never stored. The visitor id is
// a one-way hash of IP + browser + today's date, so a person counts once a day
// and cannot be followed across days.
export const dynamic = "force-dynamic";

const BOT = /bot|crawl|spider|slurp|preview|facebookexternalhit|whatsapp|telegram|headless|lighthouse|pingdom|monitor|curl|wget|python|axios|node-fetch/i;
const SALT = process.env.ANALYTICS_SALT ?? process.env.DATABASE_URL ?? "pdigital";

// Small in-memory limit so one visitor cannot flood the table.
const hits = new Map<string, { n: number; reset: number }>();
function limited(key: string) {
  const now = Date.now();
  const h = hits.get(key);
  if (!h || h.reset < now) {
    if (hits.size > 5000) hits.clear();
    hits.set(key, { n: 1, reset: now + 60_000 });
    return false;
  }
  return ++h.n > 30;
}

const today = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jerusalem" }).format(new Date());

export async function POST(req: Request) {
  const ok = new Response(null, { status: 204 });
  const h = await headers();
  const ua = h.get("user-agent") ?? "";
  if (!ua || BOT.test(ua)) return ok;
  // The shop owner / staff browsing the site are not counted.
  if ((await cookies()).get(SESSION_COOKIE)) return ok;

  let body: { p?: unknown; r?: unknown };
  try {
    body = await req.json();
  } catch {
    return ok;
  }
  const path = typeof body.p === "string" ? body.p.slice(0, 300) : "";
  if (!path.startsWith("/") || path.startsWith("/admin") || path.startsWith("/api")) return ok;

  const ip = (h.get("x-forwarded-for") ?? "").split(",")[0].trim() || h.get("x-real-ip") || "local";
  const visitor = createHash("sha256").update(`${SALT}|${today()}|${ip}|${ua}`).digest("hex").slice(0, 24);
  if (limited(visitor)) return ok;

  let referrer: string | null = null;
  if (typeof body.r === "string" && body.r) {
    try {
      const host = new URL(body.r).hostname.replace(/^www\./, "").slice(0, 100);
      const own = new URL(req.url).hostname.replace(/^www\./, "");
      referrer = host && host !== own ? host : null;
    } catch {}
  }
  const device = /mobile|android|iphone|ipad/i.test(ua) ? "mobile" : "desktop";

  try {
    await db.pageView.create({ data: { path, visitor, referrer, device } });
  } catch (e) {
    // A missed page view must never show as an error to the visitor.
    console.error("track failed", e instanceof Error ? e.message : e);
  }
  return ok;
}
