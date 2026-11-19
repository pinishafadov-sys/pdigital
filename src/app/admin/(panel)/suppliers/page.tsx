import Link from "next/link";
import { requireAdmin } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { AdminTop } from "../AdminTop";
import { Area, Check, Text } from "../fields";
import { deleteSupplier, saveSupplier } from "../purchase-orders/actions";
import { ActionForm, ConfirmButton } from "../ui";

export const metadata = { title: "ספקים" };

export default async function SuppliersPage({ searchParams }: { searchParams: Promise<{ edit?: string }> }) {
  await requireAdmin("MANAGER");
  const sp = await searchParams;
  const suppliers = await db.supplier.findMany({
    orderBy: [{ isActive: "desc" }, { name: "asc" }],
    include: { _count: { select: { products: true, purchaseOrders: true } } },
  });
  const edit = sp.edit ? suppliers.find((s) => s.id === sp.edit) : null;

  return (
    <>
      <AdminTop
        title="ספקים"
        actions={<Link href="/admin/purchase-orders" className="btn btn-ghost" style={{ minHeight: 40 }}>הזמנות רכש</Link>}
      />
      <main className="admin-content">
        <div className="two-col">
          <section className="card table-wrap" aria-label="רשימת ספקים">
            {suppliers.length ? (
              <table className="table">
                <thead><tr><th>ספק</th><th>איש קשר</th><th>טלפון</th><th>מוצרים</th><th>הזמנות</th><th></th></tr></thead>
                <tbody>
                  {suppliers.map((s) => (
                    <tr key={s.id} style={s.isActive ? undefined : { opacity: 0.55 }}>
                      <td><b>{s.name}</b>{!s.isActive && <> <span className="pill">לא פעיל</span></>}</td>
                      <td>{s.contactName ?? "-"}</td>
                      <td dir="ltr">{s.phone ? <a href={`tel:${s.phone.replace(/[^\d+]/g, "")}`}>{s.phone}</a> : "-"}</td>
                      <td>{s._count.products}</td>
                      <td>{s._count.purchaseOrders ? <Link href={`/admin/purchase-orders?supplier=${s.id}`}>{s._count.purchaseOrders}</Link> : 0}</td>
                      <td><Link href={`/admin/suppliers?edit=${s.id}`}>עריכה</Link></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p className="muted">עדיין אין ספקים. הוסיפו ספק בטופס, ואז שייכו אליו מוצרים בעריכת מוצר (שדה &quot;ספק&quot;).</p>
            )}
          </section>

          <section className="card" aria-labelledby="supplier-form">
            <h2 id="supplier-form">{edit ? `עריכה: ${edit.name}` : "ספק חדש"}</h2>
            <ActionForm key={edit?.id ?? "new"} action={saveSupplier} resetOnSuccess={!edit}>
              <input type="hidden" name="id" value={edit?.id ?? ""} />
              <Text name="name" label="שם הספק" defaultValue={edit?.name} required />
              <Text name="contactName" label="איש קשר" defaultValue={edit?.contactName} />
              <Text name="phone" label="טלפון" type="tel" defaultValue={edit?.phone} />
              <Text name="whatsapp" label="וואטסאפ" type="tel" defaultValue={edit?.whatsapp} hint="למשל 050-1234567. ההזמנה תישלח למספר הזה" />
              <Text name="email" label="אימייל" type="email" defaultValue={edit?.email} />
              <Text name="address" label="כתובת" defaultValue={edit?.address} />
              <Text name="taxId" label="ח.פ / ע.מ" defaultValue={edit?.taxId} />
              <Text name="leadTimeDays" label="זמן אספקה (ימים)" type="number" defaultValue={edit?.leadTimeDays ?? ""}
                hint="כמה ימים מההזמנה עד שהסחורה בחנות. משמש להמלצות להזמנה" />
              <Area name="notes" label="הערות" rows={3} defaultValue={edit?.notes} />
              {edit && <Check name="inactive" label="ספק לא פעיל (לא יופיע בבחירת ספק)" defaultChecked={!edit.isActive} />}
            </ActionForm>
            {edit && (
              <div style={{ display: "flex", gap: 10, marginTop: 12 }}>
                <Link href="/admin/suppliers" className="btn btn-ghost">ביטול</Link>
                <ConfirmButton
                  action={deleteSupplier}
                  hidden={{ id: edit.id }}
                  label={edit._count.purchaseOrders ? "העברה ללא פעיל" : "מחיקה"}
                  confirmText={
                    edit._count.purchaseOrders
                      ? `לספק "${edit.name}" יש הזמנות רכש, לכן הוא יסומן כלא פעיל (ההיסטוריה נשמרת). להמשיך?`
                      : `למחוק את "${edit.name}"? המוצרים שלו יישארו ללא ספק.`
                  }
                />
              </div>
            )}
          </section>
        </div>
      </main>
    </>
  );
}
