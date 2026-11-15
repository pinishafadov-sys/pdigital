import "server-only";
import { siteUrl } from "@/lib/settings";

// Sends email through Resend (https://resend.com) when RESEND_API_KEY and EMAIL_FROM are set.
// Without them, on a local site (localhost) the message is printed to the server log instead,
// so password reset still works while developing. On a real domain without a key, nothing is
// sent or logged (a reset link must never end up in production logs).

export type Mail = { to: string; subject: string; text: string; html: string };

const isLocalSite = () => /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(siteUrl());

export function emailConfigured() {
  return Boolean(process.env.RESEND_API_KEY && process.env.EMAIL_FROM);
}

export async function sendMail(mail: Mail): Promise<boolean> {
  if (!emailConfigured()) {
    if (isLocalSite()) {
      console.info(`\n[email - local only, not sent]\nTo: ${mail.to}\nSubject: ${mail.subject}\n\n${mail.text}\n`);
      return true;
    }
    console.error("[email] RESEND_API_KEY / EMAIL_FROM are not set - email not sent");
    return false;
  }
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: process.env.EMAIL_FROM, to: [mail.to], subject: mail.subject, text: mail.text, html: mail.html }),
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) console.error("[email] Resend error", res.status, (await res.text()).slice(0, 300));
    return res.ok;
  } catch (e) {
    console.error("[email] send failed", e);
    return false;
  }
}

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

export function passwordResetMail(to: string, name: string, link: string, minutes: number): Mail {
  const subject = "איפוס סיסמה - מערכת הניהול pdigital";
  const text = `שלום ${name},

התקבלה בקשה לאיפוס הסיסמה שלך למערכת הניהול של pdigital.
לבחירת סיסמה חדשה, היכנסו לקישור (בתוקף ${minutes} דקות, לשימוש פעם אחת):

${link}

אם לא ביקשתם לאפס סיסמה, אפשר להתעלם מהמייל הזה. הסיסמה שלכם לא שונתה.`;
  const html = `<div dir="rtl" style="font-family:Arial,sans-serif;font-size:16px;line-height:1.6;color:#1b1a2e;max-width:520px">
<p>שלום ${esc(name)},</p>
<p>התקבלה בקשה לאיפוס הסיסמה שלך למערכת הניהול של <b>pdigital</b>.</p>
<p><a href="${esc(link)}" style="display:inline-block;background:#f7901e;color:#15131f;font-weight:bold;padding:12px 28px;border-radius:10px;text-decoration:none">בחירת סיסמה חדשה</a></p>
<p style="color:#5b5e78;font-size:14px">הקישור בתוקף ${minutes} דקות ולשימוש פעם אחת.<br>אם לא ביקשתם לאפס סיסמה, אפשר להתעלם מהמייל הזה. הסיסמה שלכם לא שונתה.</p>
</div>`;
  return { to, subject, text, html };
}
