import Link from "next/link";
import { requireAdmin } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { formatDateTime, formatPrice } from "@/lib/format";
import { ORDER_STATUS } from "@/lib/order-status";
import type { OrderStatus } from "@/generated/prisma/client";
import { AdminTop } from "../AdminTop";

export const metadata = { title: "הזמנות" };

export default async function OrdersPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  await requireAdmin("MANAGER");
  const { status } = await searchParams;
  const orders = await db.order.findMany({
    where: status && status in ORDER_STATUS ? { status: status as OrderStatus } : {},
    orderBy: { createdAt: "desc" },
    take: 200,
    include: { _count: { select: { items: true } } },
  });

  return (
    <>
      <AdminTop title="הזמנות" />
      <main className="admin-content">
        <nav className="toolbar-row" aria-label="סינון לפי סטטוס">
          <Link href="/admin/orders" className="btn btn-ghost" style={{ minHeight: 36 }}>הכל</Link>
          {Object.entries(ORDER_STATUS).map(([k, v]) => (
            <Link key={k} href={`/admin/orders?status=${k}`} className="btn btn-ghost" style={{ minHeight: 36 }} aria-current={status === k ? "page" : undefined}>
              {v.label}
            </Link>
          ))}
        </nav>
        <div className="card table-wrap">
          {orders.length ? (
            <table className="table">
              <thead><tr><th>הזמנה</th><th>לקוח</th><th>טלפון</th><th>פריטים</th><th>סכום</th><th>סטטוס</th><th>תאריך</th></tr></thead>
              <tbody>
                {orders.map((o) => (
                  <tr key={o.id}>
                    <td><Link href={`/admin/orders/${o.id}`} style={{ fontWeight: 600 }}>#{o.orderNumber}</Link></td>
                    <td>{o.firstName} {o.lastName}</td>
                    <td dir="ltr">{o.phone}</td>
                    <td>{o._count.items}</td>
                    <td>₪{formatPrice(o.total)}</td>
                    <td><span className={`pill ${ORDER_STATUS[o.status].cls}`}>{ORDER_STATUS[o.status].label}</span></td>
                    <td className="muted">{formatDateTime(o.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="muted">אין הזמנות עדיין. הזמנות יגיעו לכאן אוטומטית אחרי חיבור סולק התשלומים (שלב 4).</p>
          )}
        </div>
      </main>
    </>
  );
}
