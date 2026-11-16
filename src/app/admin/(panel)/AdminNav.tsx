"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV = [
  { href: "/admin", label: "לוח בקרה", dot: "var(--bg-dark)" },
  { href: "/admin/search", label: "חיפוש", dot: "var(--text-on-dark-muted)" },
  { href: "/admin/orders", label: "הזמנות וחשבוניות", dot: "var(--brand-blue-on-dark)" },
  { href: "/admin/messages", label: "לקוחות יוצרים קשר", dot: "var(--brand-pink-on-dark)", badge: "messages" },
  { href: "/admin/products", label: "מוצרים", dot: "var(--brand-pink-on-dark)" },
  { href: "/admin/stock", label: "מלאי", dot: "var(--brand-orange)" },
  { href: "/admin/reorder", label: "המלצות להזמנה", dot: "var(--brand-pink-on-dark)" },
  { href: "/admin/reports/stock", label: "דוח מלאי שנתי", dot: "var(--brand-purple-light-on-dark)" },
  { href: "/admin/categories", label: "קטגוריות", dot: "var(--brand-purple-light-on-dark)" },
  { href: "/admin/brands", label: "מותגים", dot: "var(--brand-orange)" },
  { href: "/admin/types", label: "סוגי מוצר ומפרט", dot: "var(--brand-blue-on-dark)" },
  { href: "/admin/banners", label: "באנרים", dot: "var(--brand-orange)" },
  { href: "/admin/articles", label: "מאמרים", dot: "var(--brand-pink-on-dark)" },
  { href: "/admin/pages", label: "עמודי תוכן", dot: "var(--brand-blue-on-dark)" },
  { href: "/admin/coupons", label: "קופונים", dot: "var(--brand-pink-on-dark)" },
  { href: "/admin/marketing", label: "רשימת דיוור ומבצעים", dot: "var(--whatsapp)" },
  { href: "/admin/settings", label: "הגדרות ו-SEO", dot: "var(--text-on-dark-muted)" },
  { href: "/admin/users", label: "משתמשים ואבטחה", dot: "var(--brand-purple-light-on-dark)" },
];

export function AdminNav({ newMessages = 0 }: { newMessages?: number }) {
  const path = usePathname();
  return (
    <nav aria-label="ניווט ניהול" className="admin-nav">
      {(NAV as { href: string; label: string; dot: string; badge?: string }[]).map((n) => {
        const active = n.href === "/admin" ? path === "/admin" : path.startsWith(n.href);
        const badge = n.badge === "messages" && newMessages > 0 ? newMessages : 0;
        return (
          <Link key={n.href} href={n.href} aria-current={active ? "page" : undefined}>
            <span className="dot" style={{ background: n.dot }} />
            {n.label}
            {badge > 0 && (
              <span className="nav-badge" aria-label={`${badge} פניות חדשות`}>
                {badge}
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}
