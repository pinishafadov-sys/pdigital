import "server-only";
import { db } from "@/lib/db";

export type InventoryRow = {
  variantId: string;
  sku: string;
  barcode: string | null;
  product: string;
  variant: string | null;
  category: string;
  qty: number;
  cost: number | null; // agorot per unit
  value: number | null; // agorot
  price: number; // current selling price, agorot
};

/** End of a calendar day (YYYY-MM-DD) in Israel time, as a UTC Date. */
export function endOfDayIsrael(ymd: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(ymd)) return null;
  const noon = new Date(`${ymd}T12:00:00Z`);
  if (Number.isNaN(noon.getTime())) return null;
  const tz = new Intl.DateTimeFormat("en-US", { timeZone: "Asia/Jerusalem", timeZoneName: "shortOffset" })
    .formatToParts(noon)
    .find((p) => p.type === "timeZoneName")?.value; // e.g. "GMT+2"
  const m = tz?.match(/GMT([+-]\d+)/);
  const offset = m ? Number(m[1]) : 2;
  const sign = offset >= 0 ? "+" : "-";
  return new Date(`${ymd}T23:59:59.999${sign}${String(Math.abs(offset)).padStart(2, "0")}:00`);
}

/**
 * Stock of every variant as it was at `at`, rebuilt from today's stock minus every
 * recorded change after that moment. Includes archived/hidden products (they are still
 * physically in stock). Rows with zero quantity are left out.
 */
export async function inventoryAt(at: Date): Promise<{ rows: InventoryRow[]; totalQty: number; totalValue: number; missingCost: number }> {
  const [variants, later] = await Promise.all([
    db.productVariant.findMany({
      where: { createdAt: { lte: at } },
      include: { product: { select: { name: true, category: { select: { name: true, parent: { select: { name: true } } } } } } },
    }),
    db.stockMovement.groupBy({ by: ["variantId"], where: { createdAt: { gt: at } }, _sum: { change: true } }),
  ]);
  const laterChange = new Map(later.map((l) => [l.variantId, l._sum.change ?? 0]));
  const rows: InventoryRow[] = [];
  for (const v of variants) {
    const qty = v.stock - (laterChange.get(v.id) ?? 0);
    if (qty === 0) continue;
    const cat = v.product.category;
    rows.push({
      variantId: v.id,
      sku: v.sku,
      barcode: v.barcode,
      product: v.product.name,
      variant: v.name,
      category: cat.parent ? `${cat.parent.name} › ${cat.name}` : cat.name,
      qty,
      cost: v.costPrice,
      value: v.costPrice != null ? v.costPrice * qty : null,
      price: v.price,
    });
  }
  rows.sort((a, b) => a.category.localeCompare(b.category, "he") || a.product.localeCompare(b.product, "he"));
  return {
    rows,
    totalQty: rows.reduce((s, r) => s + r.qty, 0),
    totalValue: rows.reduce((s, r) => s + (r.value ?? 0), 0),
    missingCost: rows.filter((r) => r.cost == null).length,
  };
}

export function defaultReportDate() {
  // Last 31.12 that has passed (or today if it's 31.12).
  const now = new Date();
  const y = now.getMonth() === 11 && now.getDate() === 31 ? now.getFullYear() : now.getFullYear() - 1;
  return `${y}-12-31`;
}
