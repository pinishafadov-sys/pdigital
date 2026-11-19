import type { Metadata } from "next";
import Link from "next/link";
import { LogoMark } from "@/components/Logo";
import { getCurrentAdmin } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { logoutAction } from "../auth-actions";
import { AdminNav } from "./AdminNav";
import "../admin.css";

export const metadata: Metadata = {
  title: { default: "מערכת ניהול", template: "%s | ניהול pdigital" },
  robots: { index: false, follow: false },
};

const ROLE = { OWNER: "מנהל ראשי", MANAGER: "מנהל", EDITOR: "עורך תוכן" } as const;

export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  const me = await getCurrentAdmin();
  if (!me) redirect("/admin/login");
  const [newMessages, cancelRequests] = await Promise.all([
    db.contactMessage.count({ where: { status: "NEW" } }),
    db.cancelRequest.count({ where: { status: "PENDING" } }),
  ]);

  return (
    <div className="admin-body admin-shell">
      <aside className="admin-side" aria-label="תפריט ניהול">
        <div className="admin-side-top">
          <Link href="/admin" className="admin-brand" style={{ color: "#fff" }}>
            <LogoMark size={34} onDark />
            <span>
              <span dir="ltr" style={{ fontFamily: "var(--font-logo)", fontWeight: 600, fontSize: 22 }}>
                <span style={{ color: "var(--brand-purple-light-on-dark)" }}>p</span>
                <span style={{ color: "var(--brand-orange)" }}>digital</span>
              </span>
              <small>מערכת ניהול</small>
            </span>
          </Link>
          <form action={logoutAction} className="mobile-only">
            <button type="submit" className="link-btn">התנתקות</button>
          </form>
        </div>
        {!me.mustChangePassword && <AdminNav newMessages={newMessages} cancelRequests={cancelRequests} />}
        <div className="admin-user">
          מחובר כ: {me.displayName}
          <br />
          הרשאה: {ROLE[me.role]}
          <br />
          <Link href="/admin/account" style={{ color: "#ffb74d" }}>שינוי סיסמה</Link>
          {" · "}
          <form action={logoutAction} style={{ display: "inline" }}>
            <button type="submit">התנתקות</button>
          </form>
        </div>
      </aside>
      <div className="admin-main">{children}</div>
    </div>
  );
}
