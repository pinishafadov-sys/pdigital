"use client";

import { useActionState } from "react";
import { resetPasswordAction } from "../reset-actions";

export function ResetForm({ token }: { token: string }) {
  const [state, action, pending] = useActionState(resetPasswordAction, undefined);
  return (
    <form action={action} className="login-form">
      <input type="hidden" name="token" value={token} />
      {state?.error && (
        <p role="alert" className="form-error">
          {state.error}
        </p>
      )}
      <label className="field">
        <span>סיסמה חדשה</span>
        <input name="next" type="password" autoComplete="new-password" required minLength={10} maxLength={200} dir="ltr" />
        <span className="hint">לפחות 10 תווים, אותיות וספרות, בלי שם המשתמש.</span>
      </label>
      <label className="field">
        <span>אימות סיסמה חדשה</span>
        <input name="confirm" type="password" autoComplete="new-password" required minLength={10} maxLength={200} dir="ltr" />
      </label>
      <button type="submit" className="btn btn-primary btn-lg" disabled={pending}>
        {pending ? "שומר..." : "שמירת הסיסמה החדשה"}
      </button>
    </form>
  );
}
