import { requireAdmin } from "@/lib/auth/session";
import { changePasswordAction } from "../../auth-actions";
import { AdminTop } from "../AdminTop";
import { ActionForm } from "../ui";

export const metadata = { title: "שינוי סיסמה" };

export default async function AccountPage({ searchParams }: { searchParams: Promise<{ force?: string }> }) {
  const me = await requireAdmin("EDITOR", { allowPasswordChange: true });
  const { force } = await searchParams;
  return (
    <>
      <AdminTop title="שינוי סיסמה" />
      <main className="admin-content" style={{ maxWidth: 560 }}>
        {(force || me.mustChangePassword) && (
          <p className="warn">
            <b>חובה להחליף סיסמה לפני שממשיכים.</b> הסיסמה הראשונית אינה בטוחה. בחרו סיסמה חזקה: לפחות 10 תווים, אותיות וספרות,
            ובלי שם המשתמש.
          </p>
        )}
        <div className="card">
          <ActionForm action={changePasswordAction} submitLabel="עדכון סיסמה">
            <label className="field">
              <span>סיסמה נוכחית</span>
              <input type="password" name="current" autoComplete="current-password" required dir="ltr" />
            </label>
            <label className="field">
              <span>סיסמה חדשה</span>
              <input type="password" name="next" autoComplete="new-password" required minLength={10} dir="ltr" />
              <span className="hint">לפחות 10 תווים, אותיות וספרות. מומלץ משפט קצר שקל לזכור.</span>
            </label>
            <label className="field">
              <span>אימות סיסמה חדשה</span>
              <input type="password" name="confirm" autoComplete="new-password" required minLength={10} dir="ltr" />
            </label>
          </ActionForm>
        </div>
        <p className="help">אחרי שינוי הסיסמה, כל המכשירים האחרים שמחוברים לחשבון ינותקו אוטומטית.</p>
      </main>
    </>
  );
}
