import "server-only";
import { cache } from "react";
import { db } from "@/lib/db";

// All editable site-wide settings. The admin "הגדרות" screen is generated from this list,
// and the site reads values through getSettings(). Missing values show as [placeholders].
export type SettingField = {
  key: string;
  label: string;
  hint?: string;
  type?: "text" | "textarea" | "number" | "url" | "tel" | "email";
  placeholder: string;
};

export const SETTING_GROUPS = {
  business: {
    title: "פרטי העסק",
    fields: [
      { key: "name", label: "שם העסק", placeholder: "pdigital" },
      { key: "legalName", label: "שם רשמי / ח.פ", placeholder: "[שם רשמי וח.פ]" },
      { key: "vatRate", label: "שיעור מע\"מ (%)", type: "number", hint: "משמש לחישוב מחיר עם ובלי מע\"מ בעריכת מוצר", placeholder: "18" },
      { key: "phone", label: "טלפון", type: "tel", placeholder: "[טלפון]" },
      { key: "whatsapp", label: "וואטסאפ (מספר בינלאומי, למשל 972501234567)", type: "tel", placeholder: "[וואטסאפ]" },
      { key: "email", label: "אימייל", type: "email", placeholder: "[אימייל]" },
      { key: "address", label: "כתובת החנות", placeholder: "[כתובת החנות]" },
      { key: "city", label: "עיר", placeholder: "[עיר]" },
      { key: "hours", label: "שעות פעילות", type: "textarea", placeholder: "[שעות פעילות]" },
      { key: "navigationUrl", label: "קישור ניווט (Waze / Google Maps)", type: "url", placeholder: "" },
      { key: "facebook", label: "פייסבוק", type: "url", placeholder: "" },
      { key: "instagram", label: "אינסטגרם", type: "url", placeholder: "" },
      { key: "tiktok", label: "טיקטוק", type: "url", placeholder: "" },
    ],
  },
  shipping: {
    title: "משלוחים והודעות",
    fields: [
      { key: "barText", label: "טקסט הפס הכתום בראש האתר", type: "textarea",
        placeholder: "משלוח: בדרך כלל [N] ימי עסקים · התחייבות עד [N] ימי עסקים · משלוח חינם מעל [סכום] ₪" },
      { key: "freeShippingFrom", label: "משלוח חינם מעל (₪)", type: "number", placeholder: "[סכום]" },
      { key: "deliveryTime", label: "זמן אספקה (לדף המוצר)", placeholder: "[זמן אספקה]" },
      { key: "warrantyText", label: "אחריות - בשפה פשוטה", type: "textarea", placeholder: "[תקופת אחריות ומי נותן אותה]" },
      { key: "returnsText", label: "החזרות - בשפה פשוטה", type: "textarea", placeholder: "[מדיניות החזרה בשפה פשוטה]" },
    ],
  },
  inventory: {
    title: "מלאי והתראות להזמנה",
    fields: [
      { key: "leadTimeDays", label: "זמן אספקה מהספק (ימים)", type: "number",
        hint: "כמה ימים עוברים מההזמנה מהספק עד שהסחורה בחנות. אפשר להגדיר זמן שונה לכל מותג", placeholder: "14" },
      { key: "coverDays", label: "להזמין מלאי שיספיק ל- (ימים)", type: "number", placeholder: "45" },
      { key: "salesWindowDays", label: "לחשב מהירות מכירה לפי (ימים אחרונים)", type: "number", placeholder: "30" },
    ],
  },
  home: {
    title: "טקסטים בדף הבית",
    fields: [
      { key: "clubTitle", label: "כותרת מועדון לקוחות", placeholder: "מועדון pdigital" },
      { key: "clubText", label: "טקסט מועדון לקוחות", placeholder: "פחות מדקה ואתם בפנים. הטבות ומבצעים לחברי המועדון." },
      { key: "clubBadge", label: "תגית מועדון", placeholder: "עד [X]% הנחה" },
      { key: "footerAbout", label: "טקסט קצר בכותרת התחתונה", type: "textarea",
        placeholder: "גיימינג, גאדג'טים, מוצרים מיוחדים וסלולר ואלקטרוניקה, במקום אחד." },
    ],
  },
  seo: {
    title: "קידום בגוגל (SEO) ומעקב",
    fields: [
      { key: "title", label: "כותרת האתר בגוגל", placeholder: "pdigital - הכל באתר אחד! גיימינג, גאדג'טים, סלולר ואלקטרוניקה" },
      { key: "description", label: "תיאור האתר בגוגל (עד 160 תווים)", type: "textarea",
        placeholder: "pdigital - חנות אונליין לגיימינג, גאדג'טים, מוצרים מיוחדים, סלולר ואלקטרוניקה. הכל באתר אחד!" },
      { key: "googleVerification", label: "קוד אימות Google Search Console",
        hint: "רק הערך שבתוך content=\"...\"", placeholder: "" },
      { key: "gaId", label: "מזהה Google Analytics 4 (G-XXXXXXX)", placeholder: "" },
      { key: "gtmId", label: "מזהה Google Tag Manager (GTM-XXXXXX)", placeholder: "" },
      { key: "bingVerification", label: "קוד אימות Bing", placeholder: "" },
      { key: "facebookPixel", label: "Facebook Pixel ID", placeholder: "" },
    ],
  },
  accessibility: {
    title: "נגישות",
    fields: [
      { key: "coordinatorName", label: "שם רכז/ת הנגישות", placeholder: "[שם רכז/ת נגישות]" },
      { key: "coordinatorPhone", label: "טלפון רכז/ת הנגישות", type: "tel", placeholder: "[טלפון]" },
      { key: "coordinatorEmail", label: "אימייל רכז/ת הנגישות", type: "email", placeholder: "[אימייל]" },
    ],
  },
} satisfies Record<string, { title: string; fields: SettingField[] }>;

export type SettingGroup = keyof typeof SETTING_GROUPS;
type GroupValues<G extends SettingGroup> = Record<(typeof SETTING_GROUPS)[G]["fields"][number]["key"], string>;
export type Settings = { [G in SettingGroup]: GroupValues<G> };

export const getSettings = cache(async (): Promise<Settings> => {
  const rows = await db.siteSetting.findMany();
  const stored = Object.fromEntries(rows.map((r) => [r.key, r.value as Record<string, string>]));
  const result = {} as Record<string, Record<string, string>>;
  for (const [group, def] of Object.entries(SETTING_GROUPS)) {
    result[group] = {};
    for (const f of def.fields as SettingField[]) {
      const v = stored[group]?.[f.key];
      result[group][f.key] = typeof v === "string" && v.trim() ? v : f.placeholder;
    }
  }
  return result as Settings;
});

/** Raw stored values (no placeholders) for the admin form. */
export async function getStoredGroup(group: SettingGroup) {
  const row = await db.siteSetting.findUnique({ where: { key: group } });
  return (row?.value as Record<string, string> | undefined) ?? {};
}

/** VAT rate as a percentage number (e.g. 18), from settings, with a safe fallback. */
export async function getVatRate() {
  const n = Number((await getSettings()).business.vatRate);
  return Number.isFinite(n) && n >= 0 && n <= 50 ? n : 18;
}

export function siteUrl() {
  return (process.env.SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");
}

export function whatsappLink(number: string) {
  const digits = number.replace(/\D/g, "");
  return digits.length >= 9 ? `https://wa.me/${digits}` : null;
}

export function telLink(phone: string) {
  const digits = phone.replace(/[^\d+]/g, "");
  return digits.length >= 9 ? `tel:${digits}` : null;
}
