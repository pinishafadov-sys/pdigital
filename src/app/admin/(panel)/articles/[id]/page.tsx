import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { AdminTop } from "../../AdminTop";
import { deleteArticle, saveArticle } from "../../content-actions";
import { Area, Check, ImageInput, RICH_HINT, Text } from "../../fields";
import { ActionForm, ConfirmButton } from "../../ui";

export const metadata = { title: "עריכת מאמר" };
const dt = (d: Date | null) => (d ? new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16) : "");

export default async function EditArticle({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;
  const a = id === "new" ? null : await db.article.findUnique({ where: { id } });
  if (id !== "new" && !a) notFound();

  return (
    <>
      <AdminTop title={a ? a.title : "מאמר חדש"} actions={<Link href="/admin/articles" className="btn btn-ghost" style={{ minHeight: 40 }}>חזרה</Link>} />
      <main className="admin-content">
        <div className="card">
          <ActionForm action={saveArticle}>
            <input type="hidden" name="id" value={a?.id ?? ""} />
            <Text name="title" label="כותרת המאמר" defaultValue={a?.title} required maxLength={160} />
            <Text name="excerpt" label="תקציר קצר (מופיע ברשימת המאמרים)" defaultValue={a?.excerpt} maxLength={400} />
            <Area name="body" label="תוכן המאמר" defaultValue={a?.body} rows={18} hint={RICH_HINT} maxLength={100000} />
            <div className="form-grid cols-2">
              <ImageInput name="cover" label="תמונה ראשית" current={a?.coverImageUrl} />
              <Text name="coverImageAlt" label="תיאור התמונה" defaultValue={a?.coverImageAlt} />
              <Text name="publishedAt" label="תאריך פרסום" type="datetime-local" defaultValue={dt(a?.publishedAt ?? null)} hint="ריק = עכשיו. תאריך עתידי = פרסום מתוזמן" />
              <Text name="slug" label="כתובת (slug)" defaultValue={a?.slug} hint="ריק = נוצר מהכותרת" />
              <Text name="seoTitle" label="כותרת לגוגל" defaultValue={a?.seoTitle} />
              <Text name="seoDescription" label="תיאור לגוגל (עד 160 תווים)" defaultValue={a?.seoDescription} maxLength={300} />
            </div>
            <Check name="isPublished" label="פרסום באתר" defaultChecked={a?.isPublished} />
          </ActionForm>
        </div>
        {a && (
          <div className="card">
            <ConfirmButton action={deleteArticle} hidden={{ id: a.id }} label="מחיקת המאמר" confirmText="למחוק את המאמר?" />
          </div>
        )}
      </main>
    </>
  );
}
