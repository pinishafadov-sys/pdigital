import Link from "next/link";
import { requireAdmin } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { formatDate } from "@/lib/format";
import { AdminTop } from "../AdminTop";

export const metadata = { title: "עמודי תוכן" };

export default async function PagesAdmin() {
  await requireAdmin();
  const pages = await db.page.findMany({ orderBy: { title: "asc" } });
  return (
    <>
      <AdminTop title="עמודי תוכן" actions={<Link href="/admin/pages/new" className="btn btn-primary" style={{ minHeight: 40 }}>+ עמוד חדש</Link>} />
      <main className="admin-content">
        <p className="warn">התקנון, מדיניות הפרטיות והצהרת הנגישות הם מסמכים משפטיים. הנוסח כאן הוא תבנית עם [סוגריים] למילוי, ומומלץ שעורך דין יעבור עליהם לפני ההשקה.</p>
        <div className="card table-wrap">
          <table className="table">
            <thead><tr><th>עמוד</th><th>כתובת</th><th>מצב</th><th>עודכן</th></tr></thead>
            <tbody>
              {pages.map((p) => (
                <tr key={p.id}>
                  <td><Link href={`/admin/pages/${p.id}`} style={{ fontWeight: 600 }}>{p.title}</Link></td>
                  <td dir="ltr" className="muted">/pages/{p.slug}</td>
                  <td>{p.isPublished ? <span className="pill green">מפורסם</span> : <span className="pill">טיוטה</span>}</td>
                  <td className="muted">{formatDate(p.updatedAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>
    </>
  );
}
