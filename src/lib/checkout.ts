import "server-only";
import { db } from "@/lib/db";
import { getSettings } from "@/lib/settings";

export type ShippingOptions = {
  delivery: { price: number | null; freeFrom: number | null }; // agorot; null price = not set yet
  pickup: { enabled: boolean; address: string };
};

const money = (v: string) => {
  const n = Number(v);
  return v && Number.isFinite(n) && n >= 0 ? Math.round(n * 100) : null;
};

export async function getShippingOptions(): Promise<ShippingOptions> {
  const s = await getSettings();
  return {
    delivery: { price: money(s.shipping.shippingPrice), freeFrom: money(s.shipping.freeShippingFrom) },
    pickup: { enabled: s.shipping.pickupEnabled !== "לא", address: s.business.address },
  };
}

export function shippingCost(method: "delivery" | "pickup", subtotal: number, opts: ShippingOptions) {
  if (method === "pickup") return 0;
  if (opts.delivery.freeFrom != null && subtotal >= opts.delivery.freeFrom) return 0;
  return opts.delivery.price ?? 0;
}

export type CartLine = { variantId: string; qty: number };

/**
 * Re-reads every price and stock level from the database (the browser's cart is never trusted).
 * Returns priced lines, plus problems to show the customer (sold out, not enough stock, removed).
 */
export async function priceCart(lines: CartLine[]) {
  const clean = lines
    .filter((l) => typeof l.variantId === "string" && l.variantId.length <= 40 && Number.isInteger(l.qty) && l.qty > 0)
    .slice(0, 50)
    .map((l) => ({ variantId: l.variantId, qty: Math.min(l.qty, 99) }));
  const variants = await db.productVariant.findMany({
    where: { id: { in: clean.map((l) => l.variantId) }, isActive: true, product: { status: "ACTIVE" } },
    include: { product: { select: { name: true } } },
  });
  const byId = new Map(variants.map((v) => [v.id, v]));
  const problems: string[] = [];
  const items = clean.flatMap((l) => {
    const v = byId.get(l.variantId);
    if (!v) {
      problems.push("מוצר שהיה בעגלה כבר לא זמין והוסר");
      return [];
    }
    const title = v.name ? `${v.product.name} (${v.name})` : v.product.name;
    if (v.stock <= 0) {
      problems.push(`"${title}" אזל מהמלאי`);
      return [];
    }
    if (l.qty > v.stock) problems.push(`מ"${title}" נשארו רק ${v.stock} יחידות`);
    const qty = Math.min(l.qty, v.stock);
    return [{ variantId: v.id, productName: v.product.name, variantName: v.name, sku: v.sku, unitPrice: v.price, quantity: qty, lineTotal: v.price * qty }];
  });
  return { items, subtotal: items.reduce((s, i) => s + i.lineTotal, 0), problems };
}
