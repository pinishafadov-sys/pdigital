import Link from "next/link";
import { requireAdmin } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { AdminTop } from "../AdminTop";
import { deleteBrand, saveBrand } from "../content-actions";
import { Check, ImageInput, Text } from "../fields";
import { ActionForm, ConfirmButton } from "../ui";

export const metadata = { title: "מותגים" };

export default async function BrandsPage({ searchParams }: { searchParams: Promise<{ edit?: string }> }) {
  await requireAdmin("MANAGER");
  const sp = await searchParams;
  const brands = await db.brand.findMany({ orderBy: [{ sortOrder: "asc" }, { name: "asc" }], include: { _count: { select: { products: true } } } });
  const edit = sp.edit ? brands.find((b) => b.id === sp.edit) : null;

  return (
    <>
      <AdminTop title="מותגים" />
      <main className="admin-content">
        <div className="two-col">
          <section className="card table-wrap" aria-label="רשימת מותגים">
            {brands.length ? (
              <table className="table">
                <thead><tr><th></th><th>מותג</th><th>מוצרים</th><th>בפס המותגים</th><th></th></tr></thead>
                <tbody>
                  {brands.map((b) => (
                    <tr key={b.id}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <td>{b.logoUrl ? <img src={b.logoUrl} alt="" style={{ objectFit: "contain" }} /> : null}</td>
                      <td><b>{b.name}</b></td>
                      <td>{b._count.products}</td>
                      <td>{b.showInBrandStrip ? "✓" : ""}</td>
                      <td><Link href={`/admin/brands?edit=${b.id}`}>עריכה</Link></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : <p className="muted">אין מותגים עדיין.</p>}
          </section>
          <section className="card" aria-labelledby="brand-form">
            <h2 id="brand-form">{edit ? `עריכה: ${edit.name}` : "מותג חדש"}</h2>
            <ActionForm key={edit?.id ?? "new"} action={saveBrand} resetOnSuccess={!edit}>
              <input type="hidden" name="id" value={edit?.id ?? ""} />
              <Text name="name" label="שם המותג" defaultValue={edit?.name} required />
              <Text name="slug" label="כתובת (slug)" defaultValue={edit?.slug} hint="ריק = נוצר מהשם" />
              <Text name="sortOrder" label="סדר" type="number" defaultValue={edit?.sortOrder ?? 0} />
              <Text name="leadTimeDays" label="זמן אספקה מהספק (ימים)" type="number" defaultValue={edit?.leadTimeDays ?? ""}
                hint="ריק = ברירת המחדל מההגדרות. משמש להתראות להזמנה" />
              <ImageInput name="logo" label="לוגו" current={edit?.logoUrl} />
              <Check name="showInBrandStrip" label="להציג בפס המותגים בדף הבית" defaultChecked={edit?.showInBrandStrip} />
            </ActionForm>
            {edit && (
              <div style={{ display: "flex", gap: 10, marginTop: 12 }}>
                <Link href="/admin/brands" className="btn btn-ghost">ביטול</Link>
                <ConfirmButton action={deleteBrand} hidden={{ id: edit.id }} label="מחיקה" confirmText={`למחוק את "${edit.name}"? המוצרים יישארו ללא מותג.`} />
              </div>
            )}
          </section>
        </div>
      </main>
    </>
  );
}
