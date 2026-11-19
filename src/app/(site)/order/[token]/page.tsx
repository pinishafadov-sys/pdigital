import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { formatDateTime, formatPrice } from "@/lib/format";
import { ORDER_STATUS } from "@/lib/order-status";
import { getSettings, whatsappLink } from "@/lib/settings";

export const metadata: Metadata = { title: "ההזמנה התקבלה", robots: { index: false, follow: false }, referrer: "no-referrer" };

export default async function OrderPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!/^[a-z0-9]{20,40}$/.test(token)) notFound();
  const order = await db.order.findUnique({ where: { publicToken: token }, include: { items: true } });
  if (!order) notFound();
  const s = await getSettings();
  const wa = whatsappLink(s.business.whatsapp);

  return (
    <main className="page">
      <div className="container" style={{ maxWidth: 760 }}>
        <section className="panel prose-panel" style={{ textAlign: "center" }}>
          <div style={{ fontSize: 48 }} aria-hidden="true">🎉</div>
          <h1 style={{ margin: "4px 0" }}>תודה {order.firstName}, ההזמנה התקבלה!</h1>
          <p style={{ margin: 0, fontSize: 18 }}>
            מספר הזמנה: <b>{order.orderNumber}</b>
          </p>
          <p className="muted" style={{ marginTop: 6 }}>
            שלחנו אישור ל-<span dir="ltr">{order.email}</span>
          </p>
          <p style={{ margin: "10px 0 0" }}>
            סטטוס: <span className={`badge badge-tag-NEW`}>{ORDER_STATUS[order.status].label}</span>
          </p>
          {order.status === "PENDING_PAYMENT" && (
            <p className="notice" style={{ marginTop: 14 }}>
              נחזור אליכם בהקדם להשלמת התשלום. [כשיחובר סולק התשלומים, התשלום יתבצע כאן באתר]
            </p>
          )}
        </section>

        <section className="panel prose-panel" style={{ marginTop: 16 }} aria-labelledby="o-items">
          <h2 id="o-items" style={{ marginTop: 0 }}>פרטי ההזמנה</h2>
          <ul className="sum-lines">
            {order.items.map((i) => (
              <li key={i.id}>
                <span>{i.productName}{i.variantName ? ` (${i.variantName})` : ""} × {i.quantity}</span>
                <b>₪{formatPrice(i.lineTotal)}</b>
              </li>
            ))}
          </ul>
          <div className="sum-row"><span>משלוח ({order.shippingMethod})</span><span>{order.shippingTotal ? `₪${formatPrice(order.shippingTotal)}` : "חינם"}</span></div>
          <div className="sum-row total"><span>סה&quot;כ</span><span>₪{formatPrice(order.total)}</span></div>
          <p className="muted" style={{ marginBottom: 0 }}>
            {order.shippingMethod === "איסוף עצמי מהחנות" ? `איסוף מ: ${s.business.address}` : `משלוח ל: ${order.street} ${order.houseNumber}${order.apartment ? `/${order.apartment}` : ""}, ${order.city}`}
            {" · "}הוזמן {formatDateTime(order.createdAt)}
          </p>
        </section>

        <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap", marginTop: 18 }}>
          <Link href="/" className="btn btn-primary">חזרה לחנות</Link>
          {wa && <a href={wa} target="_blank" rel="noopener noreferrer" className="btn btn-ghost">שאלה על ההזמנה? וואטסאפ</a>}
          <Link href="/contact" className="btn btn-ghost">צור קשר</Link>
        </div>
        {order.status !== "CANCELLED" && order.status !== "REFUNDED" && (
          <p className="muted" style={{ textAlign: "center", marginTop: 14 }}>
            רוצים לבטל את ההזמנה? <Link href={`/cancel?t=${token}`}>ביטול עסקה</Link>
          </p>
        )}
      </div>
    </main>
  );
}
