import Link from "next/link";
import { requireAdmin } from "@/lib/auth/session";
import { formatPrice } from "@/lib/format";
import { defaultReportDate, endOfDayIsrael, inventoryAt } from "@/lib/inventory-report";
import { AdminTop } from "../../AdminTop";

export const metadata = { title: "דוח מלאי" };

const todayYmd = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jerusalem" }).format(new Date());

export default async function StockReportPage({ searchParams }: { searchParams: Promise<{ date?: string }> }) {
  await requireAdmin("MANAGER");
  const sp = await searchParams;
  const date = sp.date && endOfDayIsrael(sp.date) ? sp.date : todayYmd();
  const at = endOfDayIsrael(date)!;
  const { rows, totalQty, totalValue, missingCost } = await inventoryAt(at);
  const [y, m, d] = date.split("-");

  return (
    <>
      <AdminTop
        title="דוח מלאי"
        actions={
          <a href={`/admin/reports/stock/export?date=${date}`} className="btn btn-primary" style={{ minHeight: 40 }} download>
            הורדה לאקסל
          </a>
        }
      />
      <main className="admin-content">
        <p className="help">
          הדוח מראה כמה יחידות היו מכל מוצר <b>בסוף היום שבחרת</b>, ואת שווי המלאי לפי <b>מחיר העלות</b>. לדיווח השנתי בוחרים 31.12. הכמויות מחושבות
          לפי היסטוריית המלאי, ולכן נכונות גם אם מפיקים את הדוח מאוחר יותר.
        </p>

        <form method="get" className="toolbar-row">
          <label className="field" style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
            <span>מלאי נכון לסוף יום:</span>
            <input type="date" name="date" defaultValue={date} max={todayYmd()} style={{ width: "auto" }} />
          </label>
          <button className="btn btn-ghost" type="submit">הצגה</button>
          <Link href={`/admin/reports/stock?date=${defaultReportDate()}`} className="btn btn-ghost">31.12 האחרון</Link>
        </form>

        <section className="kpis" aria-label="סיכום">
          <div className="card kpi"><span className="label">תאריך</span><span className="value" style={{ fontSize: 22 }}>{`${d}.${m}.${y}`}</span></div>
          <div className="card kpi"><span className="label">פריטים שונים</span><span className="value">{rows.length}</span></div>
          <div className="card kpi"><span className="label">סך יחידות</span><span className="value">{totalQty}</span></div>
          <div className="card kpi"><span className="label">שווי מלאי (עלות, לפני מע&quot;מ)</span><span className="value">₪{formatPrice(totalValue)}</span></div>
        </section>

        {missingCost > 0 && (
          <p className="warn">
            ל-{missingCost} פריטים בדוח חסר <b>מחיר עלות</b>, ולכן הם לא נכללים בשווי המלאי. כדאי להשלים אותו בעריכת המוצר (שדה &quot;מחיר עלות&quot;).
          </p>
        )}
        {rows.some((r) => r.qty < 0) && (
          <p className="form-error">יש פריטים עם כמות שלילית לתאריך הזה. כנראה שהמלאי לא עודכן נכון באותה תקופה. כדאי לבדוק את היסטוריית המלאי שלהם.</p>
        )}

        <section className="card table-wrap" aria-label="פירוט המלאי">
          {rows.length ? (
            <table className="table">
              <thead>
                <tr><th>מק&quot;ט</th><th>מוצר</th><th>קטגוריה</th><th>כמות</th><th>עלות ליחידה (לפני מע&quot;מ)</th><th>שווי</th></tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.variantId}>
                    <td dir="ltr">{r.sku}</td>
                    <td>{r.product}{r.variant ? ` - ${r.variant}` : ""}</td>
                    <td className="muted">{r.category}</td>
                    <td style={{ fontWeight: 600, color: r.qty < 0 ? "var(--text-danger)" : undefined }}>{r.qty}</td>
                    <td>{r.cost != null ? `₪${formatPrice(r.cost)}` : <span className="pill orange">חסר</span>}</td>
                    <td>{r.value != null ? `₪${formatPrice(r.value)}` : "-"}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan={3}><b>סה&quot;כ</b></td>
                  <td><b>{totalQty}</b></td>
                  <td></td>
                  <td><b>₪{formatPrice(totalValue)}</b></td>
                </tr>
              </tfoot>
            </table>
          ) : (
            <p className="muted">לא היה מלאי בתאריך הזה, או שעדיין לא הוזנו מוצרים.</p>
          )}
        </section>
      </main>
    </>
  );
}
