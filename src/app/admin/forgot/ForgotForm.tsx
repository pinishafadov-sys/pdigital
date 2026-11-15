"use client";

import { useActionState } from "react";
import { requestResetAction } from "../reset-actions";

export function ForgotForm() {
  const [state, action, pending] = useActionState(requestResetAction, undefined);
  if (state?.ok) {
    return (
      <p role="status" className="form-ok">
        {state.message}
      </p>
    );
  }
  return (
    <form action={action} className="login-form">
      {state?.error && (
        <p role="alert" className="form-error">
          {state.error}
        </p>
      )}
      <label className="field">
        <span>שם משתמש או מייל</span>
        <input name="ident" type="text" autoComplete="username" required maxLength={120} dir="ltr" />
      </label>
      <button type="submit" className="btn btn-primary btn-lg" disabled={pending}>
        {pending ? "שולח..." : "שליחת קישור לאיפוס"}
      </button>
    </form>
  );
}
