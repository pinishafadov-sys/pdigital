"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV = [
  { href: "/admin", label: "לוח בקרה", dot: "var(--bg-dark)" },
  { href: "/admin/orders", label: "הזמנות", dot: "var(--brand-blue-on-dark)" },
  { href: "/admin/products", label: "מוצרים ומלאי", dot: "var(--brand-pink-on-dark)" },
  { href: "/admin/categories", label: "קטגוריות", dot: "var(--brand-purple-light-on-dark)" },
  { href: "/admin/brands", label: "מותגים", dot: "var(--brand-orange)" },
  { href: "/admin/types", label: "סוגי מוצר ומפרט", dot: "var(--brand-blue-on-dark)" },
  { href: "/admin/banners", label: "באנרים", dot: "var(--brand-orange)" },
  { href: "/admin/articles", label: "מאמרים", dot: "var(--brand-pink-on-dark)" },
  { href: "/admin/pages", label: "עמודי תוכן", dot: "var(--brand-blue-on-dark)" },
  { href: "/admin/coupons", label: "קופונים", dot: "var(--brand-pink-on-dark)" },
  { href: "/admin/settings", label: "הגדרות ו-SEO", dot: "var(--text-on-dark-muted)" },
  { href: "/admin/users", label: "משתמשים ואבטחה", dot: "var(--brand-purple-light-on-dark)" },
];

export function AdminNav() {
  const path = usePathname();
  return (
    <nav aria-label="ניווט ניהול" className="admin-nav">
      {NAV.map((n) => {
        const active = n.href === "/admin" ? path === "/admin" : path.startsWith(n.href);
        return (
          <Link key={n.href} href={n.href} aria-current={active ? "page" : undefined}>
            <span className="dot" style={{ background: n.dot }} />
            {n.label}
          </Link>
        );
      })}
    </nav>
  );
}
