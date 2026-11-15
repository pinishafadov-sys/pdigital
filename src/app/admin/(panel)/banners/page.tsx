import Link from "next/link";
import { requireAdmin } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { AdminTop } from "../AdminTop";
import { deleteBanner, saveBanner } from "../content-actions";
import { Check, ImageInput, Select, Text } from "../fields";
import { ActionForm, ConfirmButton } from "../ui";

export const metadata = { title: "באנרים" };
const PLACEMENTS = [
  { value: "HOME_HERO", label: "באנר ראשי בדף הבית" },
  { value: "HOME_SIDE", label: "באנר קטן בדף הבית (עד 2)" },
  { value: "HOME_CLUB", label: "מועדון לקוחות" },
  { value: "CATEGORY_TOP", label: "ראש דף קטגוריה" },
];
const dt = (d: Date | null) => (d ? new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16) : "");

export default async function BannersPage({ searchParams }: { searchParams: Promise<{ edit?: string }> }) {
  await requireAdmin();
  const sp = await searchParams;
  const banners = await db.banner.findMany({ orderBy: [{ placement: "asc" }, { sortOrder: "asc" }] });
  const edit = sp.edit ? banners.find((b) => b.id === sp.edit) : null;

  return (
    <>
      <AdminTop title="באנרים" />
      <main className="admin-content">
        <p className="help">כשאין באנר פעיל, האתר מציג את העיצוב המקורי (רקע סגול עם הלוגו). מומלץ: באנר ראשי 1600×600, באנר קטן 600×400.</p>
        <div className="two-col">
          <section className="card table-wrap" aria-label="רשימת באנרים">
            {banners.length ? (
              <table className="table">
                <thead><tr><th></th><th>כותרת</th><th>מיקום</th><th>מצב</th><th></th></tr></thead>
                <tbody>
                  {banners.map((b) => (
                    <tr key={b.id}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <td><img src={b.imageUrl} alt="" /></td>
                      <td>{b.title ?? <span className="muted">ללא כותרת</span>}</td>
                      <td>{PLACEMENTS.find((p) => p.value === b.placement)?.label}</td>
                      <td>{b.isActive ? <span className="pill green">פעיל</span> : <span className="pill">כבוי</span>}</td>
                      <td><Link href={`/admin/banners?edit=${b.id}`}>עריכה</Link></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : <p className="muted">אין באנרים. האתר מציג כרגע את באנר ברירת המחדל.</p>}
          </section>
          <section className="card" aria-labelledby="banner-form">
            <h2 id="banner-form">{edit ? "עריכת באנר" : "באנר חדש"}</h2>
            <ActionForm key={edit?.id ?? "new"} action={saveBanner} resetOnSuccess={!edit}>
              <input type="hidden" name="id" value={edit?.id ?? ""} />
              <Select name="placement" label="מיקום" defaultValue={edit?.placement ?? "HOME_HERO"} options={PLACEMENTS} />
              <ImageInput name="image" label="תמונה *" current={edit?.imageUrl} />
              <ImageInput name="mobileImage" label="תמונה למובייל (לא חובה)" current={edit?.mobileImageUrl} />
              <Text name="alt" label="תיאור התמונה (נגישות) *" defaultValue={edit?.alt} required />
              <Text name="title" label="כותרת" defaultValue={edit?.title} />
              <Text name="subtitle" label="כותרת משנה" defaultValue={edit?.subtitle} />
              <Text name="buttonText" label="טקסט כפתור" defaultValue={edit?.buttonText} placeholder="לכל המבצעים" />
              <Text name="linkUrl" label="קישור" defaultValue={edit?.linkUrl} dir="ltr" placeholder="/category/gaming" />
              <Text name="sortOrder" label="סדר" type="number" defaultValue={edit?.sortOrder ?? 0} />
              <Text name="startsAt" label="להציג מתאריך" type="datetime-local" defaultValue={dt(edit?.startsAt ?? null)} />
              <Text name="endsAt" label="להציג עד תאריך" type="datetime-local" defaultValue={dt(edit?.endsAt ?? null)} />
              <Check name="isActive" label="פעיל" defaultChecked={edit?.isActive ?? true} />
            </ActionForm>
            {edit && (
              <div style={{ display: "flex", gap: 10, marginTop: 12 }}>
                <Link href="/admin/banners" className="btn btn-ghost">ביטול</Link>
                <ConfirmButton action={deleteBanner} hidden={{ id: edit.id }} label="מחיקה" confirmText="למחוק את הבאנר?" />
              </div>
            )}
          </section>
        </div>
      </main>
    </>
  );
}
