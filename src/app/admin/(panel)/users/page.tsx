import { requireAdmin } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { formatDateTime } from "@/lib/format";
import { AdminTop } from "../AdminTop";
import { Select, Text } from "../fields";
import { ActionForm } from "../ui";
import { createUser, signOutEverywhere, toggleUser } from "./actions";

export const metadata = { title: "משתמשים ואבטחה" };
const ROLE = { OWNER: "מנהל ראשי", MANAGER: "מנהל", EDITOR: "עורך תוכן" } as const;
const ACTIONS: Record<string, string> = {
  login: "כניסה", login_failed: "כניסה נכשלה", password_changed: "שינוי סיסמה", product_created: "מוצר נוצר",
  product_updated: "מוצר עודכן", product_deleted: "מוצר נמחק", settings_saved: "הגדרות נשמרו", user_created: "משתמש נוצר",
};

export default async function UsersPage() {
  const me = await requireAdmin();
  const isOwner = me.role === "OWNER";
  const [users, log, sessions] = await Promise.all([
    isOwner ? db.adminUser.findMany({ orderBy: { createdAt: "asc" } }) : Promise.resolve([]),
    db.auditLog.findMany({ orderBy: { createdAt: "desc" }, take: 40, include: { user: { select: { displayName: true } } }, ...(isOwner ? {} : { where: { userId: me.id } }) }),
    db.adminSession.findMany({ where: { userId: me.id, expiresAt: { gt: new Date() } }, orderBy: { lastSeenAt: "desc" } }),
  ]);

  return (
    <>
      <AdminTop title="משתמשים ואבטחה" />
      <main className="admin-content">
        <section className="card">
          <h2>המכשירים המחוברים שלי ({sessions.length})</h2>
          <ul style={{ margin: "0 0 12px", paddingInlineStart: 18, fontSize: 14 }}>
            {sessions.map((s) => (
              <li key={s.id}>{s.userAgent?.slice(0, 80) ?? "?"} · {s.ip} · פעילות אחרונה {formatDateTime(s.lastSeenAt)}</li>
            ))}
          </ul>
          <form action={signOutEverywhere}>
            <button className="btn btn-danger" type="submit">ניתוק מכל המכשירים</button>
          </form>
        </section>

        {isOwner && (
          <div className="two-col">
            <section className="card table-wrap" aria-label="משתמשי ניהול">
              <h2>משתמשי ניהול</h2>
              <table className="table">
                <thead><tr><th>שם</th><th>משתמש</th><th>הרשאה</th><th>כניסה אחרונה</th><th></th></tr></thead>
                <tbody>
                  {users.map((u) => (
                    <tr key={u.id}>
                      <td>{u.displayName}</td>
                      <td dir="ltr">{u.username}</td>
                      <td>{ROLE[u.role]}</td>
                      <td className="muted">{u.lastLoginAt ? formatDateTime(u.lastLoginAt) : "-"}</td>
                      <td>
                        {u.id !== me.id && (
                          <form action={toggleUser}>
                            <input type="hidden" name="id" value={u.id} />
                            <button className="btn btn-ghost" style={{ minHeight: 34 }}>{u.isActive ? "השבתה" : "הפעלה"}</button>
                          </form>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
            <section className="card">
              <h2>משתמש חדש</h2>
              <ActionForm action={createUser} submitLabel="יצירת משתמש" resetOnSuccess>
                <Text name="displayName" label="שם לתצוגה" required />
                <Text name="username" label="שם משתמש (באנגלית)" required dir="ltr" />
                <Text name="password" label="סיסמה ראשונית" type="password" required dir="ltr" hint="לפחות 10 תווים, אותיות וספרות. יוחלף בכניסה הראשונה." />
                <Select name="role" label="הרשאה" defaultValue="EDITOR" options={[
                  { value: "EDITOR", label: "עורך תוכן - באנרים, מאמרים ועמודים" },
                  { value: "MANAGER", label: "מנהל - גם מוצרים, הזמנות והגדרות" },
                  { value: "OWNER", label: "מנהל ראשי - הכל, כולל משתמשים" },
                ]} />
              </ActionForm>
            </section>
          </div>
        )}

        <section className="card table-wrap">
          <h2>יומן פעילות</h2>
          <table className="table">
            <thead><tr><th>זמן</th><th>משתמש</th><th>פעולה</th><th>IP</th></tr></thead>
            <tbody>
              {log.map((l) => (
                <tr key={l.id}>
                  <td className="muted">{formatDateTime(l.createdAt)}</td>
                  <td>{l.user?.displayName ?? "-"}</td>
                  <td>{ACTIONS[l.action] ?? l.action}</td>
                  <td dir="ltr" className="muted">{l.ip}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </main>
    </>
  );
}
