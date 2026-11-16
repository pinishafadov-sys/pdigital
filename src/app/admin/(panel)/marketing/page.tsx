import Link from "next/link";
import { requireAdmin } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { formatDateTime } from "@/lib/format";
import { DEFAULT_MESSAGE, marketingList, waNumber } from "@/lib/marketing";
import { AdminTop } from "../AdminTop";
import { ConfirmButton } from "../ui";
import { unsubscribeAction } from "./actions";
import { CampaignForm } from "./CampaignForm";
import { WaSequence } from "./WaSequence";

export const metadata = { title: "רשימת דיוור ומבצעים" };

type SP = { q?: string; cat?: string; days?: string; msg?: string };

export default async function MarketingPage({ searchParams }: { searchParams: Promise<SP> }) {
  await requireAdmin("MANAGER");
  const sp = await searchParams;
  const msg = (sp.msg ?? DEFAULT_MESSAGE).slice(0, 1000);
  const [{ customers, total, unsubscribed }, cats, campaigns] = await Promise.all([
    marketingList(sp),
    db.category.findMany({ where: { parentId: null }, orderBy: { sortOrder: "asc" } }),
    db.campaign.findMany({ orderBy: { createdAt: "desc" }, take: 10 }),
  ]);
  const exportQs = new URLSearchParams(Object.entries({ q: sp.q ?? "", cat: sp.cat ?? "", days: sp.days ?? "" }).filter(([, v]) => v)).toString();

  return (
    <>
      <AdminTop
        title="רשימת דיוור ומבצעים"
        actions={<a href={`/admin/marketing/export${exportQs ? `?${exportQs}` : ""}`} className="btn btn-primary" style={{ minHeight: 40 }} download>הורדה לאקסל</a>}
      />
      <main className="admin-content">
        <p className="warn">
          <b>חוק הספאם:</b> כאן מופיעים <b>רק</b> לקוחות שאישרו לקבל מבצעים (בקופה או בטופס צור קשר). מותר לשלוח הודעות פרסום רק אליהם.
          בכל הודעה צריכה להיות אפשרות הסרה, ומי שמבקש להסיר - לוחצים &quot;הסרה&quot; ליד השם, והוא לא יופיע כאן יותר.
        </p>

        <form method="get" className="card form-section">
          <div className="form-grid cols-3">
            <label className="field">
              <span>חיפוש</span>
              <input type="search" name="q" defaultValue={sp.q ?? ""} placeholder="שם, טלפון או מייל" />
            </label>
            <label className="field">
              <span>קנו במחלקה</span>
              <select name="cat" defaultValue={sp.cat ?? ""}>
                <option value="">כל הלקוחות</option>
                {cats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </label>
            <label className="field">
              <span>הצטרפו ב-</span>
              <select name="days" defaultValue={sp.days ?? ""}>
                <option value="">כל הזמנים</option>
                <option value="7">7 ימים אחרונים</option>
                <option value="30">30 ימים אחרונים</option>
                <option value="90">3 חודשים אחרונים</option>
              </select>
            </label>
            <label className="field span-all">
              <span>נוסח ההודעה בוואטסאפ ({"{שם}"} יוחלף בשם הלקוח)</span>
              <textarea name="msg" defaultValue={msg} rows={3} maxLength={1000} />
            </label>
          </div>
          <div className="toolbar-row">
            <button className="btn btn-primary" type="submit">עדכון הרשימה וההודעה</button>
            <Link href="/admin/marketing" className="btn btn-ghost">איפוס</Link>
            <span className="muted">
              {total} לקוחות ברשימה · {unsubscribed} הוסרו בסך הכל
            </span>
          </div>
        </form>

        <section className="card form-section" aria-labelledby="bulk-title">
          <h2 id="bulk-title" style={{ margin: 0 }}>שליחה לכולם בבת אחת ({total} לקוחות לפי הסינון)</h2>
          <div className="bulk-grid">
            <div className="bulk-box">
              <h3>📧 מייל לכולם</h3>
              <p className="muted">לחיצה אחת שולחת מייל אישי לכל הרשימה, עם קישור הסרה אוטומטי. כדאי לשלוח קודם בדיקה אליך.</p>
              <CampaignForm count={total} filters={{ q: sp.q ?? "", cat: sp.cat ?? "", days: sp.days ?? "" }} />
            </div>
            <div className="bulk-box">
              <h3>📱 רשימת תפוצה בוואטסאפ</h3>
              <ol className="bulk-steps">
                <li>
                  <a href={`/admin/marketing/contacts${exportQs ? `?${exportQs}` : ""}`} download className="btn btn-primary" style={{ minHeight: 38 }}>
                    הורדת אנשי קשר לטלפון
                  </a>
                </li>
                <li>פותחים את הקובץ בטלפון ← &quot;ייבוא&quot;: כל הלקוחות נכנסים לאנשי הקשר.</li>
                <li>ב-WhatsApp Business: ⋮ ← &quot;רשימת תפוצה חדשה&quot; ← בוחרים את כולם.</li>
                <li>כותבים את ההודעה פעם אחת ושולחים. כל לקוח מקבל אותה בנפרד.</li>
              </ol>
              <p className="muted" style={{ margin: 0 }}>ההודעה מגיעה רק למי ששמר את מספר החנות אצלו.</p>
            </div>
            <div className="bulk-box">
              <h3>⚡ וואטסאפ ברצף</h3>
              <p className="muted">פותח את וואטסאפ ללקוח אחרי לקוח, עם ההודעה שכתבת למעלה כבר מוכנה. רק לוחצים &quot;שלח&quot;.</p>
              <WaSequence
                people={customers.flatMap((c) => {
                  const wa = waNumber(c.phone);
                  const name = c.firstName === "-" ? c.email : c.firstName;
                  return wa ? [{ id: c.id, name, href: `https://wa.me/${wa}?text=${encodeURIComponent(msg.replaceAll("{שם}", c.firstName === "-" ? "" : c.firstName))}` }] : [];
                })}
              />
            </div>
          </div>
        </section>

        {campaigns.length > 0 && (
          <section className="card table-wrap" aria-labelledby="hist-title">
            <h2 id="hist-title">מיילים שנשלחו</h2>
            <table className="table">
              <thead><tr><th>מתי</th><th>כותרת</th><th>למי</th><th>נשלחו</th><th>נכשלו</th></tr></thead>
              <tbody>
                {campaigns.map((c) => (
                  <tr key={c.id}>
                    <td className="muted">{formatDateTime(c.createdAt)}</td>
                    <td>{c.subject}</td>
                    <td>{c.audience}</td>
                    <td>{c.sent} / {c.recipients}</td>
                    <td>{c.failed}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        )}

        <section className="card table-wrap" aria-label="לקוחות">
          {customers.length ? (
            <table className="table">
              <thead><tr><th>שם</th><th>טלפון</th><th>מייל</th><th>אישר מתי / איפה</th><th>שליחה</th><th></th></tr></thead>
              <tbody>
                {customers.map((c) => {
                  const wa = waNumber(c.phone);
                  const text = msg.replaceAll("{שם}", c.firstName === "-" ? "" : c.firstName);
                  return (
                    <tr key={c.id}>
                      <td>{c.firstName} {c.lastName !== "-" ? c.lastName : ""}</td>
                      <td dir="ltr">{c.phone ?? "-"}</td>
                      <td dir="ltr">{c.email}</td>
                      <td className="muted">{c.consentAt ? formatDateTime(c.consentAt) : "-"} · {c.consentSource ?? "-"}</td>
                      <td>
                        {wa ? (
                          <a href={`https://wa.me/${wa}?text=${encodeURIComponent(text)}`} target="_blank" rel="noopener noreferrer" className="btn btn-ghost" style={{ minHeight: 34, padding: "0 12px" }}>
                            וואטסאפ
                          </a>
                        ) : (
                          <span className="muted">אין טלפון</span>
                        )}
                      </td>
                      <td>
                        <ConfirmButton action={unsubscribeAction} hidden={{ id: c.id }} label="הסרה" confirmText={`להסיר את ${c.firstName} מרשימת הדיוור?`} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : (
            <p className="muted">
              {sp.q || sp.cat || sp.days ? "אין לקוחות שמתאימים לסינון." : "עדיין אין לקוחות שאישרו לקבל מבצעים. הם יצטרפו לכאן מהקופה ומטופס צור קשר."}
            </p>
          )}
        </section>

      </main>
    </>
  );
}
