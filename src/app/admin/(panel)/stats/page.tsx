import Link from "next/link";
import { requireAdmin } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { formatDateTime, formatPrice, isPlaceholder } from "@/lib/format";
import { getSettings, getVatRate } from "@/lib/settings";
import { currentStarts, PERIODS, statsSeries, statsSince, trafficDetails, type Period, type StatRow } from "@/lib/stats";
import { AdminTop } from "../AdminTop";
import { PrintButtons } from "../PrintButtons";
import { BarChart } from "./BarChart";

export const metadata = { title: "סטטיסטיקות" };

const ils = (agorot: number) => `₪${formatPrice(agorot)}`;
const int = (v: number) => v.toLocaleString("he-IL");
const pct = (v: number | null) => (v == null ? "-" : `${v.toFixed(1)}%`);

function SummaryCard({ title, r }: { title: string; r: StatRow }) {
  return (
    <div className="card kpi stat-card">
      <span className="label">{title}</span>
      <dl>
        <dt>כניסות</dt><dd>{int(r.visitors)}</dd>
        <dt>הכנסות</dt><dd>{ils(r.revenue)}</dd>
        <dt>רווח נקי</dt><dd className={r.profit < 0 ? "neg" : undefined}>{ils(r.profit)}</dd>
      </dl>
    </div>
  );
}

