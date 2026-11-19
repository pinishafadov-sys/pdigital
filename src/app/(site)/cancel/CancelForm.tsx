"use client";

import { useActionState } from "react";
import { requestCancelAction } from "./actions";

export function CancelForm({ token, orderNumber }: { token?: string; orderNumber?: number }) {
  const [state, action, pending] = useActionState(requestCancelAction, undefined);
  if (state?.ok) {
    return (
      <div role="status" className="contact-done">
        <b>בקשת הביטול התקבלה{state.orderNumber ? ` (הזמנה ${state.orderNumber})` : ""}.</b>
        <p>שלחנו לך אישור במייל. נטפל בבקשה בהקדם ונעדכן אותך.</p>
      </div>
    );
  }
  const f = state?.fields;
  return (
    <form action={action} className="contact-form" noValidate>
      {state?.error && (
        <p role="alert" className="contact-error">
          {state.error}
        </p>
      )}
      {token ? (
        <>
          <input type="hidden" name="t" value={token} />
          <p style={{ margin: 0 }}>
            בקשת ביטול להזמנה מס&apos; <b>{orderNumber}</b>
          </p>
        </>
      ) : (
        <div className="contact-row">
          <label>
            <span>מספר הזמנה *</span>
            <input name="order" required inputMode="numeric" maxLength={12} defaultValue={f?.order} className="input" dir="ltr" />
          </label>
          <label>
            <span>הטלפון שהוזן בהזמנה *</span>
            <input name="phone" type="tel" required maxLength={30} autoComplete="tel" inputMode="tel" dir="ltr" defaultValue={f?.phone} className="input" />
          </label>
        </div>
      )}
      <label>
        <span>סיבת הביטול (לא חובה)</span>
        <textarea name="reason" maxLength={1000} rows={3} defaultValue={f?.reason} className="input" />
      </label>
      <label className="visually-hidden" aria-hidden="true">
        אתר
        <input name="website" tabIndex={-1} autoComplete="off" />
      </label>
      <button type="submit" className="btn btn-primary btn-lg" disabled={pending}>
        {pending ? "שולח..." : "שליחת בקשת ביטול"}
      </button>
    </form>
  );
}
