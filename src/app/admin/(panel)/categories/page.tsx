import Link from "next/link";
import { requireAdmin } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { AdminTop } from "../AdminTop";
import { deleteCategory, saveCategory } from "../content-actions";
import { Check, ImageInput, Select, Text } from "../fields";
import { ActionForm, ConfirmButton } from "../ui";

export const metadata = { title: "קטגוריות" };

export default async function CategoriesPage({ searchParams }: { searchParams: Promise<{ edit?: string; error?: string }> }) {
  await requireAdmin("MANAGER");
  const sp = await searchParams;
  const cats = await db.category.findMany({
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    include: { _count: { select: { products: true } } },
  });
  const top = cats.filter((c) => !c.parentId);
  const edit = sp.edit ? cats.find((c) => c.id === sp.edit) : null;

  return (
    <>
      <AdminTop title="קטגוריות ותפריט" />
      <main className="admin-content">
        {sp.error && <p className="form-error">{sp.error}</p>}
        <p className="help">המחלקות הראשיות מופיעות בתפריט, ב&quot;המחלקות שלנו&quot; ובכותרת התחתונה לפי הסדר. אביזרים מקבלים תת-קטגוריה נפרדת בתוך כל מחלקה.</p>
        <div className="two-col">
          <section className="card table-wrap" aria-label="רשימת קטגוריות">
            <table className="table">
              <thead><tr><th>שם</th><th>סדר</th><th>מוצרים</th><th>מצב</th><th></th></tr></thead>
              <tbody>
                {top.flatMap((c) => [c, ...cats.filter((x) => x.parentId === c.id)]).map((c) => (
                  <tr key={c.id}>
                    <td style={{ paddingInlineStart: c.parentId ? 28 : 10 }}>
                      {c.parentId ? "↳ " : ""}<b>{c.name}</b>
                      {c.isAccessories && <span className="pill blue" style={{ marginInlineStart: 6 }}>אביזרים</span>}
                    </td>
                    <td>{c.sortOrder}</td>
                    <td>{c._count.products}</td>
                    <td>{c.isActive ? <span className="pill green">פעיל</span> : <span className="pill">מוסתר</span>}</td>
                    <td><Link href={`/admin/categories?edit=${c.id}`}>עריכה</Link></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          <section className="card" aria-labelledby="cat-form">
            <h2 id="cat-form">{edit ? `עריכה: ${edit.name}` : "קטגוריה חדשה"}</h2>
            <ActionForm key={edit?.id ?? "new"} action={saveCategory} resetOnSuccess={!edit}>
              <input type="hidden" name="id" value={edit?.id ?? ""} />
              <Text name="name" label="שם" defaultValue={edit?.name} required maxLength={80} />
              <Select name="parentId" label="קטגוריית אב" defaultValue={edit?.parentId} emptyLabel="ללא - מחלקה ראשית"
                options={top.filter((c) => c.id !== edit?.id).map((c) => ({ value: c.id, label: c.name }))} />
              <Text name="sortOrder" label="סדר הופעה" type="number" defaultValue={edit?.sortOrder ?? 0} />
              <Text name="description" label="תיאור קצר (מופיע בראש הדף ובגוגל)" defaultValue={edit?.description} maxLength={1000} />
              <ImageInput name="image" label="תמונת קטגוריה (לעיגול בדף הבית)" current={edit?.imageUrl} />
              {edit?.imageUrl && <Check name="removeImage" label="הסרת התמונה" />}
              <Check name="isActive" label="פעילה ומוצגת באתר" defaultChecked={edit?.isActive ?? true} />
              <Check name="showOnHome" label='להציג ב"המחלקות שלנו"' defaultChecked={edit?.showOnHome ?? true} />
              <Check name="isAccessories" label="זו תת-קטגוריית אביזרים" defaultChecked={edit?.isAccessories} />
              <details>
                <summary style={{ cursor: "pointer", fontWeight: 600 }}>קידום בגוגל</summary>
                <div className="form-section" style={{ marginTop: 12 }}>
                  <Text name="slug" label="כתובת (slug)" defaultValue={edit?.slug} hint="ריק = נוצר מהשם" />
                  <Text name="seoTitle" label="כותרת לגוגל" defaultValue={edit?.seoTitle} />
                  <Text name="seoDescription" label="תיאור לגוגל" defaultValue={edit?.seoDescription} maxLength={300} />
                </div>
              </details>
            </ActionForm>
            {edit && (
              <div style={{ display: "flex", gap: 10, marginTop: 12 }}>
                <Link href="/admin/categories" className="btn btn-ghost">ביטול</Link>
                <ConfirmButton action={deleteCategory} hidden={{ id: edit.id }} label="מחיקה" confirmText={`למחוק את "${edit.name}"?`} />
              </div>
            )}
          </section>
        </div>
      </main>
    </>
  );
}
