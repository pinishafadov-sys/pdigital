"use client";

import { useActionState, useState } from "react";
import { sendCampaignAction } from "./campaign-actions";

export function CampaignForm({ count, filters }: { count: number; filters: { q: string; cat: string; days: string } }) {
  const [state, action, pending] = useActionState(sendCampaignAction, undefined);
  const [confirm, setConfirm] = useState(false);
  // Controlled fields: the text must stay after "send test to me" (forms reset after each send).
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  return (
    <form action={action} className="form-section">
      <input type="hidden" name="q" value={filters.q} />
      <input type="hidden" name="cat" value={filters.cat} />
      <input type="hidden" name="days" value={filters.days} />
      <label className="field">
        <span>כותרת המייל</span>
        <input name="subject" required maxLength={150} value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="למשל: {שם}, מבצע סוף שבוע ב-pdigital!" />
      </label>
      <label className="field">
        <span>תוכן ההודעה ({"{שם}"} יוחלף בשם הלקוח. קישור הסרה מתווסף אוטומטית בסוף)</span>
        <textarea name="body" required rows={6} maxLength={5000} value={body} onChange={(e) => setBody(e.target.value)} placeholder={"היי {שם},\n\nמבצע מיוחד השבוע: ...\n\nמחכים לכם,\npdigital"} />
      </label>
      <label className="check">
        <input type="checkbox" name="confirm" checked={confirm} onChange={(e) => setConfirm(e.target.checked)} />
        אני מאשר/ת לשלוח את המייל ל-{count} לקוחות שברשימה (לפי הסינון הנוכחי)
      </label>
      <div className="toolbar-row">
        <button type="submit" name="mode" value="test" className="btn btn-ghost" disabled={pending}>
          {pending ? "..." : "שליחת בדיקה אליי"}
        </button>
        <button type="submit" name="mode" value="all" className="btn btn-primary" disabled={pending || !confirm || count === 0}>
          {pending ? "שולח..." : `שליחה ל-${count} לקוחות`}
        </button>
      </div>
      <span role="status" aria-live="polite">
        {state?.error && <span className="form-error">{state.error}</span>}
        {state?.ok && <span className="form-ok">{state.message}</span>}
      </span>
    </form>
  );
}
