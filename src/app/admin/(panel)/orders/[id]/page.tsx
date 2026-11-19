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
import { PAID_STATES } from "@/lib/orders";
import { handleCancelRequest, returnItemsAction } from "../return-actions";

export const metadata = { title: "פרטי הזמנה" };

const DONE: Record<string, string> = {
  "cancel-approved": "בקשת הביטול אושרה: ההזמנה בוטלה, המוצרים חזרו למלאי והלקוח קיבל מייל. את הכסף מחזירים דרך חברת הסליקה.",
  "cancel-rejected": "בקשת הביטול נדחתה והלקוח עודכן במייל.",
  "returned-all": "כל המוצרים הוחזרו וההזמנה סומנה כ\"הוחזרה\".",
};

export default async function OrderPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ done?: string }> }) {
  await requireAdmin("MANAGER");
  const { id } = await params;
  const { done } = await searchParams;
  const o = await db.order.findUnique({
    where: { id },
    include: {
      items: true,
      coupon: true,
      refunds: { orderBy: { createdAt: "desc" }, include: { createdBy: { select: { displayName: true } } } },
      cancelRequests: { orderBy: { createdAt: "desc" }, include: { handledBy: { select: { displayName: true } } } },
    },
  });
  if (!o) notFound();
  const pending = o.cancelRequests.find((r) => r.status === "PENDING");
  const canReturn = PAID_STATES.includes(o.status) && o.items.some((i) => i.returnedQty < i.quantity);
  const refunded = o.refunds.reduce((s, r) => s + r.amount, 0);

  return (
    <>
      <AdminTop title={`הזמנה #${o.orderNumber}`} actions={<Link href="/admin/orders" className="btn btn-ghost" style={{ minHeight: 40 }}>חזרה</Link>} />
      <main className="admin-content">
        {done && DONE[done] && <p className="form-ok" role="status">{DONE[done]}</p>}
        {pending && (
          <section className="card cancel-alert" aria-labelledby="cancel-req">
            <h2 id="cancel-req">⚠️ הלקוח ביקש לבטל את העסקה</h2>
            <p style={{ marginTop: 0 }}>
              התקבלה {formatDateTime(pending.createdAt)}.{pending.reason ? <> סיבה: <b>{pending.reason}</b></> : " לא צוינה סיבה."}
            </p>
            <p className="help">
              אישור יבטל את ההזמנה, יחזיר את המוצרים למלאי וישלח ללקוח מייל.
              {PAID_STATES.includes(o.status) && <> את הכסף (₪{formatPrice(o.total - refunded)}) מחזירים דרך חברת הסליקה.</>}
              {o.status === "SHIPPED" && " שימו לב: ההזמנה כבר נשלחה. כדאי לאשר אחרי שהמוצרים חזרו אליכם."}
            </p>
            <ActionForm action={handleCancelRequest} submitLabel="שליחת ההחלטה">
              <input type="hidden" name="requestId" value={pending.id} />
              <div className="form-grid cols-2">
                <label className="field">
                  <span>החלטה</span>
                  <select name="decision" defaultValue="APPROVED">
                    <option value="APPROVED">לאשר את הביטול</option>
                    <option value="REJECTED">לדחות את הבקשה</option>
                  </select>
                </label>
                <Text name="adminNote" label="הודעה ללקוח (לא חובה)" />
              </div>
            </ActionForm>
          </section>
        )}
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
                    <td>{i.quantity}{i.returnedQty > 0 && <span className="pill pink" style={{ marginInlineStart: 6 }}>הוחזרו {i.returnedQty}</span>}</td>
                    <td>₪{formatPrice(i.unitPrice)}</td>
                    <td>₪{formatPrice(i.lineTotal)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p>סכום ביניים: ₪{formatPrice(o.subtotal)} · הנחה: ₪{formatPrice(o.discountTotal)}{o.coupon ? ` (${o.coupon.code})` : ""} · משלוח: ₪{formatPrice(o.shippingTotal)}</p>
            <p style={{ fontSize: 20 }}><b>סה&quot;כ: ₪{formatPrice(o.total)}</b></p>
            {refunded > 0 && <p className="neg" style={{ margin: 0 }}>הוחזר ללקוח: ₪{formatPrice(refunded)} · נשאר: ₪{formatPrice(o.total - refunded)}</p>}
          </section>
          <section className="card">
            <h2>לקוח ומשלוח</h2>
            <p style={{ margin: 0, lineHeight: 1.8 }}>
              {o.firstName} {o.lastName}<br />
              <a href={`tel:${o.phone}`} dir="ltr">{o.phone}</a><br />
              <a href={`mailto:${o.email}`}>{o.email}</a><br />
              {o.street} {o.houseNumber}{o.apartment ? `, דירה ${o.apartment}` : ""}, {o.city}<br />
              שיטת משלוח: {o.shippingMethod}<br />
              {o.companyName && <>חשבונית על שם: <b>{o.companyName}</b> · ח.פ {o.companyTaxId}<br /></>}
              {o.deliveryNotes && <>הערות: {o.deliveryNotes}<br /></>}
              נוצרה: {formatDateTime(o.createdAt)}
              {o.paidAt && <><br />שולמה: {formatDateTime(o.paidAt)} ({o.paymentProvider})</>}
            </p>
          </section>
        </div>
        <section className="card">
          <h2>עדכון הזמנה</h2>
          <ActionForm key={`${o.status}-${o.updatedAt.toISOString()}`} action={updateOrder}>
            <input type="hidden" name="id" value={o.id} />
            <div className="form-grid cols-2">
              <Select name="status" label="סטטוס" defaultValue={o.status} options={Object.entries(ORDER_STATUS).map(([value, v]) => ({ value, label: v.label }))} />
              <Text name="trackingNumber" label="מספר משלוח למעקב" defaultValue={o.trackingNumber} dir="ltr" />
            </div>
            <Area name="internalNotes" label="הערות פנימיות (לא נראות ללקוח)" defaultValue={o.internalNotes} rows={3} />
            <p className="help" style={{ margin: 0 }}>
              {o.stockDeducted
                ? "המוצרים כבר ירדו מהמלאי. ביטול או החזרה יחזירו אותם למלאי אוטומטית."
                : "המלאי יורד אוטומטית כשמסמנים את ההזמנה כ\"חדשה\" (שולמה) או מתקדמת יותר."}
            </p>
          </ActionForm>
        </section>

        {canReturn && (
          <section className="card table-wrap" aria-labelledby="returns">
            <h2 id="returns">החזרת מוצרים (חלק מההזמנה)</h2>
            <p className="help">
              הלקוח החזיר רק חלק מהמוצרים? רשמו כמה הוחזר מכל מוצר. הסכום להחזר מחושב לבד לפי מחיר המוצרים (אפשר לשנות, למשל להוסיף דמי משלוח
              או להוריד דמי ביטול). אם כל המוצרים יוחזרו, ההזמנה תסומן כ&quot;הוחזרה&quot;. לביטול ההזמנה כולה, שנו את הסטטוס למעלה.
            </p>
            <ActionForm action={returnItemsAction} submitLabel="רישום ההחזרה">
              <input type="hidden" name="orderId" value={o.id} />
              <table className="table">
                <thead><tr><th>מוצר</th><th>נקנו</th><th>הוחזרו כבר</th><th>מחזיר עכשיו</th></tr></thead>
                <tbody>
                  {o.items.map((i) => (
                    <tr key={i.id}>
                      <td>{i.productName}{i.variantName ? ` (${i.variantName})` : ""}<div className="muted" style={{ fontSize: 12 }}>₪{formatPrice(i.unitPrice)} ליח&apos;</div></td>
                      <td>{i.quantity}</td>
                      <td>{i.returnedQty}</td>
                      <td>
                        {i.returnedQty < i.quantity ? (
                          <input className="po-input" type="number" name={`ret_${i.id}`} min={0} max={i.quantity - i.returnedQty} defaultValue={0} aria-label={`כמות להחזרה - ${i.productName}`} />
                        ) : <span className="muted">הוחזר הכל</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="form-grid cols-2">
                <label className="field">
                  <span>סכום להחזר ₪</span>
                  <input name="refund" inputMode="decimal" placeholder="ריק = לפי מחיר המוצרים שהוחזרו" />
                </label>
                <Text name="note" label="הערה (לא חובה)" />
              </div>
              <label className="check">
                <input type="checkbox" name="restock" defaultChecked />
                להחזיר את המוצרים למלאי (בלי סימון: מוצר פגום שלא חוזר למכירה)
              </label>
            </ActionForm>
          </section>
        )}

        {(o.refunds.length > 0 || o.cancelRequests.some((r) => r.status !== "PENDING")) && (
          <section className="card" aria-labelledby="ret-hist">
            <h2 id="ret-hist">היסטוריית ביטולים והחזרות</h2>
            <ul style={{ margin: 0, paddingInlineStart: 20, lineHeight: 1.9 }}>
              {o.refunds.map((r) => (
                <li key={r.id}>
                  {formatDateTime(r.createdAt)}: החזר ₪{formatPrice(r.amount)}{r.note ? ` · ${r.note}` : ""}{r.createdBy ? ` · ${r.createdBy.displayName}` : ""}
                </li>
              ))}
              {o.cancelRequests.filter((r) => r.status !== "PENDING").map((r) => (
                <li key={r.id}>
                  {formatDateTime(r.createdAt)}: בקשת ביטול מהלקוח, {r.status === "APPROVED" ? "אושרה" : "נדחתה"}
                  {r.handledAt ? ` ב-${formatDateTime(r.handledAt)}` : ""}{r.handledBy ? ` ע"י ${r.handledBy.displayName}` : ""}
                  {r.adminNote ? ` · "${r.adminNote}"` : ""}
                </li>
              ))}
            </ul>
          </section>
        )}
      </main>
    </>
  );
}
