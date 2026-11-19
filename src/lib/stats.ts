import "server-only";
import { Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/db";

/**
 * Admin statistics: visits (from PageView) and money (paid website orders +
 * in-store sales), grouped by day / week / month / year in Israel time.
 *
 * Money:
 * - revenue      = what customers paid, incl. VAT (website orders: order total incl. shipping;
 *                  store sales: product price at the time of the sale)
 * - net revenue  = revenue without VAT
 * - cost         = purchase cost of the goods sold (cost price at the time of sale, before VAT)
 * - profit       = net revenue - cost  ("כסף נקי אחרי קנייה")
 * Items whose cost price is unknown count as cost 0 and are reported in `missingCost`.
 */

export type Period = "day" | "week" | "month" | "year";
export const PERIODS: Record<Period, { label: string; count: number }> = {
  day: { label: "יומי", count: 30 },
  week: { label: "שבועי", count: 12 },
  month: { label: "חודשי", count: 12 },
  year: { label: "שנתי", count: 5 },
};

const PAID = Prisma.sql`('PAID','PROCESSING','SHIPPED','DELIVERED')`;
const local = (col: string) => Prisma.raw(`((${col}) AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Jerusalem')`);

function bucket(period: Period | "all", ts: Prisma.Sql) {
  switch (period) {
    case "day":
      return Prisma.sql`to_char(${ts}, 'YYYY-MM-DD')`;
    case "week": // weeks start on Sunday in Israel
      return Prisma.sql`to_char((${ts})::date - EXTRACT(DOW FROM ${ts})::int, 'YYYY-MM-DD')`;
    case "month":
      return Prisma.sql`to_char(${ts}, 'YYYY-MM')`;
    case "year":
      return Prisma.sql`to_char(${ts}, 'YYYY')`;
    default:
      return Prisma.sql`'all'`;
  }
}

// ---------------------------------------------------------------- dates (Israel calendar)

const DAY = 86_400_000;
const ymd = (d: Date) => d.toISOString().slice(0, 10);

/** Today in Israel, as a UTC-midnight Date (used only for calendar arithmetic). */
function todayIL() {
  const [y, m, d] = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jerusalem" }).format(new Date()).split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

/** Start dates of the current day / week / month / year. */
export function currentStarts() {
  const t = todayIL();
  return {
    day: ymd(t),
    week: ymd(new Date(t.getTime() - t.getUTCDay() * DAY)),
    month: ymd(new Date(Date.UTC(t.getUTCFullYear(), t.getUTCMonth(), 1))),
    year: ymd(new Date(Date.UTC(t.getUTCFullYear(), 0, 1))),
  };
}

/** First day of the last `days` days, including today (Israel calendar). */
export function lastDaysStart(days: number) {
  return ymd(new Date(todayIL().getTime() - (days - 1) * DAY));
}

/** Bucket keys (oldest first) and the first date of the range. */
function buckets(period: Period) {
  const t = todayIL();
  const n = PERIODS[period].count;
  const keys: { key: string; start: Date }[] = [];
  for (let i = n - 1; i >= 0; i--) {
    let start: Date;
    if (period === "day") start = new Date(t.getTime() - i * DAY);
    else if (period === "week") start = new Date(t.getTime() - (t.getUTCDay() + 7 * i) * DAY);
    else if (period === "month") start = new Date(Date.UTC(t.getUTCFullYear(), t.getUTCMonth() - i, 1));
    else start = new Date(Date.UTC(t.getUTCFullYear() - i, 0, 1));
    const key = period === "month" ? ymd(start).slice(0, 7) : period === "year" ? ymd(start).slice(0, 4) : ymd(start);
    keys.push({ key, start });
  }
  return { keys, from: ymd(keys[0].start) };
}

const monthFmt = new Intl.DateTimeFormat("he-IL", { month: "short", year: "2-digit", timeZone: "UTC" });
function label(period: Period, start: Date) {
  const dm = `${start.getUTCDate()}.${start.getUTCMonth() + 1}`;
  if (period === "day") return dm;
  if (period === "week") {
    const end = new Date(start.getTime() + 6 * DAY);
    return `${dm}-${end.getUTCDate()}.${end.getUTCMonth() + 1}`;
  }
  if (period === "month") return monthFmt.format(start);
  return String(start.getUTCFullYear());
}

// ---------------------------------------------------------------- queries

type Num = number | bigint | null;
const n = (v: Num) => Number(v ?? 0);

async function query(period: Period | "all", from: string) {
  const pv = local(`"createdAt"`);
  const ord = local(`COALESCE(o."paidAt", o."createdAt")`);
  const mv = local(`m."createdAt"`);
  const [visits, orders, orderCost, store] = await Promise.all([
    db.$queryRaw<{ k: string; visitors: Num; views: Num }[]>`
      SELECT ${bucket(period, Prisma.sql`${pv}`)} AS k, COUNT(DISTINCT visitor) AS visitors, COUNT(*) AS views
      FROM "PageView" WHERE ${pv} >= ${from}::date GROUP BY 1`,
    db.$queryRaw<{ k: string; orders: Num; revenue: Num }[]>`
      SELECT ${bucket(period, Prisma.sql`${ord}`)} AS k, COUNT(*) AS orders, SUM(o.total) AS revenue
      FROM "Order" o WHERE o.status::text IN ${PAID} AND ${ord} >= ${from}::date GROUP BY 1`,
    db.$queryRaw<{ k: string; cost: Num; missing: Num }[]>`
      SELECT ${bucket(period, Prisma.sql`${ord}`)} AS k,
        SUM(i.quantity * COALESCE(i."unitCost", v."costPrice")) AS cost,
        SUM(CASE WHEN COALESCE(i."unitCost", v."costPrice") IS NULL THEN i.quantity ELSE 0 END) AS missing
      FROM "OrderItem" i JOIN "Order" o ON o.id = i."orderId" LEFT JOIN "ProductVariant" v ON v.id = i."variantId"
      WHERE o.status::text IN ${PAID} AND ${ord} >= ${from}::date GROUP BY 1`,
    db.$queryRaw<{ k: string; units: Num; revenue: Num; cost: Num; missing: Num }[]>`
      SELECT ${bucket(period, Prisma.sql`${mv}`)} AS k, SUM(-m.change) AS units,
        SUM(-m.change * COALESCE(m."unitPrice", v.price)) AS revenue,
        SUM(-m.change * COALESCE(m."unitCost", v."costPrice")) AS cost,
        SUM(CASE WHEN COALESCE(m."unitCost", v."costPrice") IS NULL THEN -m.change ELSE 0 END) AS missing
      FROM "StockMovement" m JOIN "ProductVariant" v ON v.id = m."variantId"
      WHERE m.reason = 'STORE_SALE' AND ${mv} >= ${from}::date GROUP BY 1`,
  ]);
  return {
    visits: new Map(visits.map((r) => [r.k, r])),
    orders: new Map(orders.map((r) => [r.k, r])),
    orderCost: new Map(orderCost.map((r) => [r.k, r])),
    store: new Map(store.map((r) => [r.k, r])),
  };
}

export type StatRow = {
  key: string;
  label: string;
  visitors: number;
  views: number;
  orders: number;
  onlineRevenue: number;
  storeUnits: number;
  storeRevenue: number;
  revenue: number;
  net: number;
  cost: number;
  profit: number;
  missingCost: number;
  conversion: number | null; // orders per 100 visitors
};

function row(key: string, lbl: string, q: Awaited<ReturnType<typeof query>>, vatRate: number): StatRow {
  const v = q.visits.get(key);
  const o = q.orders.get(key);
  const oc = q.orderCost.get(key);
  const s = q.store.get(key);
  const onlineRevenue = n(o?.revenue ?? null);
  const storeRevenue = n(s?.revenue ?? null);
  const revenue = onlineRevenue + storeRevenue;
  const net = Math.round((revenue * 100) / (100 + vatRate));
  const cost = n(oc?.cost ?? null) + n(s?.cost ?? null);
  const visitors = n(v?.visitors ?? null);
  const orders = n(o?.orders ?? null);
  return {
    key,
    label: lbl,
    visitors,
    views: n(v?.views ?? null),
    orders,
    onlineRevenue,
    storeUnits: n(s?.units ?? null),
    storeRevenue,
    revenue,
    net,
    cost,
    profit: net - cost,
    missingCost: n(oc?.missing ?? null) + n(s?.missing ?? null),
    conversion: visitors ? (orders / visitors) * 100 : null,
  };
}

/** Chart / table rows for a period, oldest first, plus the totals of the whole range. */
export async function statsSeries(period: Period, vatRate: number) {
  const { keys, from } = buckets(period);
  const [q, all] = await Promise.all([query(period, from), query("all", from)]);
  return {
    rows: keys.map((k) => row(k.key, label(period, k.start), q, vatRate)),
    total: row("all", "סה\"כ", all, vatRate),
    from,
  };
}

/** Totals since a date (for the today / this week / this month / this year cards). */
export async function statsSince(from: string, vatRate: number) {
  return row("all", "", await query("all", from), vatRate);
}

// ---------------------------------------------------------------- traffic details

const SOURCES: [RegExp, string][] = [
  [/(^|\.)google\./, "גוגל"],
  [/(^|\.)(facebook\.com|fb\.com|fb\.me)$|^l\.facebook|^m\.facebook/, "פייסבוק"],
  [/instagram\.com$/, "אינסטגרם"],
  [/(whatsapp\.com|wa\.me)$/, "וואטסאפ"],
  [/tiktok\.com$/, "טיקטוק"],
  [/(bing\.com|duckduckgo\.com|yahoo\.com)$/, "מנועי חיפוש אחרים"],
];

export async function trafficDetails(from: string) {
  const pv = local(`"createdAt"`);
  const [firsts, pages, devices] = await Promise.all([
    // Each visit is attributed to where its first page view came from.
    db.$queryRaw<{ referrer: string | null; visits: Num }[]>`
      SELECT referrer, COUNT(*) AS visits FROM (
        SELECT DISTINCT ON (visitor) visitor, referrer FROM "PageView"
        WHERE ${pv} >= ${from}::date ORDER BY visitor, "createdAt"
      ) t GROUP BY referrer`,
    db.$queryRaw<{ path: string; views: Num; visitors: Num }[]>`
      SELECT path, COUNT(*) AS views, COUNT(DISTINCT visitor) AS visitors FROM "PageView"
      WHERE ${pv} >= ${from}::date GROUP BY path ORDER BY views DESC LIMIT 10`,
    db.$queryRaw<{ device: string; visitors: Num }[]>`
      SELECT device, COUNT(DISTINCT visitor) AS visitors FROM "PageView"
      WHERE ${pv} >= ${from}::date GROUP BY device`,
  ]);
  const sources = new Map<string, number>();
  for (const r of firsts) {
    const host = r.referrer ?? "";
    const name = !host ? "כניסה ישירה / קישור שמור" : (SOURCES.find(([re]) => re.test(host))?.[1] ?? host);
    sources.set(name, (sources.get(name) ?? 0) + n(r.visits));
  }
  return {
    sources: [...sources.entries()].map(([name, visits]) => ({ name, visits })).sort((a, b) => b.visits - a.visits).slice(0, 10),
    pages: pages.map((p) => ({ path: p.path, views: n(p.views), visitors: n(p.visitors) })),
    devices: devices.map((d) => ({ device: d.device, visitors: n(d.visitors) })),
  };
}
