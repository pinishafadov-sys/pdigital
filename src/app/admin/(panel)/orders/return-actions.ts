"use server";

// Cancellation requests from customers, and partial returns of paid orders.

import { refreshSite } from "@/lib/cache";
import { redirect } from "next/navigation";
import { audit, requireAdmin } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { sendMail } from "@/lib/email";
import { bool, FormError, handle, int, oneOf, optStr, shekels, str, type ActionState } from "@/lib/form";
import { formatPrice } from "@/lib/format";
import { changeOrderStatus, PAID_STATES, returnOrderItems } from "@/lib/orders";
import { getSettings } from "@/lib/settings";

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

/** Approve (cancels the order, stock comes back) or reject a customer's cancellation request. */
export async function handleCancelRequest(_p: ActionState, fd: FormData): Promise<ActionState> {
  const me = await requireAdmin("MANAGER");
  return handle(async () => {
    const reqId = str(fd, "requestId", { max: 40 });
    const decision = oneOf(fd, "decision", ["APPROVED", "REJECTED"] as const, "REJECTED");
    const note = optStr(fd, "adminNote", 1000);
    const req = await db.cancelRequest.findUnique({ where: { id: reqId }, include: { order: true } });
    if (!req || req.status !== "PENDING") throw new FormError("הבקשה כבר טופלה");
    const order = req.order;

    if (decision === "APPROVED") {
      // Paid -> refunded (money to return through the payment company); unpaid -> cancelled.
      const to = PAID_STATES.includes(order.status) ? "REFUNDED" : "CANCELLED";
      if (order.status !== "CANCELLED" && order.status !== "REFUNDED") await changeOrderStatus(order.id, to, me.id);
    }
    await db.cancelRequest.update({
      where: { id: reqId },
      data: { status: decision, adminNote: note, handledAt: new Date(), handledById: me.id },
    });

    const s = await getSettings();
    const ok = decision === "APPROVED";
    const line = ok
      ? `בקשת הביטול של הזמנה ${order.orderNumber} אושרה.${PAID_STATES.includes(order.status) ? ` ההחזר הכספי (₪${formatPrice(order.total)}) יבוצע לאמצעי התשלום שבו שילמת.` : ""}`
      : `לצערנו לא ניתן לבטל את הזמנה ${order.orderNumber}.`;
    await sendMail({
      to: order.email,
      subject: `${ok ? "בקשת הביטול אושרה" : "עדכון לגבי בקשת הביטול"} - הזמנה ${order.orderNumber}`,
      text: `שלום ${order.firstName},\n\n${line}${note ? `\n${note}` : ""}\n\nלשאלות אפשר לפנות אלינו.\n${s.business.name}`,
      html: `<div dir="rtl" style="font-family:Arial,sans-serif;font-size:15px;line-height:1.6">שלום ${esc(order.firstName)},<br><br>${esc(line)}${note ? `<br>${esc(note)}` : ""}<br><br>לשאלות אפשר לפנות אלינו.<br>${esc(s.business.name)}</div>`,
    });

    await audit(me.id, `cancel_request_${decision.toLowerCase()}`, "Order", order.id);
    refreshSite();
    // The request box disappears after handling, so the result is shown at the top of the order page.
    redirect(`/admin/orders/${order.id}?done=${ok ? "cancel-approved" : "cancel-rejected"}`);
  });
}

/** Some of the order's items came back: refund, and put them back in stock if they can be sold. */
export async function returnItemsAction(_p: ActionState, fd: FormData): Promise<ActionState> {
  const me = await requireAdmin("MANAGER");
  return handle(async () => {
    const orderId = str(fd, "orderId", { max: 40 });
    const items = await db.orderItem.findMany({ where: { orderId }, select: { id: true } });
    const lines = items.map((i) => ({ itemId: i.id, qty: int(fd, `ret_${i.id}`, { min: 0, max: 1000, fallback: 0 }) }));
    const res = await returnOrderItems(orderId, lines, {
      restock: bool(fd, "restock"),
      refund: shekels(fd, "refund"),
      note: optStr(fd, "note", 500),
      userId: me.id,
    });
    await audit(me.id, "order_items_returned", "Order", orderId);
    refreshSite();
    if (res.all) redirect(`/admin/orders/${orderId}?done=returned-all`);
    return {
      ok: true,
      message: `ההחזרה נרשמה (₪${formatPrice(res.amount)}).${res.all ? " כל המוצרים הוחזרו, וההזמנה סומנה כ\"הוחזרה\"." : ""}`,
    };
  });
}
