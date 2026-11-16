import Link from "next/link";
import { requireAdmin } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { formatDateTime, formatPrice } from "@/lib/format";
import { orderSearchWhere } from "@/lib/order-search";
import { ORDER_STATUS } from "@/lib/order-status";
import { AdminTop } from "../AdminTop";

export const metadata = { title: "הזמנות וחשבוניות" };

type SP = { q?: string; status?: string; from?: string; to?: string };

export default async function OrdersPage({ searchParams }: { searchParams: Promise<SP> }) {
  await requireAdmin("MANAGER");
  const sp = await searchParams;
  const q = (sp.q ?? "").slice(0, 80);
  const status = sp.status && sp.status in ORDER_STATUS ? sp.status : "";
  const where = orderSearchWhere(q, { status, from: sp.from, to: sp.to });
  const filtered = Boolean(q || status || sp.from || sp.to);
  const [orders, total] = await Promise.all([
    db.order.findMany({ where, orderBy: { createdAt: "desc" }, take: 200, include: { _count: { select: { items: true } } } }),
    db.order.count({ where }),
  ]);
  const sum = orders.reduce((s, o) => s + o.total, 0);

  return (
    <>
      <AdminTop title="הזמנות וחשבוניות" />
      <main className="admin-content">
        <form method="get" className="card form-section" role="search" aria-label="חיפוש הזמנות">
          <div className="form-grid cols-3">
            <label className="field span-all">
              <span>חיפוש לפי פרטי לקוח</span>
              <input type="search" name="q" defaultValue={q} placeholder="שם, טלפון, מייל, עיר, מספר הזמנה, מספר חשבונית או מספר משלוח" autoFocus={!filtered} />
            </label>
            <label className="field">
              <span>סטטוס</span>
              <select name="status" defaultValue={status}>
                <option value="">הכל</option>
                {Object.entries(ORDER_STATUS).map(([k, v]) => (
                  <option key={k} value={k}>{v.label}</option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>מתאריך</span>
              <input type="date" name="from" defaultValue={sp.from ?? ""} />
            </label>
            <label className="field">
              <span>עד תאריך</span>
              <input type="date" name="to" defaultValue={sp.to ?? ""} />
            </label>
          </div>
          <div className="toolbar-row">
            <button type="submit" className="btn btn-primary">חיפוש</button>
            {filtered && <Link href="/admin/orders" className="btn btn-ghost">ניקוי</Link>}
            <span className="muted" aria-live="polite">
              {filtered ? `נמצאו ${total} הזמנות` : `${total} הזמנות בסך הכל`}
              {orders.length > 0 && ` · סה"כ ₪${formatPrice(sum)}${total > orders.length ? ` (ב-${orders.length} הראשונות)` : ""}`}
            </span>
          </div>
        </form>

        <div className="card table-wrap">
          {orders.length ? (
            <table className="table">
              <thead>
                <tr><th>הזמנה</th><th>לקוח</th><th>טלפון</th><th>עיר</th><th>חשבונית</th><th>פריטים</th><th>סכום</th><th>סטטוס</th><th>תאריך</th></tr>
              </thead>
              <tbody>
                {orders.map((o) => (
                  <tr key={o.id}>
                    <td><Link href={`/admin/orders/${o.id}`} style={{ fontWeight: 600 }}>#{o.orderNumber}</Link></td>
                    <td>{o.firstName} {o.lastName}<div className="muted" style={{ fontSize: 12 }} dir="ltr">{o.email}</div></td>
                    <td dir="ltr">{o.phone}</td>
                    <td>{o.city}</td>
                    <td>
                      {o.invoiceNumber ? (
                        o.invoiceUrl ? <a href={o.invoiceUrl} target="_blank" rel="noopener noreferrer">{o.invoiceNumber}</a> : o.invoiceNumber
                      ) : (
                        <span className="muted">-</span>
                      )}
                    </td>
                    <td>{o._count.items}</td>
                    <td>₪{formatPrice(o.total)}</td>
                    <td><span className={`pill ${ORDER_STATUS[o.status].cls}`}>{ORDER_STATUS[o.status].label}</span></td>
                    <td className="muted">{formatDateTime(o.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="muted">
              {filtered
                ? "לא נמצאו הזמנות שמתאימות לחיפוש."
                : "אין הזמנות עדיין. הזמנות וחשבוניות יגיעו לכאן אוטומטית אחרי חיבור התשלום ושירות החשבוניות."}
            </p>
          )}
        </div>
      </main>
    </>
  );
}
