import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { AdminTop } from "../../AdminTop";
import { deletePage, savePage } from "../../content-actions";
import { Area, Check, RICH_HINT, Text } from "../../fields";
import { ActionForm, ConfirmButton } from "../../ui";

export const metadata = { title: "עריכת עמוד" };
const CORE = ["terms", "privacy", "accessibility", "shipping", "returns"];

export default async function EditPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;
  const p = id === "new" ? null : await db.page.findUnique({ where: { id } });
  if (id !== "new" && !p) notFound();

  return (
    <>
      <AdminTop
        title={p ? p.title : "עמוד חדש"}
        actions={
          <>
            {p?.isPublished && <Link href={`/pages/${p.slug}`} target="_blank" className="btn btn-ghost" style={{ minHeight: 40 }}>צפייה</Link>}
            <Link href="/admin/pages" className="btn btn-ghost" style={{ minHeight: 40 }}>חזרה</Link>
          </>
        }
      />
      <main className="admin-content">
        {p?.slug === "accessibility" && (
          <p className="help">פרטי רכז/ת הנגישות נמשכים אוטומטית מ&quot;הגדרות&quot; (הקודים {"{{coordinatorName}}"} וכו&apos;). אין למחוק אותם מהטקסט.</p>
        )}
        <div className="card">
          <ActionForm action={savePage}>
            <input type="hidden" name="id" value={p?.id ?? ""} />
            <Text name="title" label="כותרת" defaultValue={p?.title} required maxLength={160} />
            <Area name="body" label="תוכן" defaultValue={p?.body} rows={22} hint={RICH_HINT} maxLength={60000} />
            <div className="form-grid cols-3">
              <Text name="slug" label="כתובת (slug)" defaultValue={p?.slug} dir="ltr" hint={CORE.includes(p?.slug ?? "") ? "עמוד מערכת - מומלץ לא לשנות" : "ריק = נוצר מהכותרת"} />
              <Text name="seoTitle" label="כותרת לגוגל" defaultValue={p?.seoTitle} />
              <Text name="seoDescription" label="תיאור לגוגל" defaultValue={p?.seoDescription} maxLength={300} />
            </div>
            <Check name="isPublished" label="מפורסם באתר" defaultChecked={p?.isPublished ?? true} />
          </ActionForm>
        </div>
        {p && !CORE.includes(p.slug) && (
          <div className="card">
            <ConfirmButton action={deletePage} hidden={{ id: p.id }} label="מחיקת העמוד" confirmText="למחוק את העמוד?" />
          </div>
        )}
      </main>
    </>
  );
}
