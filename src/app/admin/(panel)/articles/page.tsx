import Link from "next/link";
import { requireAdmin } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { formatDate } from "@/lib/format";
import { AdminTop } from "../AdminTop";

export const metadata = { title: "מאמרים" };

export default async function ArticlesAdmin() {
  await requireAdmin();
  const articles = await db.article.findMany({ orderBy: { updatedAt: "desc" } });
  return (
    <>
      <AdminTop title="מאמרים" actions={<Link href="/admin/articles/new" className="btn btn-primary" style={{ minHeight: 40 }}>+ מאמר חדש</Link>} />
      <main className="admin-content">
        <p className="help">מאמרים עוזרים להופיע בגוגל. רעיונות: &quot;איך לבחור מטען מהיר&quot;, &quot;5 אביזרי גיימינג שכדאי להכיר&quot;. כל מאמר מקבל דף משלו, ונכנס אוטומטית למפת האתר.</p>
        <div className="card table-wrap">
          {articles.length ? (
            <table className="table">
              <thead><tr><th>כותרת</th><th>מצב</th><th>תאריך פרסום</th><th></th></tr></thead>
              <tbody>
                {articles.map((a) => (
                  <tr key={a.id}>
                    <td><Link href={`/admin/articles/${a.id}`} style={{ fontWeight: 600 }}>{a.title}</Link></td>
                    <td>{a.isPublished ? <span className="pill green">פורסם</span> : <span className="pill">טיוטה</span>}</td>
                    <td className="muted">{a.publishedAt ? formatDate(a.publishedAt) : "-"}</td>
                    <td>{a.isPublished && <Link href={`/articles/${a.slug}`} target="_blank">צפייה</Link>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : <p className="muted">אין מאמרים עדיין. <Link href="/admin/articles/new">כתיבת המאמר הראשון ←</Link></p>}
        </div>
      </main>
    </>
  );
}
