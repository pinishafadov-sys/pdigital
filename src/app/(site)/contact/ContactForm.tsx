"use client";

import Link from "next/link";
import { useActionState } from "react";
import { sendContactAction } from "./actions";

export function ContactForm() {
  const [state, action, pending] = useActionState(sendContactAction, undefined);
  if (state?.ok) {
    return (
      <div role="status" className="contact-done">
        <b>תודה, ההודעה נשלחה!</b>
        <p>נחזור אליכם בהקדם.</p>
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
      <div className="contact-row">
        <label>
          <span>שם מלא *</span>
          <input name="name" required maxLength={80} autoComplete="name" defaultValue={f?.name} className="input" />
        </label>
        <label>
          <span>טלפון *</span>
          <input name="phone" type="tel" required maxLength={30} autoComplete="tel" inputMode="tel" dir="ltr" defaultValue={f?.phone} className="input" />
        </label>
      </div>
      <label>
        <span>אימייל *</span>
        <input name="email" type="email" required maxLength={120} autoComplete="email" dir="ltr" defaultValue={f?.email} className="input" />
      </label>
      <label>
        <span>במה נוכל לעזור? *</span>
        <textarea name="message" required maxLength={3000} rows={5} defaultValue={f?.message} className="input" />
      </label>
      <label style={{ flexDirection: "row", alignItems: "flex-start", gap: 10, fontWeight: 400 }}>
        <input type="checkbox" name="marketing" style={{ marginTop: 4 }} />
        <span>אשמח לקבל מבצעים והטבות של pdigital בוואטסאפ, SMS ומייל (לא חובה, אפשר להסיר בכל עת)</span>
      </label>
      {/* Hidden from people, catches spam bots */}
      <label className="visually-hidden" aria-hidden="true">
        אתר
        <input name="website" tabIndex={-1} autoComplete="off" />
      </label>
      <p className="contact-privacy">
        הפרטים ישמשו רק כדי לחזור אליכם. <Link href="/pages/privacy">מדיניות פרטיות</Link>
      </p>
      <button type="submit" className="btn btn-primary btn-lg" disabled={pending}>
        {pending ? "שולח..." : "שליחה"}
      </button>
    </form>
  );
}
