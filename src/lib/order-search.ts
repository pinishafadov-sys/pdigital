import "server-only";
import type { OrderStatus, Prisma } from "@/generated/prisma/client";
import { endOfDayIsrael } from "@/lib/inventory-report";

/**
 * Builds an order filter from free text: matches customer name (first, last or both),
 * phone (digits only, so 050-123-4567 = 0501234567), email, city/street, order number,
 * invoice number, tracking number, business name / VAT id.
 */
export function orderSearchWhere(q: string, opts: { status?: string; from?: string; to?: string } = {}): Prisma.OrderWhereInput {
  const and: Prisma.OrderWhereInput[] = [];
  const term = q.trim().replace(/^#/, "").slice(0, 80);

  if (term) {
    const words = term.split(/\s+/).filter(Boolean).slice(0, 4);
    for (const w of words) {
      const digits = w.replace(/\D/g, "");
      const or: Prisma.OrderWhereInput[] = [
        { firstName: { contains: w, mode: "insensitive" } },
        { lastName: { contains: w, mode: "insensitive" } },
        { email: { contains: w, mode: "insensitive" } },
        { city: { contains: w, mode: "insensitive" } },
        { street: { contains: w, mode: "insensitive" } },
        { invoiceNumber: { contains: w, mode: "insensitive" } },
        { trackingNumber: { contains: w, mode: "insensitive" } },
        { internalNotes: { contains: w, mode: "insensitive" } },
      ];
      if (digits.length >= 3) or.push({ phone: { contains: digits } }, { phone: { contains: w } });
      if (/^\d{1,9}$/.test(w)) or.push({ orderNumber: Number(w) });
      and.push({ OR: or });
    }
  }
  if (opts.status) and.push({ status: opts.status as OrderStatus });
  const from = opts.from ? endOfDayIsrael(opts.from) : null;
  const to = opts.to ? endOfDayIsrael(opts.to) : null;
  if (from) and.push({ createdAt: { gt: new Date(from.getTime() - 24 * 60 * 60 * 1000) } });
  if (to) and.push({ createdAt: { lte: to } });
  return and.length ? { AND: and } : {};
}
