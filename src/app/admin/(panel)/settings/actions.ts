"use server";

import { revalidatePath } from "next/cache";
import { audit, requireAdmin } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { FormError, handle, type ActionState } from "@/lib/form";
import { SETTING_GROUPS, type SettingField, type SettingGroup } from "@/lib/settings";

export async function saveSettings(_p: ActionState, fd: FormData): Promise<ActionState> {
  const me = await requireAdmin("MANAGER");
  return handle(async () => {
    const group = String(fd.get("group") ?? "") as SettingGroup;
    const def = SETTING_GROUPS[group];
    if (!def) throw new FormError("קבוצת הגדרות לא קיימת");
    if (group === "seo" && me.role !== "OWNER") throw new FormError("רק מנהל ראשי יכול לשנות קודי מעקב");
    const value: Record<string, string> = {};
    for (const f of def.fields as SettingField[]) {
      const raw = String(fd.get(f.key) ?? "").trim().slice(0, f.type === "textarea" ? 2000 : 300);
      if (f.type === "url" && raw && !/^https?:\/\//.test(raw)) throw new FormError(`"${f.label}" חייב להתחיל ב-https://`);
      if ((f.key === "shippingPrice" || f.key === "freeShippingFrom") && raw && !/^\d{1,5}(\.\d{1,2})?$/.test(raw))
        throw new FormError(`"${f.label}" צריך להיות מספר (למשל 29.90)`);
      if (f.key === "pickupEnabled" && raw && !["כן", "לא"].includes(raw)) throw new FormError("איסוף עצמי: יש לכתוב כן או לא");
      if (f.key === "vatRate" && raw && !(/^\d{1,2}(\.\d{1,2})?$/.test(raw) && Number(raw) <= 50))
        throw new FormError("שיעור מע\"מ לא תקין (למשל 18)");
      if (["leadTimeDays", "coverDays", "salesWindowDays"].includes(f.key) && raw && !(/^\d{1,3}$/.test(raw) && Number(raw) >= 1 && Number(raw) <= 365))
        throw new FormError(`"${f.label}" צריך להיות מספר ימים בין 1 ל-365`);
      if (f.key === "gaId" && raw && !/^G-[A-Z0-9]+$/.test(raw)) throw new FormError("מזהה Google Analytics צריך להיראות כך: G-XXXXXXX");
      if (f.key === "gtmId" && raw && !/^GTM-[A-Z0-9]+$/.test(raw)) throw new FormError("מזהה Tag Manager צריך להיראות כך: GTM-XXXXXX");
      if (f.key === "facebookPixel" && raw && !/^\d+$/.test(raw)) throw new FormError("Facebook Pixel ID מכיל ספרות בלבד");
      if (f.key.endsWith("Verification") && raw && !/^[\w-]+$/.test(raw)) throw new FormError("קוד אימות: רק הערך שבתוך content=\"...\"");
      if (raw) value[f.key] = raw;
    }
    await db.siteSetting.upsert({ where: { key: group }, update: { value }, create: { key: group, value } });
    await audit(me.id, "settings_saved", "SiteSetting", group);
    revalidatePath("/", "layout");
  });
}
