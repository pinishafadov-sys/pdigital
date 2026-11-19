import Link from "next/link";
import { requireAdmin } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { formatDateTime, formatPrice } from "@/lib/format";
import { ORDER_STATUS } from "@/lib/order-status";
import { fmtDays, reorderReport } from "@/lib/reorder";
import { getSettings, getVatRate } from "@/lib/settings";
import { lastDaysStart, statsSince } from "@/lib/stats";
import { AdminTop } from "./AdminTop";
import { SmartSearch } from "./SmartSearch";

const STATUS = ORDER_STATUS;
const sevenDaysAgo = () => new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

const CMS = [
  { href: "/admin/banners", title: "באנרים בדף הבית", desc: "תמונות, כותרות וקישורים", color: "var(--brand-orange)" },
  { href: "/admin/settings#home", title: "טקסטים בדף הבית", desc: "מועדון לקוחות, טקסט תחתון", color: "var(--brand-blue)" },
  { href: "/admin/categories", title: "תפריט וקטגוריות", desc: "הוספה, שינוי שם וסדר", color: "var(--brand-pink)" },
  { href: "/admin/products", title: "מוצרים ומחירים", desc: "תמונות, מפרט, וריאנטים ומבצעים", color: "var(--brand-purple)" },
  { href: "/admin/pages", title: "עמודי תוכן", desc: "אודות, תקנון, משלוחים, נגישות", color: "var(--brand-blue)" },
  { href: "/admin/articles", title: "מאמרים", desc: "תוכן לקידום בגוגל", color: "var(--brand-pink)" },
  { href: "/admin/coupons", title: "מבצעים וקופונים", desc: "קודי הנחה ותאריכים", color: "var(--brand-orange)" },
  { href: "/admin/settings#shipping", title: "סרגל הודעות עליון", desc: "הפס הכתום בראש האתר", color: "var(--brand-pink)" },
  { href: "/admin/settings#business", title: "פרטי העסק", desc: "טלפון, כתובת, שעות ורשתות", color: "var(--brand-purple)" },
  { href: "/admin/settings#seo", title: "קידום בגוגל (SEO)", desc: "Search Console, Analytics, תיאורים", color: "var(--brand-blue)" },
];

