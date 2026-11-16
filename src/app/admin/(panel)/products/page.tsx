import Link from "next/link";
import { requireAdmin } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { formatPrice } from "@/lib/format";
import type { Prisma } from "@/generated/prisma/client";
import { AdminTop } from "../AdminTop";
import { quickStock } from "./actions";

export const metadata = { title: "מוצרים ומלאי" };
const STATUS = { ACTIVE: ["פעיל", "green"], DRAFT: ["טיוטה", ""], ARCHIVED: ["בארכיון", "pink"] } as const;

export default async function ProductsPage({ searchParams }: { searchParams: Promise<{ q?: string; status?: string; cat?: string }> }) {
  await requireAdmin();
  const sp = await searchParams;
  const q = (sp.q ?? "").slice(0, 80);
  const where: Prisma.ProductWhereInput = {
    ...(q ? { OR: [{ name: { contains: q, mode: "insensitive" } }, { variants: { some: { sku: { contains: q, mode: "insensitive" } } } }] } : {}),
    ...(sp.status && sp.status in STATUS ? { status: sp.status as keyof typeof STATUS } : {}),
    ...(sp.cat ? { OR: [{ categoryId: sp.cat }, { category: { parentId: sp.cat } }] } : {}),
  };
  const [products, cats] = await Promise.all([
    db.product.findMany({
      where,
      include: { category: true, images: { take: 1, orderBy: { sortOrder: "asc" } }, variants: { orderBy: { sortOrder: "asc" } } },
      orderBy: { updatedAt: "desc" },
      take: 200,
    }),
    db.category.findMany({ where: { parentId: null }, orderBy: { sortOrder: "asc" } }),
  ]);

  return (
    <>
      <AdminTop
        title="מוצרים"
        actions={
          <>
            <Link href="/admin/products/import" className="btn btn-ghost" style={{ minHeight: 40 }}>ייבוא מאקסל</Link>
            <Link href="/admin/products/new" className="btn btn-primary" style={{ minHeight: 40 }}>+ מוצר חדש</Link>
          </>
        }
      />
      <main className="admin-content">
        <form className="toolbar-row" method="get">
          <input type="search" name="q" defaultValue={q} placeholder="חיפוש לפי שם או מק״ט" aria-label="חיפוש מוצר" />
          <select name="status" defaultValue={sp.status ?? ""} className="input" style={{ width: "auto" }} aria-label="סטטוס">
            <option value="">כל הסטטוסים</option>
            <option value="ACTIVE">פעיל</option>
            <option value="DRAFT">טיוטה</option>
            <option value="ARCHIVED">בארכיון</option>
          </select>
          <select name="cat" defaultValue={sp.cat ?? ""} className="input" style={{ width: "auto" }} aria-label="קטגוריה">
            <option value="">כל הקטגוריות</option>
            {cats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <button className="btn btn-ghost" type="submit">סינון</button>
        </form>

        <div className="card table-wrap">
          {products.length ? (
            <table className="table">
              <thead>
                <tr><th></th><th>מוצר</th><th>קטגוריה</th><th>מחיר</th><th>מלאי (עדכון מהיר)</th><th>סטטוס</th></tr>
              </thead>
              <tbody>
                {products.map((p) => {
                  const v = p.variants[0];
                  const [label, cls] = STATUS[p.status];
                  return (
                    <tr key={p.id}>
                      <td>
                        {p.images[0] ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={p.images[0].url} alt="" />
                        ) : <span style={{ display: "block", width: 44, height: 44, background: "var(--bg-page)", borderRadius: 8 }} />}
                      </td>
                      <td>
                        <Link href={`/admin/products/${p.id}`} style={{ fontWeight: 600 }}>{p.name}</Link>
                        <div className="muted" style={{ fontSize: 13 }}>{v?.sku}{p.variants.length > 1 ? ` · ${p.variants.length} וריאנטים` : ""}</div>
                      </td>
                      <td>{p.category.name}</td>
                      <td>{v ? `₪${formatPrice(v.price)}` : "-"}</td>
                      <td>
                        {p.variants.length === 1 && v ? (
                          <form action={quickStock} style={{ display: "flex", gap: 6 }}>
                            <input type="hidden" name="variantId" value={v.id} />
                            <input name="stock" type="number" min={0} defaultValue={v.stock} aria-label={`מלאי ${p.name}`} className="input" style={{ width: 80, minHeight: 36 }} />
                            <button className="btn btn-ghost" style={{ minHeight: 36, padding: "0 10px" }}>עדכון</button>
                          </form>
                        ) : (
                          <span>{p.variants.reduce((s, x) => s + x.stock, 0)} סה&quot;כ</span>
                        )}
                      </td>
                      <td><span className={`pill ${cls}`}>{label}</span></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : (
            <p className="muted">אין מוצרים עדיין. <Link href="/admin/products/new">הוספת המוצר הראשון ←</Link></p>
          )}
        </div>
      </main>
    </>
  );
}
