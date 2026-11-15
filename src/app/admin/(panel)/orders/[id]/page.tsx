import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { formatDateTime, formatPrice } from "@/lib/format";
import { ORDER_STATUS } from "@/lib/order-status";
import { AdminTop } from "../../AdminTop";
import { updateOrder } from "../../content-actions";
import { Area, Select, Text } from "../../fields";
import { ActionForm } from "../../ui";

export const metadata = { title: "פרטי הזמנה" };

export default async function OrderPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin("MANAGER");
  const { id } = await params;
  const o = await db.order.findUnique({ where: { id }, include: { items: true, coupon: true } });
  if (!o) notFound();

  return (
    <>
      <AdminTop title={`הזמנה #${o.orderNumber}`} actions={<Link href="/admin/orders" className="btn btn-ghost" style={{ minHeight: 40 }}>חזרה</Link>} />
      <main className="admin-content">
        <div className="two-col">
          <section className="card table-wrap" aria-label="פריטים">
            <h2>פריטים</h2>
            <table className="table">
              <thead><tr><th>מוצר</th><th>מק&quot;ט</th><th>כמות</th><th>מחיר</th><th>סה&quot;כ</th></tr></thead>
              <tbody>
                {o.items.map((i) => (
                  <tr key={i.id}>
                    <td>{i.productName}{i.variantName ? ` (${i.variantName})` : ""}</td>
                    <td dir="ltr">{i.sku}</td>
                    <td>{i.quantity}</td>
                    <td>₪{formatPrice(i.unitPrice)}</td>
                    <td>₪{formatPrice(i.lineTotal)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p>סכום ביניים: ₪{formatPrice(o.subtotal)} · הנחה: ₪{formatPrice(o.discountTotal)}{o.coupon ? ` (${o.coupon.code})` : ""} · משלוח: ₪{formatPrice(o.shippingTotal)}</p>
            <p style={{ fontSize: 20 }}><b>סה&quot;כ: ₪{formatPrice(o.total)}</b></p>
          </section>
          <section className="card">
            <h2>לקוח ומשלוח</h2>
            <p style={{ margin: 0, lineHeight: 1.8 }}>
              {o.firstName} {o.lastName}<br />
              <a href={`tel:${o.phone}`} dir="ltr">{o.phone}</a><br />
              <a href={`mailto:${o.email}`}>{o.email}</a><br />
              {o.street} {o.houseNumber}{o.apartment ? `, דירה ${o.apartment}` : ""}, {o.city}<br />
              שיטת משלוח: {o.shippingMethod}<br />
              {o.deliveryNotes && <>הערות: {o.deliveryNotes}<br /></>}
              נוצרה: {formatDateTime(o.createdAt)}
              {o.paidAt && <><br />שולמה: {formatDateTime(o.paidAt)} ({o.paymentProvider})</>}
            </p>
          </section>
        </div>
        <section className="card">
          <h2>עדכון הזמנה</h2>
          <ActionForm action={updateOrder}>
            <input type="hidden" name="id" value={o.id} />
            <div className="form-grid cols-2">
              <Select name="status" label="סטטוס" defaultValue={o.status} options={Object.entries(ORDER_STATUS).map(([value, v]) => ({ value, label: v.label }))} />
              <Text name="trackingNumber" label="מספר משלוח למעקב" defaultValue={o.trackingNumber} dir="ltr" />
            </div>
            <Area name="internalNotes" label="הערות פנימיות (לא נראות ללקוח)" defaultValue={o.internalNotes} rows={3} />
          </ActionForm>
        </section>
      </main>
    </>
  );
}
