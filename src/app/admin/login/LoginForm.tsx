"use client";

import { useActionState } from "react";
import { loginAction } from "../auth-actions";

export function LoginForm() {
  const [state, action, pending] = useActionState(loginAction, undefined);
  return (
    <form action={action} className="login-form" noValidate>
      {state?.error && (
        <p role="alert" className="form-error">
          {state.error}
        </p>
      )}
      <label className="field">
        <span>שם משתמש</span>
        <input name="username" type="text" autoComplete="username" required maxLength={60} dir="ltr" />
      </label>
      <label className="field">
        <span>סיסמה</span>
        <input name="password" type="password" autoComplete="current-password" required maxLength={200} dir="ltr" />
      </label>
      <label className="check">
        <input type="checkbox" name="remember" />
        זכור אותי במכשיר הזה (14 יום)
      </label>
      <button type="submit" className="btn btn-primary btn-lg" disabled={pending}>
        {pending ? "מתחבר..." : "כניסה"}
      </button>
    </form>
  );
}
