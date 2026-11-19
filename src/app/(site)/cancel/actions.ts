"use server";

import { clientInfo } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { sendMail } from "@/lib/email";
import { formatPrice } from "@/lib/format";
import { getSettings, siteUrl } from "@/lib/settings";

export type CancelState = { ok?: boolean; error?: string; orderNumber?: number; fields?: Record<string, string> } | undefined;

const MAX_PER_IP_PER_HOUR = 5;
const clean = (v: FormDataEntryValue | null, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");
const esc = (s: string) => s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
const digits = (s: string) => s.replace(/\D/g, "").replace(/^972/, "0");

/**
 * Customer asks to cancel an order ("ביטול עסקה"). The order is found by its
 * private link (token) or by order number + the phone used in the order.
 * Nothing is cancelled automatically: the request waits for the owner's approval.
 */
export async function requestCancelAction(_prev: CancelState, fd: FormData): Promise<CancelState> {
  const token = clean(fd.get("t"), 40);
  const orderNo = clean(fd.get("order"), 12);
  const phone = clean(fd.get("phone"), 30);
  const reason = clean(fd.get("reason"), 1000);
  const fields = { order: orderNo, phone, reason };
  if (clean(fd.get("website"), 200)) return { ok: true }; // honeypot

  const { ip } = await clientInfo();
  const recent = await db.cancelRequest.count({ where: { ip, createdAt: { gt: new Date(Date.now() - 60 * 60 * 1000) } } });
  if (recent >= MAX_PER_IP_PER_HOUR) return { error: "נשלחו כבר כמה בקשות. נסו שוב מאוחר יותר או צרו איתנו קשר.", fields };

  let order;
  if (token) {
    order = /^[a-z0-9]{20,40}$/.test(token) ? await db.order.findUnique({ where: { publicToken: token } }) : null;
  } else {
    const n = Number(orderNo);
    if (!Number.isInteger(n) || n <= 0) return { error: "נא למלא מספר הזמנה (מופיע במייל אישור ההזמנה)", fields };
    if (digits(phone).length < 9) return { error: "נא למלא את מספר הטלפון שהוזן בהזמנה", fields };
    order = await db.order.findUnique({ where: { orderNumber: n } });
    if (order && digits(order.phone) !== digits(phone)) order = null;
  }
  if (!order) return { error: "לא מצאנו הזמנה עם הפרטים האלה. בדקו את מספר ההזמנה והטלפון.", fields };
  if (order.status === "CANCELLED" || order.status === "REFUNDED") return { error: "ההזמנה הזו כבר בוטלה.", fields };
  const open = await db.cancelRequest.findFirst({ where: { orderId: order.id, status: "PENDING" } });
  if (open) return { ok: true, orderNumber: order.orderNumber };

  await db.cancelRequest.create({ data: { orderId: order.id, reason: reason || null, ip } });
  const s = await getSettings();

  // Confirmation to the customer (the law asks to confirm a cancellation notice).
  await sendMail({
    to: order.email,
    subject: `קיבלנו את בקשת הביטול להזמנה ${order.orderNumber} - ${s.business.name}`,
    text: `שלום ${order.firstName},\n\nקיבלנו את בקשתך לבטל את הזמנה מס' ${order.orderNumber} (₪${formatPrice(order.total)}).\nנטפל בה בהקדם ונעדכן אותך במייל.\n\n${s.business.name}`,
    html: `<div dir="rtl" style="font-family:Arial,sans-serif;font-size:15px;line-height:1.6">שלום ${esc(order.firstName)},<br><br>קיבלנו את בקשתך לבטל את הזמנה מס' <b>${order.orderNumber}</b> (₪${formatPrice(order.total)}).<br>נטפל בה בהקדם ונעדכן אותך במייל.<br><br>${esc(s.business.name)}</div>`,
  });

  // Tell the owner.
  const owner = await db.adminUser.findFirst({ where: { role: "OWNER", isActive: true, email: { not: null } }, orderBy: { createdAt: "asc" } });
  if (owner?.email) {
    const link = `${siteUrl()}/admin/orders/${order.id}`;
    await sendMail({
      to: owner.email,
      subject: `בקשת ביטול עסקה: הזמנה ${order.orderNumber}`,
      text: `${order.firstName} ${order.lastName} (${order.phone}) ביקש/ה לבטל את הזמנה ${order.orderNumber} (₪${formatPrice(order.total)}).\nסיבה: ${reason || "-"}\n\nלטיפול: ${link}`,
      html: `<div dir="rtl" style="font-family:Arial,sans-serif;font-size:15px;line-height:1.6"><b>${esc(order.firstName)} ${esc(order.lastName)}</b> (${esc(order.phone)}) ביקש/ה לבטל את הזמנה <b>${order.orderNumber}</b> (₪${formatPrice(order.total)}).<br>סיבה: ${esc(reason || "-")}<br><br><a href="${link}">לטיפול במערכת הניהול</a></div>`,
    });
  }
  return { ok: true, orderNumber: order.orderNumber };
}
