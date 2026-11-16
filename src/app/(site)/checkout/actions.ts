"use server";

import { clientInfo } from "@/lib/auth/session";
import { getShippingOptions, priceCart, shippingCost, type CartLine } from "@/lib/checkout";
import { db } from "@/lib/db";
import { sendMail } from "@/lib/email";
import { formatPrice } from "@/lib/format";
import { siteUrl } from "@/lib/settings";

export type CheckoutState =
  | { ok: true; token: string }
  | { ok?: false; error?: string; problems?: string[]; fields?: Record<string, string> }
  | undefined;

const clean = (fd: FormData, k: string, max: number) => {
  const v = fd.get(k);
  return typeof v === "string" ? v.trim().slice(0, max) : "";
};
const esc = (s: string) => s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

export async function placeOrderAction(_prev: CheckoutState, fd: FormData): Promise<CheckoutState> {
  const f = {
    firstName: clean(fd, "firstName", 60),
    lastName: clean(fd, "lastName", 60),
    phone: clean(fd, "phone", 30),
    email: clean(fd, "email", 120).toLowerCase(),
    method: clean(fd, "method", 10) === "pickup" ? "pickup" : "delivery",
    city: clean(fd, "city", 60),
    street: clean(fd, "street", 80),
    houseNumber: clean(fd, "houseNumber", 10),
    apartment: clean(fd, "apartment", 10),
    notes: clean(fd, "notes", 500),
    companyName: clean(fd, "companyName", 120),
    companyTaxId: clean(fd, "companyTaxId", 20),
  } as const;
  const fields = { ...f } as Record<string, string>;
  const fail = (error: string) => ({ error, fields });

  if (clean(fd, "website", 100)) return fail("שגיאה בשליחה"); // honeypot
  const phone = f.phone.replace(/[^\d+]/g, "").replace(/^\+972/, "0");
  if (f.firstName.length < 2 || f.lastName.length < 2) return fail("נא למלא שם פרטי ושם משפחה");
  if (!/^0\d{8,9}$/.test(phone)) return fail("נא למלא מספר טלפון תקין (למשל 050-1234567)");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email)) return fail("נא למלא כתובת אימייל תקינה (לשם תישלח החשבונית)");
  if (f.method === "delivery" && (!f.city || !f.street || !f.houseNumber)) return fail("נא למלא כתובת למשלוח: עיר, רחוב ומספר בית");
  if (f.companyName && !/^\d{8,9}$/.test(f.companyTaxId)) return fail("לחשבונית על שם עסק יש למלא ח.פ / ע.מ תקין (8-9 ספרות)");
  if (fd.get("terms") !== "on") return fail("יש לאשר את התקנון ומדיניות הפרטיות");

  let lines: CartLine[] = [];
  try {
    lines = JSON.parse(String(fd.get("cart") ?? "[]"));
  } catch {
    return fail("העגלה לא תקינה, נסו לרענן את הדף");
  }
  const priced = await priceCart(Array.isArray(lines) ? lines : []);
  if (!priced.items.length) return { ...fail("העגלה ריקה או שהמוצרים כבר לא זמינים"), problems: priced.problems };
  if (priced.problems.length) return { ...fail("היו שינויים בעגלה. בדקו ואשרו שוב"), problems: priced.problems };

  const opts = await getShippingOptions();
  if (f.method === "pickup" && !opts.pickup.enabled) return fail("איסוף עצמי לא זמין כרגע");
  const ship = shippingCost(f.method, priced.subtotal, opts);

  const { ip } = await clientInfo();
  const recent = await db.loginAttempt.count({ where: { ip, username: "checkout", createdAt: { gt: new Date(Date.now() - 60 * 60 * 1000) } } });
  if (recent >= 10) return fail("נשלחו הרבה הזמנות מהמכשיר הזה. נסו שוב מאוחר יותר או התקשרו אלינו.");
  await db.loginAttempt.create({ data: { ip, username: "checkout", success: true } });

  // Optional: save details for next time (no password needed to buy).
  let customerId: string | null = null;
  if (fd.get("saveDetails") === "on") {
    const customer = await db.customer.upsert({
      where: { email: f.email },
      update: { firstName: f.firstName, lastName: f.lastName, phone, ...(fd.get("marketing") === "on" ? { marketingConsent: true } : {}) },
      create: { email: f.email, firstName: f.firstName, lastName: f.lastName, phone, marketingConsent: fd.get("marketing") === "on" },
    });
    customerId = customer.id;
    if (f.method === "delivery") {
      const exists = await db.address.findFirst({ where: { customerId, city: f.city, street: f.street, houseNumber: f.houseNumber } });
      if (!exists)
        await db.address.create({
          data: { customerId, city: f.city, street: f.street, houseNumber: f.houseNumber, apartment: f.apartment || null, isDefault: true },
        });
    }
  }

  const order = await db.order.create({
    data: {
      status: "PENDING_PAYMENT",
      customerId,
      firstName: f.firstName,
      lastName: f.lastName,
      phone,
      email: f.email,
      city: f.method === "pickup" ? "איסוף עצמי" : f.city,
      street: f.method === "pickup" ? "-" : f.street,
      houseNumber: f.method === "pickup" ? "-" : f.houseNumber,
      apartment: f.apartment || null,
      deliveryNotes: f.notes || null,
      shippingMethod: f.method === "pickup" ? "איסוף עצמי מהחנות" : "משלוח עד הבית",
      companyName: f.companyName || null,
      companyTaxId: f.companyName ? f.companyTaxId : null,
      subtotal: priced.subtotal,
      shippingTotal: ship,
      total: priced.subtotal + ship,
      items: { create: priced.items },
    },
  });

  // Emails (sent for real once email sending is connected; printed to the server log locally).
  const itemsText = priced.items.map((i) => `${i.productName}${i.variantName ? ` (${i.variantName})` : ""} × ${i.quantity} = ₪${formatPrice(i.lineTotal)}`).join("\n");
  const summary = `${itemsText}\nמשלוח: ₪${formatPrice(ship)}\nסה"כ: ₪${formatPrice(order.total)}`;
  const link = `${siteUrl()}/order/${order.publicToken}`;
  await sendMail({
    to: f.email,
    subject: `קיבלנו את הזמנה מספר ${order.orderNumber} - pdigital`,
    text: `שלום ${f.firstName},\n\nתודה! קיבלנו את ההזמנה שלך (מספר ${order.orderNumber}).\n\n${summary}\n\nלצפייה בהזמנה: ${link}`,
    html: `<div dir="rtl" style="font-family:Arial,sans-serif;font-size:15px;line-height:1.7">שלום ${esc(f.firstName)},<br>תודה! קיבלנו את ההזמנה שלך (מספר <b>${order.orderNumber}</b>).<br><br>${esc(summary).replace(/\n/g, "<br>")}<br><br><a href="${link}">לצפייה בהזמנה</a></div>`,
  });
  const owner = await db.adminUser.findFirst({ where: { role: "OWNER", isActive: true, email: { not: null } }, orderBy: { createdAt: "asc" } });
  if (owner?.email) {
    const adminLink = `${siteUrl()}/admin/orders/${order.id}`;
    await sendMail({
      to: owner.email,
      subject: `הזמנה חדשה #${order.orderNumber}: ${f.firstName} ${f.lastName} - ₪${formatPrice(order.total)}`,
      text: `הזמנה חדשה מהאתר.\n\n${f.firstName} ${f.lastName} · ${phone} · ${f.email}\n${order.shippingMethod}\n\n${summary}\n\n${adminLink}`,
      html: `<div dir="rtl" style="font-family:Arial,sans-serif;font-size:15px;line-height:1.7">הזמנה חדשה מהאתר.<br><br>${esc(`${f.firstName} ${f.lastName} · ${phone} · ${f.email}`)}<br>${esc(order.shippingMethod)}<br><br>${esc(summary).replace(/\n/g, "<br>")}<br><br><a href="${adminLink}">פתיחה במערכת הניהול</a></div>`,
    });
  }
  return { ok: true, token: order.publicToken };
}

/** Lets the checkout page show live prices/stock for the cart (never trusts browser prices). */
export async function previewCartAction(lines: CartLine[]) {
  const priced = await priceCart(Array.isArray(lines) ? lines : []);
  const opts = await getShippingOptions();
  return {
    items: priced.items,
    subtotal: priced.subtotal,
    problems: priced.problems,
    delivery: shippingCost("delivery", priced.subtotal, opts),
    deliveryPriceSet: opts.delivery.price != null,
    freeFrom: opts.delivery.freeFrom,
    pickup: opts.pickup,
  };
}
