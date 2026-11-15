import Link from "next/link";
import { requireAdmin } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { AdminTop } from "../AdminTop";
import { TypeForm } from "./TypeForm";

export const metadata = { title: "סוגי מוצר ומפרט" };

export default async function TypesPage({ searchParams }: { searchParams: Promise<{ edit?: string }> }) {
  await requireAdmin("MANAGER");
  const sp = await searchParams;
  const types = await db.productType.findMany({
    orderBy: { name: "asc" },
    include: { specFields: { orderBy: { sortOrder: "asc" } }, _count: { select: { products: true } } },
  });
  const edit = sp.edit ? types.find((t) => t.id === sp.edit) : null;

  return (
    <>
      <AdminTop title="סוגי מוצר ומפרט" />
      <main className="admin-content">
        <p className="help">
          סוג מוצר (למשל &quot;מטען&quot;, &quot;אוזניות&quot;) קובע אילו שדות מפרט יש למוצרים שלו. כך כל הכרטיסים בקטגוריה מציגים את אותם
          שדות, והלקוחות יכולים לסנן לפיהם.
        </p>
        <div className="two-col">
          <section className="card table-wrap" aria-label="סוגי מוצר">
            {types.length ? (
              <table className="table">
                <thead><tr><th>סוג</th><th>שדות</th><th>מוצרים</th><th></th></tr></thead>
                <tbody>
                  {types.map((t) => (
                    <tr key={t.id}>
                      <td><b>{t.name}</b></td>
                      <td className="muted">{t.specFields.map((f) => f.label).join(", ") || "-"}</td>
                      <td>{t._count.products}</td>
                      <td><Link href={`/admin/types?edit=${t.id}`}>עריכה</Link></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : <p className="muted">אין סוגי מוצר עדיין.</p>}
          </section>
          <section className="card" aria-labelledby="type-form">
            <h2 id="type-form">{edit ? `עריכה: ${edit.name}` : "סוג מוצר חדש"}</h2>
            <TypeForm
              key={edit?.id ?? "new"}
              type={edit ? { id: edit.id, name: edit.name, slug: edit.slug, fields: edit.specFields.map((f) => ({ id: f.id, label: f.label, unit: f.unit ?? "", group: f.group ?? "", filter: f.isFilterable, card: f.showOnCard })) } : null}
            />
            {edit && <Link href="/admin/types" className="btn btn-ghost" style={{ marginTop: 12 }}>ביטול</Link>}
          </section>
        </div>
      </main>
    </>
  );
}
