import "server-only";
import type { OrderStatus, Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import { FormError } from "@/lib/form";
import { changeStock } from "@/lib/stock";

type Tx = Prisma.TransactionClient;
export const PAID_STATES: OrderStatus[] = ["PAID", "PROCESSING", "SHIPPED", "DELIVERED"];

/**
 * Moves an order to a new status and keeps stock right:
 * - first time it becomes paid: its items leave stock
 * - cancelled / refunded / back to unpaid: items still with the customer return to stock
 *   (units already returned with a partial return are not returned twice)
 */
export async function changeOrderStatus(
  orderId: string,
  status: OrderStatus,
  userId: string | null,
  extra: { trackingNumber?: string | null; internalNotes?: string | null } = {},
  tx?: Tx,
) {
  const run = async (t: Tx) => {
    const order = await t.order.findUniqueOrThrow({ where: { id: orderId }, include: { items: true } });
    let stockDeducted = order.stockDeducted;
    const note = `הזמנה #${order.orderNumber}`;
    if (!stockDeducted && PAID_STATES.includes(status)) {
      for (const it of order.items)
        if (it.variantId) await changeStock(it.variantId, -it.quantity, "ONLINE_SALE", { userId, orderId, note }, t);
      stockDeducted = true;
    } else if (stockDeducted && (status === "CANCELLED" || status === "REFUNDED" || status === "PENDING_PAYMENT")) {
      for (const it of order.items) {
        const left = it.quantity - it.returnedQty;
        if (it.variantId && left > 0) await changeStock(it.variantId, left, "ORDER_CANCELLED", { userId, orderId, note }, t);
      }
      stockDeducted = false;
    }
    return t.order.update({
      where: { id: orderId },
      data: {
        status,
        stockDeducted,
        paidAt: PAID_STATES.includes(status) ? (order.paidAt ?? new Date()) : order.paidAt,
        ...("trackingNumber" in extra ? { trackingNumber: extra.trackingNumber ?? null } : {}),
        ...("internalNotes" in extra ? { internalNotes: extra.internalNotes ?? null } : {}),
      },
    });
  };
  return tx ? run(tx) : db.$transaction(run);
}

/**
 * Partial return: some units of a paid order come back.
 * Records the money refunded, optionally puts the units back in stock, and when
 * everything has been returned marks the whole order as refunded.
 */
export async function returnOrderItems(
  orderId: string,
  lines: { itemId: string; qty: number }[],
  opts: { restock: boolean; refund: number | null; note: string | null; userId: string | null },
) {
  return db.$transaction(async (tx) => {
    const order = await tx.order.findUniqueOrThrow({ where: { id: orderId }, include: { items: true, refunds: true } });
    if (!PAID_STATES.includes(order.status)) throw new FormError("אפשר להחזיר מוצרים רק מהזמנה ששולמה");
    const wanted = lines.filter((l) => l.qty > 0);
    if (!wanted.length) throw new FormError("לא נבחרו מוצרים להחזרה");

    let value = 0; // what the returned units cost the customer
    let restockedCost = 0;
    for (const l of wanted) {
      const it = order.items.find((i) => i.id === l.itemId);
      if (!it) throw new FormError("פריט לא נמצא בהזמנה");
      if (l.qty > it.quantity - it.returnedQty) throw new FormError(`אפשר להחזיר עד ${it.quantity - it.returnedQty} מ"${it.productName}"`);
      const res = await tx.orderItem.updateMany({
        where: { id: it.id, returnedQty: it.returnedQty },
        data: { returnedQty: { increment: l.qty } },
      });
      if (!res.count) throw new FormError("ההזמנה עודכנה בינתיים - רעננו את הדף");
      value += it.unitPrice * l.qty;
      if (opts.restock && order.stockDeducted && it.variantId) {
        const v = await tx.productVariant.findUnique({ where: { id: it.variantId }, select: { costPrice: true } });
        const unitCost = it.unitCost ?? v?.costPrice ?? 0;
        await changeStock(it.variantId, l.qty, "RETURN", {
          userId: opts.userId,
          orderId,
          note: `החזרה מהזמנה #${order.orderNumber}`,
          unitPrice: it.unitPrice,
          unitCost,
        }, tx);
        restockedCost += unitCost * l.qty;
      }
    }

    const refundedSoFar = order.refunds.reduce((s, r) => s + r.amount, 0);
    const amount = opts.refund ?? value;
    if (amount < 0 || amount > order.total - refundedSoFar)
      throw new FormError(`סכום ההחזר גבוה מהיתרה בהזמנה (₪${((order.total - refundedSoFar) / 100).toFixed(2)})`);

    await tx.orderRefund.create({ data: { orderId, amount, restockedCost, note: opts.note, createdById: opts.userId } });

    const after = await tx.orderItem.findMany({ where: { orderId } });
    const all = after.every((i) => i.returnedQty >= i.quantity);
    if (all) await tx.order.update({ where: { id: orderId }, data: { status: "REFUNDED", stockDeducted: false } });
    return { amount, all };
  });
}
