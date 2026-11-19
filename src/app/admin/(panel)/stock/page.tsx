import Link from "next/link";
import { requireAdmin } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { formatDateTime, formatPrice, priceInput } from "@/lib/format";
import { STOCK_REASON_LABEL } from "@/lib/stock";
import type { Prisma } from "@/generated/prisma/client";
import { AdminTop } from "../AdminTop";
import { StockRow } from "./StockRow";

export const metadata = { title: "מלאי" };

export default async function StockPage({ searchParams }: { searchParams: Promise<{ q?: string; filter?: string; v?: string }> }) {
  await requireAdmin();
  const sp = await searchParams;
  const q = (sp.q ?? "").slice(0, 80);
  const where: Prisma.ProductVariantWhereInput = {
    isActive: true,
    product: { status: { not: "ARCHIVED" } },
    ...(q
      ? { OR: [{ sku: { contains: q, mode: "insensitive" } }, { name: { contains: q, mode: "insensitive" } }, { product: { name: { contains: q, mode: "insensitive" } } }, { barcode: q }] }
      : {}),
    ...(sp.filter === "low" ? { stock: { lte: db.productVariant.fields.lowStockThreshold } } : {}),
    ...(sp.filter === "out" ? { stock: { lte: 0 } } : {}),
  };
  const [variants, movements] = await Promise.all([
    db.productVariant.findMany({
      where,
      include: { product: { select: { name: true, id: true } } },
      orderBy: [{ stock: "asc" }, { product: { name: "asc" } }],
      take: 200,
    }),
    db.stockMovement.findMany({
      where: sp.v ? { variantId: sp.v } : {},
      include: { variant: { select: { sku: true, name: true, product: { select: { name: true } } } }, user: { select: { displayName: true } } },
      orderBy: { createdAt: "desc" },
      take: 60,
    }),
  ]);
  const title = (v: { name: string | null; product: { name: string } }) => (v.name ? `${v.product.name} - ${v.name}` : v.product.name);

  return (
    <>
      <AdminTop title="מלאי" />
      <main className="admin-content">
        <p className="help">
          מכרת בחנות? בחר <b>נמכר בחנות</b>, כמות, ולחץ עדכון. המלאי באתר יורד מיד. הגיעה סחורה? בחר <b>הגיעה סחורה</b>. כל שינוי נרשם בהיסטוריה למטה.
        </p>
        <form className="toolbar-row" method="get">
          <input type="search" name="q" defaultValue={q} placeholder="חיפוש לפי שם, מק״ט או ברקוד" aria-label="חיפוש" />
          <button className="btn btn-ghost" type="submit">חיפוש</button>
          <Link href="/admin/stock" className="btn btn-ghost" aria-current={!sp.filter ? "page" : undefined}>הכל</Link>
          <Link href="/admin/stock?filter=low" className="btn btn-ghost">מלאי נמוך</Link>
          <Link href="/admin/stock?filter=out" className="btn btn-ghost">אזל</Link>
        </form>

        <section className="card" aria-label="מוצרים במלאי">
          {variants.length ? (
            <div className="stock-list">
              {variants.map((v) => (
                <div key={v.id}>
                  <StockRow variantId={v.id} title={title(v)} sku={v.sku} stock={v.stock} low={v.lowStockThreshold} price={priceInput(v.price)} />
                  <Link href={`/admin/stock?v=${v.id}#history`} className="muted" style={{ fontSize: 13 }}>היסטוריה ←</Link>
                </div>
              ))}
            </div>
          ) : (
            <p className="muted">
              {q || sp.filter ? "לא נמצאו מוצרים." : <>אין מוצרים עדיין. <Link href="/admin/products/new">הוספת מוצר ←</Link></>}
            </p>
          )}
        </section>

        <section id="history" className="card table-wrap" aria-labelledby="hist-title">
          <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
            <h2 id="hist-title">היסטוריית מלאי{sp.v && movements[0] ? `: ${title(movements[0].variant)}` : ""}</h2>
            {sp.v && <Link href="/admin/stock#history">כל המוצרים</Link>}
          </div>
          {movements.length ? (
            <table className="table">
              <thead>
                <tr><th>מתי</th><th>מוצר</th><th>פעולה</th><th>שינוי</th><th>אחרי</th><th>מי</th><th>הערה</th></tr>
              </thead>
              <tbody>
                {movements.map((m) => (
                  <tr key={m.id}>
                    <td className="muted">{formatDateTime(m.createdAt)}</td>
                    <td>{title(m.variant)}</td>
                    <td>
                      {STOCK_REASON_LABEL[m.reason]}
                      {(m.reason === "STORE_SALE" || m.reason === "RETURN") && m.unitPrice != null && <span className="muted"> · ₪{formatPrice(m.unitPrice)} ליח&apos;</span>}
                    </td>
                    <td dir="ltr" style={{ color: m.change < 0 ? "var(--text-danger)" : "var(--text-success)", fontWeight: 600 }}>
                      {m.change > 0 ? `+${m.change}` : m.change}
                    </td>
                    <td>{m.stockAfter}</td>
                    <td>{m.user?.displayName ?? (m.reason === "ONLINE_SALE" ? "האתר" : "-")}</td>
                    <td className="muted">{m.note ?? ""}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="muted">עדיין אין שינויים במלאי.</p>
          )}
        </section>
      </main>
    </>
  );
}
