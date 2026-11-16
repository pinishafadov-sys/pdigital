import Link from "next/link";
import { requireAdmin } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { AdminTop } from "../../AdminTop";
import { ImportForm } from "./ImportForm";

export const metadata = { title: "ייבוא מוצרים מאקסל" };

export default async function ImportPage() {
  await requireAdmin("MANAGER");
  const cats = await db.category.findMany({ where: { parentId: null }, orderBy: { sortOrder: "asc" }, include: { children: { orderBy: { sortOrder: "asc" } } } });
  return (
    <>
      <AdminTop title="ייבוא מוצרים מאקסל" actions={<Link href="/admin/products" className="btn btn-ghost" style={{ minHeight: 40 }}>חזרה למוצרים</Link>} />
      <main className="admin-content">
        <div className="help">
          <b>איך זה עובד:</b> מורידים את קובץ הדוגמה, ממלאים בו את המוצרים באקסל (שורה לכל מוצר), שומרים ומעלים.
          המערכת קודם <b>בודקת</b> את הקובץ ומראה מה יקרה בכל שורה, ורק אחרי אישור שלך שומרת.
          <ul style={{ margin: "8px 0 0", paddingInlineStart: 18 }}>
            <li>מק&quot;ט שכבר קיים באתר = <b>עדכון</b> (רק העמודות שמילאת). מק&quot;ט חדש = <b>מוצר חדש</b>.</li>
            <li>כמה שורות עם אותו שם מוצר ועמודת &quot;וריאנט&quot; (למשל צבעים) = מוצר אחד עם כמה אפשרויות.</li>
            <li>חובה במוצר חדש: מק&quot;ט, שם מוצר, קטגוריה ומחיר. מחיר = כולל מע&quot;מ (או עמודת &quot;מחיר לפני מע&quot;מ&quot;). מחיר עלות = לפני מע&quot;מ.</li>
            <li>מוצרים חדשים נשמרים כ&quot;טיוטה&quot; (לא מוצגים באתר) כדי שתבדוק אותם, אלא אם בעמודת סטטוס כתוב &quot;פעיל&quot;.</li>
          </ul>
        </div>
        <ImportForm />
        <section className="card">
          <h2>שמות הקטגוריות לשימוש בקובץ</h2>
          <ul style={{ margin: 0, paddingInlineStart: 18, columns: 2 }}>
            {cats.map((c) => (
              <li key={c.id}>
                <b>{c.name}</b>
                {c.children.length > 0 && <span className="muted"> (תת-קטגוריה: {c.children.map((x) => x.name).join(", ")})</span>}
              </li>
            ))}
          </ul>
        </section>
      </main>
    </>
  );
}
