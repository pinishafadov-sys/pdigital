"use server";

import { revalidatePath } from "next/cache";
import { audit, requireAdmin } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { emailConfigured, sendMail } from "@/lib/email";
import { str, type ActionState } from "@/lib/form";
import { marketingList } from "@/lib/marketing";
import { siteUrl } from "@/lib/settings";

const MAX = 2000;
const esc = (s: string) => s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function buildMail(to: string, firstName: string, subject: string, body: string, unsubUrl: string | null) {
  const name = firstName && firstName !== "-" ? firstName : "";
  const text = body.replaceAll("{שם}", name);
  const footerText = unsubUrl
    ? `\n\n---\nקיבלת הודעה זו כי אישרת לקבל מבצעים מ-pdigital. להסרה מהרשימה: ${unsubUrl}`
    : "\n\n---\n(הודעת בדיקה)";
  const footerHtml = unsubUrl
    ? `<p style="color:#5b5e78;font-size:12px;border-top:1px solid #e3e5ee;padding-top:10px;margin-top:24px">קיבלת הודעה זו כי אישרת לקבל מבצעים מ-pdigital. <a href="${esc(unsubUrl)}">להסרה מהרשימה לחצו כאן</a>.</p>`
    : `<p style="color:#5b5e78;font-size:12px">(הודעת בדיקה)</p>`;
  return {
    to,
    subject: subject.replaceAll("{שם}", name),
    text: text + footerText,
    html: `<div dir="rtl" style="font-family:Arial,sans-serif;font-size:16px;line-height:1.7;color:#1b1a2e;max-width:560px">${esc(text).replace(/\n/g, "<br>")}${footerHtml}</div>`,
  };
}

/** mode=test sends only to the owner's email. mode=all sends to everyone in the current filter. */
export async function sendCampaignAction(_p: ActionState, fd: FormData): Promise<ActionState> {
  const me = await requireAdmin("MANAGER");
  const subject = str(fd, "subject", { max: 150 });
  const body = str(fd, "body", { max: 5000 });
  if (subject.length < 2) return { error: "יש לכתוב כותרת למייל" };
  if (body.length < 5) return { error: "יש לכתוב את תוכן ההודעה" };

  if (fd.get("mode") === "test") {
    const owner = await db.adminUser.findFirst({ where: { role: "OWNER", email: { not: null } }, orderBy: { createdAt: "asc" } });
    if (!owner?.email) return { error: "לא הוגדר מייל לבעל האתר (במסך שינוי סיסמה)" };
    await sendMail(buildMail(owner.email, "בדיקה", subject, body, null));
    return {
      ok: true,
      message: emailConfigured()
        ? `מייל בדיקה נשלח ל-${owner.email}`
        : "מייל הבדיקה נוצר. שליחת מיילים עדיין לא מחוברת (Resend), לכן הוא לא יגיע לתיבה.",
    };
  }

  if (fd.get("confirm") !== "on") return { error: "יש לסמן אישור לפני שליחה לכל הרשימה" };
  const filters = { q: str(fd, "q", { max: 80 }), cat: str(fd, "cat", { max: 40 }), days: str(fd, "days", { max: 5 }) };
  const { customers } = await marketingList(filters, MAX);
  const recipients = customers.filter((c) => c.email.includes("@"));
  if (!recipients.length) return { error: "אין נמענים ברשימה" };

  const campaign = await db.campaign.create({
    data: {
      subject,
      body,
      audience: [filters.cat ? "לפי מחלקה" : "", filters.days ? `הצטרפו ב-${filters.days} ימים` : "", filters.q ? `חיפוש: ${filters.q}` : ""].filter(Boolean).join(" · ") || "כל הרשימה",
      recipients: recipients.length,
      userId: me.id,
    },
  });
  let sent = 0;
  let failed = 0;
  for (const c of recipients) {
    const unsub = `${siteUrl()}/unsubscribe/${c.unsubToken}`;
    const ok = await sendMail(buildMail(c.email, c.firstName, subject, body, unsub));
    if (ok) sent++;
    else failed++;
    if (emailConfigured()) await sleep(550); // stay under the email service's rate limit
  }
  await db.campaign.update({ where: { id: campaign.id }, data: { sent, failed, finishedAt: new Date() } });
  await audit(me.id, "campaign_sent", "Campaign", campaign.id);
  revalidatePath("/admin/marketing");
  return {
    ok: true,
    message: emailConfigured()
      ? `נשלח ל-${sent} לקוחות${failed ? `, ${failed} נכשלו` : ""}.`
      : `נוצרו ${sent} מיילים. שליחת מיילים עדיין לא מחוברת (Resend), לכן הם לא נשלחו בפועל.`,
  };
}
