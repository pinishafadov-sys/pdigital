import Link from "next/link";
import type { Prisma, PurchaseOrderStatus } from "@/generated/prisma/client";
import { requireAdmin } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { formatDate, formatPrice } from "@/lib/format";
import { PO_STATUS, poTotals } from "@/lib/purchasing";
import { getVatRate } from "@/lib/settings";
import { AdminTop } from "../AdminTop";
import { SubmitButton } from "../ui";
import { createPurchaseOrder } from "./actions";

export const metadata = { title: "הזמנות רכש" };

type SP = { supplier?: string; status?: string; error?: string };

export default async function PurchaseOrdersPage({ searchParams }: { searchParams: Promise<SP> }) {
  await requireAdmin("MANAGER");
  const sp = await searchParams;
  const status = sp.status && sp.status in PO_STATUS ? (sp.status as PurchaseOrderStatus) : undefined;
  const where: Prisma.PurchaseOrderWhereInput = {
    ...(sp.supplier ? { supplierId: sp.supplier } : {}),
    ...(status ? { status } : {}),
  };
  const [orders, suppliers, vatRate] = await Promise.all([
    db.purchaseOrder.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 200,
      include: { supplier: { select: { name: true } }, items: { select: { qty: true, receivedQty: true, unitCost: true, isNew: true, pricedAt: true } } },
    }),
    db.supplier.findMany({ select: { id: true, name: true, isActive: true }, orderBy: { name: "asc" } }),
    getVatRate(),
  ]);
  const active = suppliers.filter((s) => s.isActive);
  const open = orders.filter((o) => o.status === "SENT" || o.status === "PARTIAL");
  const openValue = open.reduce((s, o) => s + poTotals(o.items, vatRate).net, 0);
  const waiting = (o: (typeof orders)[number]) => o.items.filter((i) => i.isNew && !i.pricedAt && i.receivedQty > 0).length;
  const toPrice = orders.reduce((s, o) => s + waiting(o), 0);
  const filtered = Boolean(sp.supplier || status);

  return (
    <>
      <AdminTop
        title="הזמנות רכש"
        actions={
          <>
            <Link href="/admin/reorder" className="btn btn-ghost" style={{ minHeight: 40 }}>המלצות להזמנה</Link>
            <Link href="/admin/suppliers" className="btn btn-ghost" style={{ minHeight: 40 }}>ספקים</Link>
          </>
        }
      />
      <main className="admin-content">
        <section className="card" aria-labelledby="new-po">
          <h2 id="new-po">הזמנת רכש חדשה</h2>
          {active.length ? (
            <form action={createPurchaseOrder} className="toolbar-row" style={{ alignItems: "flex-end" }}>
              <label className="field" style={{ minWidth: 240, flex: "1 1 240px", margin: 0 }}>
                <span>ספק</span>
                <select name="supplierId" required defaultValue="">
                  <option value="" disabled>בחירת ספק...</option>
                  {active.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </label>
              <SubmitButton label="יצירת הזמנה" />
            </form>
          ) : (
            <p className="muted" style={{ margin: 0 }}>
              כדי ליצור הזמנת רכש צריך קודם להוסיף ספק. <Link href="/admin/suppliers">הוספת ספק ←</Link>
            </p>
          )}
          {sp.error === "supplier" && <p className="form-error">יש לבחור ספק</p>}
          <p className="help" style={{ marginBottom: 0 }}>
            טיפ: במסך <Link href="/admin/reorder">המלצות להזמנה</Link> יש כפתור שיוצר הזמנה מוכנה לכל ספק, עם המוצרים והכמויות שכדאי להזמין.
          </p>
        </section>

        <section className="kpis" aria-label="סיכום">
          <div className="card kpi"><span className="label">הזמנות פתוחות</span><span className="value">{open.length}</span><span className="note">נשלחו ועוד לא התקבלו במלואן</span></div>
          <div className="card kpi"><span className="label">שווי הזמנות פתוחות</span><span className="value">₪{formatPrice(openValue)}</span><span className="note">לפני מע&quot;מ</span></div>
          <div className="card kpi"><span className="label">טיוטות</span><span className="value">{orders.filter((o) => o.status === "DRAFT").length}</span><span className="note">עוד לא נשלחו לספק</span></div>
          <div className="card kpi"><span className="label">מוצרים חדשים לתמחור</span><span className="value" style={{ color: toPrice ? "var(--text-orange-ink)" : undefined }}>{toPrice}</span><span className="note">הגיעו ומחכים לאישור שלך</span></div>
        </section>

        <form method="get" className="card form-section" aria-label="סינון הזמנות רכש">
          <div className="form-grid cols-3">
            <label className="field">
              <span>ספק</span>
              <select name="supplier" defaultValue={sp.supplier ?? ""}>
                <option value="">כל הספקים</option>
                {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </label>
            <label className="field">
              <span>סטטוס</span>
              <select name="status" defaultValue={status ?? ""}>
                <option value="">הכל</option>
                {Object.entries(PO_STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
            </label>
          </div>
          <div className="toolbar-row">
            <button type="submit" className="btn btn-primary">סינון</button>
            {filtered && <Link href="/admin/purchase-orders" className="btn btn-ghost">ניקוי</Link>}
          </div>
        </form>

        <section className="card table-wrap" aria-label="רשימת הזמנות רכש">
          {orders.length ? (
            <table className="table">
              <thead>
                <tr><th>הזמנה</th><th>ספק</th><th>פריטים</th><th>יחידות</th><th>סכום לפני מע&quot;מ</th><th>סטטוס</th><th>נוצרה</th><th>אספקה צפויה</th></tr>
              </thead>
              <tbody>
                {orders.map((o) => {
                  const t = poTotals(o.items, vatRate);
                  const got = o.items.reduce((s, i) => s + i.receivedQty, 0);
                  return (
                    <tr key={o.id}>
                      <td><Link href={`/admin/purchase-orders/${o.id}`} style={{ fontWeight: 600 }}>#{o.number}</Link></td>
                      <td>{o.supplier.name}</td>
                      <td>{o.items.length}</td>
                      <td>{o.status === "PARTIAL" ? `${got} / ${t.units}` : t.units}</td>
                      <td>₪{formatPrice(t.net)}</td>
                      <td>
                        <span className={`pill ${PO_STATUS[o.status].cls}`}>{PO_STATUS[o.status].label}</span>
                        {waiting(o) > 0 && <> <span className="pill orange">ממתין לתמחור</span></>}
                      </td>
                      <td>{formatDate(o.createdAt)}</td>
                      <td>{o.expectedAt ? formatDate(o.expectedAt) : "-"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : (
            <p className="muted">{filtered ? "לא נמצאו הזמנות רכש." : "עדיין אין הזמנות רכש."}</p>
          )}
        </section>
      </main>
    </>
  );
}
