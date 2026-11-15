import Link from "next/link";
import { requireAdmin } from "@/lib/auth/session";
import { formatDateTime, isPlaceholder } from "@/lib/format";
import { fmtDays, reorderReport } from "@/lib/reorder";
import { getSettings } from "@/lib/settings";
import { AdminTop } from "../AdminTop";
import { PrintButtons } from "../PrintButtons";

export const metadata = { title: "המלצות להזמנה" };

const STATUS = {
  urgent: { label: "להזמין עכשיו", cls: "pink" },
  soon: { label: "בקרוב", cls: "orange" },
  ok: { label: "תקין", cls: "green" },
  "no-sales": { label: "אין מכירות", cls: "" },
} as const;

export default async function ReorderPage() {
  await requireAdmin("MANAGER");
  const [{ toOrder, bestSellers, settings }, s] = await Promise.all([reorderReport(), getSettings()]);
  const today = new Intl.DateTimeFormat("he-IL", { timeZone: "Asia/Jerusalem", dateStyle: "short" }).format(new Date());

  return (
    <>
      <AdminTop title="המלצות להזמנה" actions={<PrintButtons fileTitle={`רשימת הזמנה מספק ${today.replaceAll("/", ".")}`} />} />
      <main className="admin-content report">
        <header className="print-only print-head">
          <div>
            <b>{isPlaceholder(s.business.legalName) ? s.business.name : s.business.legalName}</b>
          </div>
          <h1>רשימת מוצרים להזמנה</h1>
          <span>הופק בתאריך {formatDateTime(new Date())}</span>
        </header>

        <p className="help no-print">
          המערכת בודקת כמה נמכר מכל מוצר ב-{settings.window} הימים האחרונים (באתר ובחנות), ומחשבת לכמה ימים המלאי יספיק. אם הוא ייגמר לפני
          שהזמנה חדשה תגיע (זמן אספקה: {settings.defaultLead} ימים), המוצר מסומן &quot;להזמין עכשיו&quot;. הכמות המומלצת מספיקה לזמן האספקה ועוד{" "}
          {settings.cover} ימים. <Link href="/admin/settings#inventory">שינוי ההגדרות ←</Link>
        </p>

        <section className="card table-wrap" aria-labelledby="to-order">
          <h2 id="to-order">כדאי להזמין ({toOrder.length})</h2>
          {toOrder.length ? (
            <table className="table">
              <thead>
                <tr><th>מוצר</th><th>מק&quot;ט</th><th>מותג</th><th>במלאי</th><th>נמכר ב-{settings.window} יום</th><th>יספיק ל-</th><th>כמות מומלצת</th><th>מצב</th></tr>
              </thead>
              <tbody>
                {toOrder.map((r) => (
                  <tr key={r.variantId}>
                    <td><Link href={`/admin/stock?v=${r.variantId}#history`}>{r.title}</Link></td>
                    <td dir="ltr">{r.sku}</td>
                    <td>{r.brand ?? "-"}</td>
                    <td>{r.stock}</td>
                    <td>{r.sold}</td>
                    <td>{fmtDays(r.daysLeft)}</td>
                    <td><b>{r.suggestQty}</b></td>
                    <td><span className={`pill ${STATUS[r.status].cls}`}>{STATUS[r.status].label}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="muted">
              אין כרגע מוצרים שצריך להזמין. ההמלצות מתבססות על מכירות שנרשמו (באתר, וב&quot;נמכר בחנות&quot; במסך המלאי), ומשתפרות ככל שמצטברים נתונים.
            </p>
          )}
        </section>

        <section className="card table-wrap" aria-labelledby="best">
          <h2 id="best">הנמכרים ביותר ב-{settings.window} הימים האחרונים</h2>
          {bestSellers.length ? (
            <table className="table">
              <thead><tr><th>#</th><th>מוצר</th><th>נמכרו</th><th>בממוצע ליום</th><th>במלאי</th><th>יספיק ל-</th></tr></thead>
              <tbody>
                {bestSellers.map((r, i) => (
                  <tr key={r.variantId}>
                    <td>{i + 1}</td>
                    <td>{r.title}</td>
                    <td><b>{r.sold}</b></td>
                    <td>{r.perDay.toFixed(1)}</td>
                    <td>{r.stock}</td>
                    <td>{fmtDays(r.daysLeft)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="muted">עדיין לא נרשמו מכירות בתקופה הזו.</p>
          )}
        </section>
      </main>
    </>
  );
}
