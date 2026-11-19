import Link from "next/link";
import { requireAdmin } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { formatDateTime, formatPrice } from "@/lib/format";
import { ORDER_STATUS } from "@/lib/order-status";
import { AdminTop } from "../AdminTop";

export const metadata = { title: "ביטולים והחזרות" };

export default async function ReturnsPage() {
  await requireAdmin("MANAGER");
  const [pending, handled, refunds] = await Promise.all([
    db.cancelRequest.findMany({ where: { status: "PENDING" }, orderBy: { createdAt: "asc" }, include: { order: true } }),
    db.cancelRequest.findMany({
      where: { status: { not: "PENDING" } },
      orderBy: { handledAt: "desc" },
      take: 50,
      include: { order: { select: { id: true, orderNumber: true, firstName: true, lastName: true, total: true } } },
    }),
    db.orderRefund.findMany({
      orderBy: { createdAt: "desc" },
      take: 50,
      include: { order: { select: { id: true, orderNumber: true, firstName: true, lastName: true } } },
    }),
  ]);

  return (
    <>
      <AdminTop title="ביטולים והחזרות" />
      <main className="admin-content">
        <p className="help" style={{ margin: 0 }}>
          לקוחות יכולים לבקש ביטול עסקה מהאתר (קישור &quot;ביטול עסקה&quot; בתחתית האתר ובדף ההזמנה). כל בקשה מחכה כאן לאישור שלך. אישור מבטל את
          ההזמנה ומחזיר את המוצרים למלאי. החזרה של חלק מהמוצרים נעשית מתוך דף ההזמנה. את הכסף מחזירים דרך חברת הסליקה.
        </p>

        <section className="card table-wrap" aria-labelledby="pending">
          <h2 id="pending">בקשות ביטול שמחכות לך ({pending.length})</h2>
          {pending.length ? (
            <table className="table">
              <thead><tr><th>הזמנה</th><th>לקוח</th><th>טלפון</th><th>סכום</th><th>סטטוס הזמנה</th><th>סיבה</th><th>התקבלה</th><th></th></tr></thead>
              <tbody>
                {pending.map((r) => (
                  <tr key={r.id}>
                    <td><b>#{r.order.orderNumber}</b></td>
                    <td>{r.order.firstName} {r.order.lastName}</td>
                    <td dir="ltr"><a href={`tel:${r.order.phone}`}>{r.order.phone}</a></td>
                    <td>₪{formatPrice(r.order.total)}</td>
                    <td><span className={`pill ${ORDER_STATUS[r.order.status].cls}`}>{ORDER_STATUS[r.order.status].label}</span></td>
                    <td>{r.reason ?? <span className="muted">-</span>}</td>
                    <td className="muted">{formatDateTime(r.createdAt)}</td>
                    <td><Link href={`/admin/orders/${r.order.id}`} className="btn btn-primary" style={{ minHeight: 36 }}>טיפול ←</Link></td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : <p className="muted">אין בקשות ביטול פתוחות.</p>}
        </section>

        <div className="two-col">
          <section className="card table-wrap" aria-labelledby="refunds">
            <h2 id="refunds">החזרות אחרונות (חלק מהזמנה)</h2>
            {refunds.length ? (
              <table className="table">
                <thead><tr><th>הזמנה</th><th>לקוח</th><th>החזר</th><th>מתי</th></tr></thead>
                <tbody>
                  {refunds.map((r) => (
                    <tr key={r.id}>
                      <td><Link href={`/admin/orders/${r.order.id}`}>#{r.order.orderNumber}</Link></td>
                      <td>{r.order.firstName} {r.order.lastName}</td>
                      <td>₪{formatPrice(r.amount)}</td>
                      <td className="muted">{formatDateTime(r.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : <p className="muted">עדיין אין החזרות.</p>}
          </section>
          <section className="card table-wrap" aria-labelledby="handled">
            <h2 id="handled">בקשות שטופלו</h2>
            {handled.length ? (
              <table className="table">
                <thead><tr><th>הזמנה</th><th>לקוח</th><th>החלטה</th><th>מתי</th></tr></thead>
                <tbody>
                  {handled.map((r) => (
                    <tr key={r.id}>
                      <td><Link href={`/admin/orders/${r.order.id}`}>#{r.order.orderNumber}</Link></td>
                      <td>{r.order.firstName} {r.order.lastName}</td>
                      <td><span className={`pill ${r.status === "APPROVED" ? "green" : "pink"}`}>{r.status === "APPROVED" ? "אושרה" : "נדחתה"}</span></td>
                      <td className="muted">{r.handledAt ? formatDateTime(r.handledAt) : "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : <p className="muted">עדיין לא טופלו בקשות.</p>}
          </section>
        </div>
      </main>
    </>
  );
}