export default async function Dashboard({ searchParams }: { searchParams: Promise<{ pw?: string; denied?: string }> }) {
  const me = await requireAdmin();
  const sp = await searchParams;
  const since = sevenDaysAgo();
  const paid = { in: ["PAID", "PROCESSING", "SHIPPED", "DELIVERED"] as ("PAID" | "PROCESSING" | "SHIPPED" | "DELIVERED")[] };

  const [revenue, orderCount, productCount, recent, lowStock, s, lastLogins, reorder] = await Promise.all([
    db.order.aggregate({ _sum: { total: true }, where: { createdAt: { gte: since }, status: paid } }),
    db.order.count({ where: { createdAt: { gte: since }, status: paid } }),
    db.product.count({ where: { status: "ACTIVE" } }),
    db.order.findMany({ orderBy: { createdAt: "desc" }, take: 6 }),
    db.productVariant.findMany({
      where: { isActive: true, product: { status: "ACTIVE" }, stock: { lte: db.productVariant.fields.lowStockThreshold } },
      include: { product: { select: { name: true, id: true } } },
      orderBy: { stock: "asc" },
      take: 6,
    }),
    getSettings(),
    db.auditLog.findMany({ where: { action: { in: ["login", "login_failed"] } }, orderBy: { createdAt: "desc" }, take: 5, include: { user: { select: { displayName: true } } } }),
    reorderReport(),
  ]);
  const urgent = reorder.toOrder.slice(0, 6);
  const week7 = await statsSince(lastDaysStart(7), await getVatRate());
  const analyticsOn = !!s.seo.gaId;

  return (
    <>
      <AdminTop
        title="לוח בקרה"
        actions={<Link href="/admin/products/new" className="btn btn-primary" style={{ minHeight: 40 }}>+ מוצר חדש</Link>}
      />
      <main className="admin-content">
        {sp.pw && <p className="form-ok">הסיסמה עודכנה בהצלחה.</p>}
        {sp.denied && <p className="form-error">אין לך הרשאה למסך הזה.</p>}
        <section aria-label="חיפוש במערכת" className="card" style={{ padding: 16 }}>
          <SmartSearch />
        </section>
        <p className="muted" style={{ margin: 0 }}>שלום {me.displayName}, הנה מה שקורה ב-7 הימים האחרונים.</p>

        <section className="kpis" aria-label="מדדים עיקריים">
          <div className="card kpi"><span className="label">הכנסות</span><span className="value">₪{formatPrice(revenue._sum.total ?? 0)}</span><span className="note">הזמנות ששולמו</span></div>
          <div className="card kpi"><span className="label">הזמנות</span><span className="value">{orderCount}</span><span className="note">7 ימים אחרונים</span></div>
          <div className="card kpi"><span className="label">מוצרים פעילים</span><span className="value">{productCount}</span><span className="note"><Link href="/admin/products">ניהול מוצרים ←</Link></span></div>
          <div className="card kpi">
            <span className="label">כניסות לאתר</span>
            <span className="value">{week7.visitors.toLocaleString("he-IL")}</span>
            <span className="note">
              המרה {week7.conversion == null ? "-" : `${week7.conversion.toFixed(1)}%`} · <Link href="/admin/stats">כל הסטטיסטיקות ←</Link>
              {analyticsOn && <> · <a href="https://analytics.google.com" target="_blank" rel="noopener noreferrer">Analytics</a></>}
            </span>
          </div>
        </section>

        <div className="two-col">
          <section className="card" aria-labelledby="recent-orders">
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <h2 id="recent-orders">הזמנות אחרונות</h2>
              <Link href="/admin/orders" style={{ color: "var(--brand-purple)" }}>כל ההזמנות ←</Link>
            </div>
            {recent.length ? (
              <div className="table-wrap">
                <table className="table">
                  <thead><tr><th>הזמנה</th><th>לקוח</th><th>סכום</th><th>סטטוס</th><th>תאריך</th></tr></thead>
                  <tbody>
                    {recent.map((o) => (
                      <tr key={o.id}>
                        <td><Link href={`/admin/orders/${o.id}`}>#{o.orderNumber}</Link></td>
                        <td>{o.firstName} {o.lastName}</td>
                        <td>₪{formatPrice(o.total)}</td>
                        <td><span className={`pill ${STATUS[o.status].cls}`}>{STATUS[o.status].label}</span></td>
                        <td className="muted">{formatDateTime(o.createdAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="muted">עדיין אין הזמנות. הן יופיעו כאן אחרי חיבור התשלום.</p>
            )}
          </section>

          <section className="card" aria-labelledby="low-stock">
            <h2 id="reorder-title">כדאי להזמין</h2>
            {urgent.length ? (
              <ul style={{ listStyle: "none", margin: "0 0 8px", padding: 0 }}>
                {urgent.map((r) => (
                  <li key={r.variantId} style={{ display: "flex", justifyContent: "space-between", gap: 8, padding: "8px 0", borderBottom: "1px solid var(--line-soft)" }}>
                    <span>{r.title}</span>
                    <span className={`pill ${r.status === "urgent" ? "pink" : "orange"}`}>
                      {r.daysLeft != null && r.daysLeft < 1 ? "אוזל היום" : `עוד ${fmtDays(r.daysLeft)}`} · להזמין {r.suggestQty}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="muted">אין כרגע מוצרים שצריך להזמין.</p>
            )}
            <Link href="/admin/reorder" style={{ color: "var(--brand-purple)" }}>כל ההמלצות להזמנה ←</Link>
            <hr style={{ border: 0, borderTop: "1px solid var(--line)", margin: "16px 0" }} />
            <h2 id="low-stock">מלאי נמוך</h2>
            {lowStock.length ? (
              <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
                {lowStock.map((v) => (
                  <li key={v.id} style={{ display: "flex", justifyContent: "space-between", gap: 8, padding: "8px 0", borderBottom: "1px solid var(--line-soft)" }}>
                    <Link href={`/admin/products/${v.product.id}`}>{v.product.name}{v.name ? ` (${v.name})` : ""}</Link>
                    <span className="pill pink">נשארו {v.stock}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="muted">אין מוצרים במלאי נמוך.</p>
            )}
            <Link href="/admin/stock" style={{ color: "var(--brand-purple)" }}>ניהול מלאי ←</Link>
            <h2 style={{ marginTop: 20 }}>כניסות אחרונות</h2>
            <ul style={{ listStyle: "none", margin: 0, padding: 0, fontSize: 14 }}>
              {lastLogins.map((l) => (
                <li key={l.id} style={{ padding: "4px 0" }}>
                  <span className={`pill ${l.action === "login" ? "green" : "pink"}`}>{l.action === "login" ? "הצליחה" : "נכשלה"}</span>{" "}
                  {l.user?.displayName ?? "?"} · <span className="muted">{formatDateTime(l.createdAt)} · {l.ip}</span>
                </li>
              ))}
            </ul>
          </section>
        </div>

        <section className="card" aria-labelledby="cms-title">
          <h2 id="cms-title" style={{ marginBottom: 2 }}>שליטה בתוכן האתר</h2>
          <p className="muted" style={{ marginTop: 0 }}>כל מה שמופיע באתר נערך מכאן, בלי לגעת בקוד</p>
          <div className="cms-grid">
            {CMS.map((c) => (
              <Link key={c.href} href={c.href} className="cms-tile" style={{ ["--tile" as string]: c.color }}>
                <b>{c.title}</b>
                <span>{c.desc}</span>
                <em>עריכה ←</em>
              </Link>
            ))}
          </div>
        </section>
      </main>
    </>
  );
}
