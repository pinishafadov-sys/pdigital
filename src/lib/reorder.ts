import "server-only";
import { db } from "@/lib/db";
import { getSettings } from "@/lib/settings";

const DAY = 24 * 60 * 60 * 1000;

export type ReorderStatus = "urgent" | "soon" | "ok" | "no-sales";

export type ReorderRow = {
  variantId: string;
  productId: string;
  title: string;
  sku: string;
  brand: string | null;
  stock: number;
  sold: number; // units sold in the window (online + store, minus returns)
  perDay: number;
  daysLeft: number | null; // null = no recent sales
  leadTime: number;
  suggestQty: number;
  status: ReorderStatus;
};

function num(v: string, fallback: number) {
  const n = Number(v);
  return Number.isFinite(n) && n >= 1 && n <= 365 ? n : fallback;
}

/**
 * Sales speed per variant from the stock history, and whether to reorder:
 * - perDay = units sold in the last `window` days / days counted
 *   (a variant newer than the window is measured from when it was added, min 7 days)
 * - daysLeft = stock / perDay
 * - urgent: runs out before a new order would arrive (daysLeft <= lead time)
 * - soon: runs out within a week after that
 * - suggested quantity covers lead time + `cover` days, minus what is in stock
 */
export async function reorderReport() {
  const s = await getSettings();
  const defaultLead = num(s.inventory.leadTimeDays, 14);
  const cover = num(s.inventory.coverDays, 45);
  const window = num(s.inventory.salesWindowDays, 30);
  const now = Date.now();
  const since = new Date(now - window * DAY);

  const [variants, sales] = await Promise.all([
    db.productVariant.findMany({
      where: { isActive: true, product: { status: { not: "ARCHIVED" }, noReorder: false } },
      include: { product: { select: { id: true, name: true, brand: { select: { name: true, leadTimeDays: true } } } } },
    }),
    db.stockMovement.groupBy({
      by: ["variantId", "reason"],
      where: { createdAt: { gte: since }, reason: { in: ["ONLINE_SALE", "STORE_SALE", "RETURN"] } },
      _sum: { change: true },
    }),
  ]);

  const soldBy = new Map<string, number>();
  for (const g of sales) {
    // sales are negative changes, returns positive: net units sold = -(sum)
    soldBy.set(g.variantId, (soldBy.get(g.variantId) ?? 0) - (g._sum.change ?? 0));
  }

  const rows: ReorderRow[] = variants.map((v) => {
    const sold = Math.max(0, soldBy.get(v.id) ?? 0);
    const ageDays = Math.max(7, Math.min(window, (now - v.createdAt.getTime()) / DAY));
    const perDay = sold / ageDays;
    const leadTime = v.product.brand?.leadTimeDays ?? defaultLead;
    const daysLeft = perDay > 0 ? v.stock / perDay : null;
    let status: ReorderStatus = "no-sales";
    if (perDay > 0) status = daysLeft! <= leadTime ? "urgent" : daysLeft! <= leadTime + 7 ? "soon" : "ok";
    const suggestQty = perDay > 0 ? Math.max(0, Math.ceil(perDay * (leadTime + cover) - v.stock)) : 0;
    return {
      variantId: v.id,
      productId: v.product.id,
      title: v.name ? `${v.product.name} - ${v.name}` : v.product.name,
      sku: v.sku,
      brand: v.product.brand?.name ?? null,
      stock: v.stock,
      sold,
      perDay,
      daysLeft,
      leadTime,
      suggestQty,
      status,
    };
  });

  const toOrder = rows
    .filter((r) => (r.status === "urgent" || r.status === "soon") && r.suggestQty > 0)
    .sort((a, b) => (a.daysLeft ?? 0) - (b.daysLeft ?? 0));
  const bestSellers = rows.filter((r) => r.sold > 0).sort((a, b) => b.sold - a.sold).slice(0, 15);

  return { toOrder, bestSellers, settings: { defaultLead, cover, window } };
}

export const fmtDays = (d: number | null) => (d == null ? "-" : d < 1 ? "פחות מיום" : `${Math.floor(d)} ימים`);
