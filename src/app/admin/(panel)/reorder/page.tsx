import Link from "next/link";
import { requireAdmin } from "@/lib/auth/session";
import { formatDateTime, isPlaceholder } from "@/lib/format";
import { fmtDays, reorderReport } from "@/lib/reorder";
import { getSettings } from "@/lib/settings";
import { AdminTop } from "../AdminTop";
import { PrintButtons } from "../PrintButtons";
import { createFromReorder } from "../purchase-orders/actions";
import { SubmitButton } from "../ui";

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
  const groups = new Map<string, { id: string; name: string; count: number }>();
  for (const r of toOrder) {
    if (!r.supplierId) continue;
    const g = groups.get(r.supplierId) ?? { id: r.supplierId, name: r.supplier ?? "", count: 0 };
    g.count++;
    groups.set(r.supplierId, g);
  }
  const bySupplier = [...groups.values()];
  const noSupplier = toOrder.filter((r) => !r.supplierId).length;
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

        {toOrder.length > 0 && (
          <section className="card no-print" aria-labelledby="by-supplier">
            <h2 id="by-supplier">יצירת הזמנת רכש לפי ספק</h2>
            {bySupplier.length > 0 && (
              <div className="toolbar-row">
                {bySupplier.map((g) => (
                  <form key={g.id} action={createFromReorder}>
                    <input type="hidden" name="supplierId" value={g.id} />
                    <SubmitButton label={`הזמנת רכש: ${g.name} (${g.count} ${g.count === 1 ? "מוצר" : "מוצרים"})`} className="btn btn-primary" />
                  </form>
                ))}
              </div>
            )}
            <p className="help" style={{ marginBottom: 0 }}>
              {bySupplier.length > 0
                ? "לחיצה יוצרת טיוטת הזמנה עם המוצרים והכמויות המומלצות של אותו ספק. אפשר לשנות כמויות לפני השליחה. "
                : ""}
              {noSupplier > 0 && (
                <>
                  ל-{noSupplier} מוצרים ברשימה לא הוגדר ספק. בחרו ספק בעריכת המוצר כדי שייכנסו להזמנה אוטומטית.{" "}
                  <Link href="/admin/suppliers">ניהול ספקים ←</Link>
                </>
              )}
            </p>
          </section>
        )}

        <section className="card table-wrap" aria-labelledby="to-order">
          <h2 id="to-order">כדאי להזמין ({toOrder.length})</h2>
          {toOrder.length ? (
            <table className="table">
              <thead>
                <tr><th>מוצר</th><th>מק&quot;ט</th><th>ספק</th><th>במלאי</th><th>נמכר ב-{settings.window} יום</th><th>יספיק ל-</th><th>כמות מומלצת</th><th>מצב</th></tr>
              </thead>
              <tbody>
                {toOrder.map((r) => (
                  <tr key={r.variantId}>
                    <td><Link href={`/admin/stock?v=${r.variantId}#history`}>{r.title}</Link></td>
                    <td dir="ltr">{r.sku}</td>
                    <td>{r.supplier ?? <span className="muted">לא הוגדר</span>}</td>
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