export default async function StatsPage({ searchParams }: { searchParams: Promise<{ p?: string }> }) {
  await requireAdmin("MANAGER");
  const sp = await searchParams;
  const period: Period = sp.p && sp.p in PERIODS ? (sp.p as Period) : "day";
  const vat = await getVatRate();
  const starts = currentStarts();

  const [series, today, week, month, year, s, noCost] = await Promise.all([
    statsSeries(period, vat),
    statsSince(starts.day, vat),
    statsSince(starts.week, vat),
    statsSince(starts.month, vat),
    statsSince(starts.year, vat),
    getSettings(),
    db.productVariant.count({ where: { isActive: true, costPrice: null, product: { status: { not: "ARCHIVED" } } } }),
  ]);
  const traffic = await trafficDetails(series.from);
  const { rows, total } = series;
  const labels = rows.map((r) => r.label);
  const margin = total.net ? (total.profit / total.net) * 100 : null;
  const deviceTotal = traffic.devices.reduce((a, d) => a + d.visitors, 0);
  const rangeName = { day: "30 הימים האחרונים", week: "12 השבועות האחרונים", month: "12 החודשים האחרונים", year: "5 השנים האחרונות" }[period];

  return (
    <>
      <AdminTop title="סטטיסטיקות" actions={<PrintButtons fileTitle={`סטטיסטיקות ${PERIODS[period].label}`} />} />
      <main className="admin-content report">
        <header className="print-only print-head">
          <div><b>{isPlaceholder(s.business.legalName) ? s.business.name : s.business.legalName}</b></div>
          <h1>סטטיסטיקות - {rangeName}</h1>
          <span>הופק בתאריך {formatDateTime(new Date())}</span>
        </header>

        <section className="kpis stat-cards" aria-label="סיכום תקופות">
          <SummaryCard title="היום" r={today} />
          <SummaryCard title="השבוע" r={week} />
          <SummaryCard title="החודש" r={month} />
          <SummaryCard title="השנה" r={year} />
        </section>

        <nav className="tabs no-print" aria-label="בחירת תקופה">
          {(Object.keys(PERIODS) as Period[]).map((p) => (
            <Link key={p} href={`/admin/stats?p=${p}`} aria-current={p === period ? "page" : undefined}>
              {PERIODS[p].label}
            </Link>
          ))}
        </nav>

        <section className="kpis" aria-label={`סיכום ${rangeName}`}>
          <div className="card kpi"><span className="label">כניסות</span><span className="value">{int(total.visitors)}</span><span className="note">{int(total.views)} צפיות בעמודים · {rangeName}</span></div>
          <div className="card kpi"><span className="label">הכנסות (כולל מע&quot;מ)</span><span className="value">{ils(total.revenue)}</span><span className="note">אתר {ils(total.onlineRevenue)} · חנות {ils(total.storeRevenue)}</span></div>
          <div className="card kpi"><span className="label">רווח נקי אחרי קנייה</span><span className="value" style={{ color: total.profit < 0 ? "var(--text-danger)" : "var(--text-success)" }}>{ils(total.profit)}</span><span className="note">{pct(margin)} מההכנסות לפני מע&quot;מ</span></div>
          <div className="card kpi"><span className="label">הזמנות באתר</span><span className="value">{int(total.orders)}</span><span className="note">המרה: {pct(total.conversion)} מהכניסות</span></div>
        </section>

        <section className="card" aria-labelledby="visits-chart">
          <h2 id="visits-chart">כניסות לאתר</h2>
          <BarChart
            title={`כניסות לאתר, ${rangeName}`}
            labels={labels}
            series={[{ name: "כניסות", color: "var(--brand-blue)", values: rows.map((r) => r.visitors) }]}
            format={int}
          />
        </section>

        <section className="card" aria-labelledby="money-chart">
          <h2 id="money-chart">כסף: הכנסות ורווח נקי</h2>
          <BarChart
            title={`הכנסות ורווח נקי, ${rangeName}`}
            labels={labels}
            series={[
              { name: "הכנסות (כולל מע\"מ)", color: "var(--brand-orange)", values: rows.map((r) => r.revenue) },
              { name: "רווח נקי", color: "var(--brand-purple)", values: rows.map((r) => r.profit) },
            ]}
            format={ils}
          />
        </section>

        <section className="card table-wrap" aria-labelledby="stats-table">
          <h2 id="stats-table">פירוט {PERIODS[period].label}</h2>
          <table className="table">
            <thead>
              <tr>
                <th>תקופה</th><th>כניסות</th><th>הזמנות</th><th>הכנסות אתר</th><th>הכנסות חנות</th>
                <th>סה&quot;כ הכנסות</th><th>לפני מע&quot;מ</th><th>עלות הסחורה</th><th>רווח נקי</th>
              </tr>
            </thead>
            <tbody>
              {[...rows].reverse().map((r) => (
                <tr key={r.key}>
                  <td>{r.label}</td>
                  <td>{int(r.visitors)}</td>
                  <td>{int(r.orders)}</td>
                  <td>{ils(r.onlineRevenue)}</td>
                  <td>{ils(r.storeRevenue)}</td>
                  <td><b>{ils(r.revenue)}</b></td>
                  <td>{ils(r.net)}</td>
                  <td>{ils(r.cost)}</td>
                  <td className={r.profit < 0 ? "neg" : undefined}><b>{ils(r.profit)}</b>{r.missingCost > 0 && <span title="יש מוצרים בלי מחיר עלות"> *</span>}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <th>סה&quot;כ</th><th>{int(total.visitors)}</th><th>{int(total.orders)}</th><th>{ils(total.onlineRevenue)}</th><th>{ils(total.storeRevenue)}</th>
                <th>{ils(total.revenue)}</th><th>{ils(total.net)}</th><th>{ils(total.cost)}</th><th>{ils(total.profit)}</th>
              </tr>
            </tfoot>
          </table>
        </section>

        <div className="two-col">
          <section className="card table-wrap" aria-labelledby="sources">
            <h2 id="sources">מאיפה הגיעו ({rangeName})</h2>
            {traffic.sources.length ? (
              <table className="table">
                <thead><tr><th>מקור</th><th>כניסות</th><th>אחוז</th></tr></thead>
                <tbody>
                  {traffic.sources.map((x) => (
                    <tr key={x.name}><td>{x.name}</td><td>{int(x.visits)}</td><td>{pct(total.visitors ? (x.visits / total.visitors) * 100 : null)}</td></tr>
                  ))}
                </tbody>
              </table>
            ) : <p className="muted">עדיין אין כניסות בתקופה הזו.</p>}
            {deviceTotal > 0 && (
              <p style={{ marginBottom: 0 }}>
                <b>מכשירים:</b>{" "}
                {traffic.devices.map((d) => `${d.device === "mobile" ? "טלפון" : "מחשב"} ${pct((d.visitors / deviceTotal) * 100)}`).join(" · ")}
              </p>
            )}
          </section>
          <section className="card table-wrap" aria-labelledby="pages">
            <h2 id="pages">העמודים הנצפים ביותר</h2>
            {traffic.pages.length ? (
              <table className="table">
                <thead><tr><th>עמוד</th><th>צפיות</th><th>מבקרים</th></tr></thead>
                <tbody>
                  {traffic.pages.map((p) => (
                    <tr key={p.path}><td dir="ltr" style={{ textAlign: "right" }}><a href={p.path} target="_blank" rel="noopener noreferrer">{decodeURIComponent(p.path)}</a></td><td>{int(p.views)}</td><td>{int(p.visitors)}</td></tr>
                  ))}
                </tbody>
              </table>
            ) : <p className="muted">עדיין אין צפיות בתקופה הזו.</p>}
          </section>
        </div>

        {(noCost > 0 || total.missingCost > 0) && (
          <p className="warn">
            {total.missingCost > 0 && <>ב-{int(total.missingCost)} יחידות שנמכרו בתקופה לא היה מחיר עלות, ולכן הרווח הנקי שלהן מחושב כאילו העלות 0 (מסומן ב-*). </>}
            {noCost > 0 && <>ל-{int(noCost)} מוצרים באתר אין עדיין מחיר עלות. </>}
            <Link href="/admin/products">הוספת מחיר עלות בעריכת מוצר ←</Link>
          </p>
        )}

        <section className="help">
          <b>איך מחושב:</b>
          <ul style={{ margin: "6px 0 0", paddingInlineStart: 20 }}>
            <li><b>כניסות:</b> כל מבקר נספר פעם אחת ביום, גם אם ראה כמה עמודים. כניסות שלך (כשאתה מחובר למערכת הניהול) ושל רובוטים לא נספרות. בלי עוגיות ובלי שמירת כתובת IP.</li>
            <li><b>הכנסות:</b> הזמנות באתר ששולמו (כולל משלוח, בלי הזמנות שבוטלו או הוחזרו), ומכירות בחנות שנרשמו בכפתור &quot;נמכר בחנות&quot; במסך המלאי, לפי המחיר באתר בזמן המכירה.</li>
            <li><b>רווח נקי אחרי קנייה:</b> ההכנסות בלי מע&quot;מ ({vat}%), פחות מחיר העלות של הסחורה שנמכרה. לא כולל הוצאות אחרות כמו שכירות, משלוחים או עמלות סליקה.</li>
          </ul>
        </section>
      </main>
    </>
  );
}
