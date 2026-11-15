import Link from "next/link";
import { requireAdmin } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { formatDate, formatPrice } from "@/lib/format";
import { AdminTop } from "../AdminTop";
import { saveCoupon } from "../content-actions";
import { Check, Select, Text } from "../fields";
import { ActionForm } from "../ui";

export const metadata = { title: "קופונים" };
const TYPES = [
  { value: "PERCENT", label: "אחוז הנחה" },
  { value: "FIXED_AMOUNT", label: "סכום קבוע (₪)" },
  { value: "FREE_SHIPPING", label: "משלוח חינם" },
];
const d = (x: Date | null) => (x ? x.toISOString().slice(0, 10) : "");

export default async function CouponsPage({ searchParams }: { searchParams: Promise<{ edit?: string }> }) {
  await requireAdmin("MANAGER");
  const sp = await searchParams;
  const coupons = await db.coupon.findMany({ orderBy: { createdAt: "desc" } });
  const edit = sp.edit ? coupons.find((c) => c.id === sp.edit) : null;
  const show = (c: (typeof coupons)[number]) =>
    c.type === "PERCENT" ? `${c.value}%` : c.type === "FIXED_AMOUNT" ? `₪${formatPrice(c.value)}` : "משלוח חינם";

  return (
    <>
      <AdminTop title="מבצעים וקופונים" />
      <main className="admin-content">
        <p className="help">הקופונים ייכנסו לפעולה בשלב העגלה והתשלום. כבר עכשיו אפשר להכין אותם.</p>
        <div className="two-col">
          <section className="card table-wrap" aria-label="רשימת קופונים">
            {coupons.length ? (
              <table className="table">
                <thead><tr><th>קוד</th><th>הנחה</th><th>שימושים</th><th>תוקף</th><th>מצב</th><th></th></tr></thead>
                <tbody>
                  {coupons.map((c) => (
                    <tr key={c.id}>
                      <td dir="ltr"><b>{c.code}</b></td>
                      <td>{show(c)}</td>
                      <td>{c.usedCount}{c.maxUses ? ` / ${c.maxUses}` : ""}</td>
                      <td className="muted">{c.endsAt ? `עד ${formatDate(c.endsAt)}` : "ללא הגבלה"}</td>
                      <td>{c.isActive ? <span className="pill green">פעיל</span> : <span className="pill">כבוי</span>}</td>
                      <td><Link href={`/admin/coupons?edit=${c.id}`}>עריכה</Link></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : <p className="muted">אין קופונים עדיין.</p>}
          </section>
          <section className="card" aria-labelledby="coupon-form">
            <h2 id="coupon-form">{edit ? `עריכה: ${edit.code}` : "קופון חדש"}</h2>
            <ActionForm key={edit?.id ?? "new"} action={saveCoupon} resetOnSuccess={!edit}>
              <input type="hidden" name="id" value={edit?.id ?? ""} />
              <Text name="code" label="קוד" defaultValue={edit?.code} required dir="ltr" placeholder="SUMMER10" maxLength={40} />
              <Select name="type" label="סוג" defaultValue={edit?.type ?? "PERCENT"} options={TYPES} />
              <Text name="value" label="ערך (אחוז או ₪)" defaultValue={edit ? (edit.type === "PERCENT" ? edit.value : edit.value / 100) : ""} />
              <Text name="minOrderTotal" label="מינימום הזמנה ₪" defaultValue={edit?.minOrderTotal ? edit.minOrderTotal / 100 : ""} />
              <Text name="maxUses" label="מקסימום שימושים" type="number" defaultValue={edit?.maxUses ?? ""} />
              <Text name="startsAt" label="מתאריך" type="date" defaultValue={d(edit?.startsAt ?? null)} />
              <Text name="endsAt" label="עד תאריך" type="date" defaultValue={d(edit?.endsAt ?? null)} />
              <Check name="isActive" label="פעיל" defaultChecked={edit?.isActive ?? true} />
            </ActionForm>
          </section>
        </div>
      </main>
    </>
  );
}
