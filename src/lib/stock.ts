import "server-only";
import { db } from "@/lib/db";
import { FormError } from "@/lib/form";
import type { Prisma, StockReason } from "@/generated/prisma/client";

type Tx = Prisma.TransactionClient;

export const STOCK_REASON_LABEL: Record<StockReason, string> = {
  ONLINE_SALE: "נמכר באתר",
  STORE_SALE: "נמכר בחנות",
  RESTOCK: "הגיעה סחורה",
  ADJUSTMENT: "תיקון ידני",
  RETURN: "החזרה",
  ORDER_CANCELLED: "הזמנה בוטלה",
};

type Meta = { userId?: string | null; note?: string | null; orderId?: string | null; unitPrice?: number | null; unitCost?: number | null };

/**
 * Atomically changes a variant's stock by `change` and records it.
 * A decrease only succeeds if enough stock exists (a single conditional UPDATE),
 * so two buyers can never both take the last unit.
 * Use inside a transaction (pass `tx`) when part of a larger operation, e.g. an order.
 */
export async function changeStock(variantId: string, change: number, reason: StockReason, meta: Meta = {}, tx: Tx = db) {
  if (!Number.isInteger(change) || change === 0) throw new FormError("כמות לא תקינה");
  const updated =
    change < 0
      ? await tx.productVariant.updateMany({ where: { id: variantId, stock: { gte: -change } }, data: { stock: { increment: change } } })
      : await tx.productVariant.updateMany({ where: { id: variantId }, data: { stock: { increment: change } } });
  if (updated.count === 0) {
    const v = await tx.productVariant.findUnique({ where: { id: variantId }, select: { stock: true } });
    if (!v) throw new FormError("המוצר לא נמצא");
    throw new FormError(`אין מספיק מלאי (נשארו ${v.stock})`);
  }
  const v = await tx.productVariant.findUniqueOrThrow({ where: { id: variantId }, select: { stock: true } });
  await tx.stockMovement.create({
    data: {
      variantId,
      change,
      stockAfter: v.stock,
      reason,
      note: meta.note ?? null,
      orderId: meta.orderId ?? null,
      userId: meta.userId ?? null,
      unitPrice: meta.unitPrice ?? null,
      unitCost: meta.unitCost ?? null,
    },
  });
  return v.stock;
}

/** Sets stock to an exact number (manual count) and records the difference. */
export async function setStock(variantId: string, newStock: number, meta: Meta = {}, tx: Tx = db) {
  if (!Number.isInteger(newStock) || newStock < 0) throw new FormError("כמות לא תקינה");
  const v = await tx.productVariant.findUnique({ where: { id: variantId }, select: { stock: true } });
  if (!v) throw new FormError("המוצר לא נמצא");
  const diff = newStock - v.stock;
  if (diff === 0) return v.stock;
  await tx.productVariant.update({ where: { id: variantId }, data: { stock: newStock } });
  await tx.stockMovement.create({
    data: { variantId, change: diff, stockAfter: newStock, reason: "ADJUSTMENT", note: meta.note ?? null, userId: meta.userId ?? null },
  });
  return newStock;
}
