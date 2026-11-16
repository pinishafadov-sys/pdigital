import Link from "next/link";
import { requireAdmin } from "@/lib/auth/session";
import { buildFeed } from "@/lib/google-feed";
import { siteUrl } from "@/lib/settings";
import { AdminTop } from "../AdminTop";

export const metadata = { title: "גוגל שופינג" };

export default async function GoogleShoppingPage() {
  await requireAdmin("MANAGER");
  const { items, problems, productCount } = await buildFeed();
  const feedUrl = `${siteUrl()}/google-shopping.xml`;
  const isLocal = /localhost|127\.0\.0\.1/.test(feedUrl);
  const blocked = problems.filter((p) => p.reasons.some((r) => r.startsWith("חסרה תמונה") || r.startsWith("סומן")));
  const products = new Set(items.map((i) => i.groupId ?? i.id)).size;

  return (
    <>
      <AdminTop title="גוגל שופינג" actions={<a href="/google-shopping.xml" target="_blank" className="btn btn-ghost" style={{ minHeight: 40 }}>צפייה בפיד</a>} />
      <main className="admin-content">
        <section className="kpis" aria-label="סיכום">
          <div className="card kpi"><span className="label">מוצרים בפיד</span><span className="value">{products}</span><span className="note">{items.length} פריטים (כולל צבעים/דגמים)</span></div>
          <div className="card kpi"><span className="label">מוצרים באתר (במלאי)</span><span className="value">{productCount}</span><span className="note">מוצר שאזל לא נכנס לפיד</span></div>
          <div className="card kpi"><span className="label">לא נכנסים לגוגל</span><span className="value" style={{ color: blocked.length ? "var(--text-danger)" : undefined }}>{blocked.length}</span><span className="note">חסרה תמונה או כובה</span></div>
          <div className="card kpi"><span className="label">כדאי לשפר</span><span className="value">{problems.length - blocked.length}</span><span className="note">חסר מותג / ברקוד / תיאור</span></div>
        </section>

        <section className="card">
          <h2>כתובת הפיד</h2>
          <p style={{ margin: "0 0 8px" }} dir="ltr"><code>{feedUrl}</code></p>
          {isLocal ? (
            <p className="warn" style={{ margin: 0 }}>
              זו כתובת מקומית. גוגל יוכל לקרוא את הפיד רק אחרי שהאתר יעלה לאוויר עם דומיין, ואז הכתובת תתעדכן כאן לבד.
            </p>
          ) : (
            <p className="muted" style={{ margin: 0 }}>את הכתובת הזו מדביקים ב-Google Merchant Center. הפיד מתעדכן אוטומטית בכל שינוי באתר.</p>
          )}
        </section>

        <section className="card table-wrap" aria-labelledby="problems">
          <h2 id="problems">מוצרים שצריכים טיפול</h2>
          {problems.length ? (
            <table className="table">
              <thead><tr><th>מוצר</th><th>מה חסר</th><th></th></tr></thead>
              <tbody>
                {problems.map((p) => (
                  <tr key={p.productId}>
                    <td>{p.name}</td>
                    <td>
                      {p.reasons.map((r) => (
                        <span key={r} className={`pill ${r.startsWith("חסרה תמונה") || r.startsWith("סומן") ? "pink" : "orange"}`} style={{ marginInlineEnd: 6 }}>{r}</span>
                      ))}
                    </td>
                    <td><Link href={`/admin/products/${p.productId}`}>עריכה ←</Link></td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="muted">{productCount ? "כל המוצרים מוכנים לגוגל 🎉" : "עדיין אין מוצרים פעילים במלאי."}</p>
          )}
        </section>

        <section className="help">
          <b>איך מחברים (פעם אחת, אחרי שהאתר באוויר):</b>
          <ol style={{ margin: "8px 0 0", paddingInlineStart: 20 }}>
            <li>נכנסים ל-merchants.google.com עם חשבון הגוגל של העסק ופותחים חשבון (חינם). מדינה: ישראל, מטבע: ₪.</li>
            <li>מאמתים את האתר: מעתיקים את קוד האימות ל&quot;הגדרות ← קידום בגוגל ← קוד אימות Google Search Console&quot;.</li>
            <li>Products ← Add products ← &quot;Add products from a file&quot; ← מדביקים את כתובת הפיד שלמעלה, עדכון יומי.</li>
            <li>מגדירים משלוחים והחזרות בתוך Merchant Center (מחיר משלוח, זמן אספקה, מדיניות החזרה).</li>
            <li>מפעילים &quot;Free listings&quot; (הצגה בחינם). גוגל בודק את המוצרים, בדרך כלל תוך כמה ימים.</li>
          </ol>
        </section>
      </main>
    </>
  );
}
