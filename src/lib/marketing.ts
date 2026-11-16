import "server-only";
import { db } from "@/lib/db";
import type { Prisma } from "@/generated/prisma/client";

export type MarketingFilters = { q?: string; cat?: string; days?: string };

export const DEFAULT_MESSAGE = "היי {שם}! 🎉 מבצע מיוחד ב-pdigital: [פרטי המבצע]. לפרטים: [קישור]\nלהסרה מרשימת התפוצה השיבו \"הסר\".";

/** Customers who agreed to receive promotions and did not opt out, with optional filters. */
export async function marketingList(f: MarketingFilters, take = 500) {
  const where: Prisma.CustomerWhereInput = { marketingConsent: true, unsubscribedAt: null };
  const and: Prisma.CustomerWhereInput[] = [];
  const q = (f.q ?? "").trim().slice(0, 80);
  if (q) {
    const digits = q.replace(/\D/g, "");
    and.push({
      OR: [
        { firstName: { contains: q, mode: "insensitive" } },
        { lastName: { contains: q, mode: "insensitive" } },
        { email: { contains: q, mode: "insensitive" } },
        ...(digits.length >= 3 ? [{ phone: { contains: digits } }] : []),
      ],
    });
  }
  // "Bought in category X" (top-level category or any of its sub-categories), matched by order email.
  if (f.cat) {
    const buyers = await db.order.findMany({
      where: {
        status: { in: ["PAID", "PROCESSING", "SHIPPED", "DELIVERED"] },
        items: { some: { variant: { product: { OR: [{ categoryId: f.cat }, { category: { parentId: f.cat } }] } } } },
      },
      select: { email: true },
      distinct: ["email"],
    });
    and.push({ email: { in: buyers.map((b) => b.email) } });
  }
  const days = Number(f.days);
  if (Number.isInteger(days) && days > 0) and.push({ consentAt: { gte: new Date(Date.now() - days * 86400000) } });
  if (and.length) where.AND = and;

  const [customers, total, unsubscribed] = await Promise.all([
    db.customer.findMany({ where, orderBy: { consentAt: "desc" }, take }),
    db.customer.count({ where }),
    db.customer.count({ where: { unsubscribedAt: { not: null } } }),
  ]);
  return { customers, total, unsubscribed };
}

/** Israeli mobile/landline (05x / 0x) -> wa.me international format. */
export function waNumber(phone: string | null) {
  const d = (phone ?? "").replace(/\D/g, "");
  if (/^0\d{8,9}$/.test(d)) return `972${d.slice(1)}`;
  if (/^972\d{8,9}$/.test(d)) return d;
  return null;
}
