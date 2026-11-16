import Link from "next/link";
import { requireAdmin } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { formatDateTime, formatPrice } from "@/lib/format";
import { orderSearchWhere } from "@/lib/order-search";
import { ORDER_STATUS } from "@/lib/order-status";
import { AdminTop } from "../AdminTop";

export const metadata = { title: "חיפוש במערכת" };

const ci = (q: string) => ({ contains: q, mode: "insensitive" as const });

export default async function AdminSearchPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const me = await requireAdmin();
  const q = ((await searchParams).q ?? "").trim().slice(0, 80);
  const canOrders = me.role !== "EDITOR";

  const [orders, products, categories, articles, pages, banners] = q.length < 2
    ? [[], [], [], [], [], []]
    : await Promise.all([
        canOrders
          ? db.order.findMany({ where: orderSearchWhere(q), orderBy: { createdAt: "desc" }, take: 20 })
          : Promise.resolve([]),
        db.product.findMany({
          where: {
            OR: [
              { name: ci(q) },
              { shortDescription: ci(q) },
              { brand: { name: ci(q) } },
              { variants: { some: { OR: [{ sku: ci(q) }, { barcode: q }, { name: ci(q) }] } } },
            ],
          },
          include: { variants: { take: 1, orderBy: { sortOrder: "asc" } }, category: { select: { name: true } } },
          take: 20,
        }),
        db.category.findMany({ where: { OR: [{ name: ci(q) }, { slug: ci(q) }] }, take: 10 }),
        db.article.findMany({ where: { OR: [{ title: ci(q) }, { body: ci(q) }] }, take: 10 }),
        db.page.findMany({ where: { OR: [{ title: ci(q) }, { body: ci(q) }] }, take: 10 }),
        db.banner.findMany({ where: { OR: [{ title: ci(q) }, { subtitle: ci(q) }, { alt: ci(q) }] }, take: 10 }),
      ]);
  const count = orders.length + products.length + categories.length + articles.length + pages.length + banners.length;

  return (
    <>
      <AdminTop title="חיפוש במערכת" />
      <main className="admin-content">
        <form method="get" role="search" className="toolbar-row">
          <input type="search" name="q" defaultValue={q} autoFocus placeholder="לקוח, טלפון, הזמנה, חשבונית, מוצר, מק״ט, מאמר..." aria-label="חיפוש" style={{ flex: "1 1 320px" }} />
          <button className="btn btn-primary" type="submit">חיפוש</button>
        </form>

        {q.length < 2 ? (
          <p className="muted">הקלד לפחות 2 תווים. אפשר לחפש לקוחות והזמנות (שם, טלפון, מייל, מספר חשבונית), מוצרים (שם, מק&quot;ט, ברקוד), קטגוריות, מאמרים, עמודים ובאנרים.</p>
        ) : count === 0 ? (
          <p className="muted">לא נמצאו תוצאות עבור &quot;{q}&quot;.</p>
        ) : (
          <>
            {orders.length > 0 && (
              <section className="card table-wrap" aria-labelledby="r-orders">
                <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                  <h2 id="r-orders">הזמנות וחשבוניות ({orders.length})</h2>
                  <Link href={`/admin/orders?q=${encodeURIComponent(q)}`}>חיפוש מתקדם בהזמנות ←</Link>
                </div>
                <table className="table">
                  <thead><tr><th>הזמנה</th><th>לקוח</th><th>טלפון</th><th>חשבונית</th><th>סכום</th><th>סטטוס</th><th>תאריך</th></tr></thead>
                  <tbody>
                    {orders.map((o) => (
                      <tr key={o.id}>
                        <td><Link href={`/admin/orders/${o.id}`}>#{o.orderNumber}</Link></td>
                        <td>{o.firstName} {o.lastName}</td>
                        <td dir="ltr">{o.phone}</td>
                        <td>{o.invoiceNumber ?? "-"}</td>
                        <td>₪{formatPrice(o.total)}</td>
                        <td><span className={`pill ${ORDER_STATUS[o.status].cls}`}>{ORDER_STATUS[o.status].label}</span></td>
                        <td className="muted">{formatDateTime(o.createdAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </section>
            )}
            {products.length > 0 && (
              <section className="card table-wrap" aria-labelledby="r-products">
                <h2 id="r-products">מוצרים ({products.length})</h2>
                <table className="table">
                  <thead><tr><th>מוצר</th><th>מק&quot;ט</th><th>קטגוריה</th><th>מחיר</th><th>מלאי</th></tr></thead>
                  <tbody>
                    {products.map((p) => (
                      <tr key={p.id}>
                        <td><Link href={`/admin/products/${p.id}`}>{p.name}</Link></td>
                        <td dir="ltr">{p.variants[0]?.sku ?? "-"}</td>
                        <td>{p.category.name}</td>
                        <td>{p.variants[0] ? `₪${formatPrice(p.variants[0].price)}` : "-"}</td>
                        <td>{p.variants[0]?.stock ?? "-"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </section>
            )}
            {(categories.length > 0 || articles.length > 0 || pages.length > 0 || banners.length > 0) && (
              <section className="card" aria-labelledby="r-content">
                <h2 id="r-content">תוכן</h2>
                <ul style={{ margin: 0, paddingInlineStart: 18, display: "flex", flexDirection: "column", gap: 6 }}>
                  {categories.map((c) => <li key={c.id}>קטגוריה: <Link href={`/admin/categories?edit=${c.id}`}>{c.name}</Link></li>)}
                  {articles.map((a) => <li key={a.id}>מאמר: <Link href={`/admin/articles/${a.id}`}>{a.title}</Link></li>)}
                  {pages.map((p) => <li key={p.id}>עמוד: <Link href={`/admin/pages/${p.id}`}>{p.title}</Link></li>)}
                  {banners.map((b) => <li key={b.id}>באנר: <Link href={`/admin/banners?edit=${b.id}`}>{b.title ?? b.alt}</Link></li>)}
                </ul>
              </section>
            )}
          </>
        )}
      </main>
    </>
  );
}
