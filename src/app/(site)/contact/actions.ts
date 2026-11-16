"use server";

import { clientInfo } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { sendMail } from "@/lib/email";
import { siteUrl } from "@/lib/settings";

export type ContactState = { ok?: boolean; error?: string; fields?: Record<string, string> } | undefined;

const MAX_PER_IP_PER_HOUR = 5;
const clean = (v: FormDataEntryValue | null, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");

export async function sendContactAction(_prev: ContactState, fd: FormData): Promise<ContactState> {
  const name = clean(fd.get("name"), 80);
  const phoneRaw = clean(fd.get("phone"), 30);
  const email = clean(fd.get("email"), 120).toLowerCase();
  const message = clean(fd.get("message"), 3000);
  const fields = { name, phone: phoneRaw, email, message };

  // Honeypot: real people never fill this hidden field; bots usually do.
  if (clean(fd.get("website"), 200)) return { ok: true };

  const phone = phoneRaw.replace(/[^\d+]/g, "");
  if (name.length < 2) return { error: "נא למלא שם", fields };
  if (!/^(\+972|0)\d{8,9}$/.test(phone)) return { error: "נא למלא מספר טלפון תקין (למשל 050-1234567)", fields };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { error: "נא למלא כתובת אימייל תקינה", fields };
  if (message.length < 5) return { error: "נא לכתוב במה נוכל לעזור", fields };

  const { ip } = await clientInfo();
  const recent = await db.contactMessage.count({ where: { ip, createdAt: { gt: new Date(Date.now() - 60 * 60 * 1000) } } });
  if (recent >= MAX_PER_IP_PER_HOUR) return { error: "נשלחו כבר כמה הודעות. נסו שוב מאוחר יותר או התקשרו אלינו.", fields };

  const saved = await db.contactMessage.create({ data: { name, phone: phone.replace(/^\+972/, "0"), email, message, ip } });

  // Notify the owner (works once email sending is connected; locally it is printed to the server log).
  const owner = await db.adminUser.findFirst({ where: { role: "OWNER", isActive: true, email: { not: null } }, orderBy: { createdAt: "asc" } });
  if (owner?.email) {
    const link = `${siteUrl()}/admin/messages?id=${saved.id}`;
    await sendMail({
      to: owner.email,
      subject: `פנייה חדשה מהאתר: ${name}`,
      text: `התקבלה פנייה חדשה מעמוד צור קשר.\n\nשם: ${name}\nטלפון: ${saved.phone}\nאימייל: ${email}\n\n${message}\n\nלצפייה במערכת הניהול: ${link}`,
      html: `<div dir="rtl" style="font-family:Arial,sans-serif;font-size:15px;line-height:1.6">התקבלה פנייה חדשה מעמוד צור קשר.<br><br>${[
        ["שם", name], ["טלפון", saved.phone], ["אימייל", email],
      ].map(([k, v]) => `<b>${k}:</b> ${v.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`)}`).join("<br>")}<br><br>${message
        .replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`)
        .replace(/\n/g, "<br>")}<br><br><a href="${link}">לצפייה במערכת הניהול</a></div>`,
    });
  }
  return { ok: true };
}
