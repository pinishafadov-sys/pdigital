// Every place in the admin panel, with the words people might type to find it.
// Used by the dashboard search box ("go to...") and the search results page.
export type Destination = { label: string; href: string; group: string; keywords: string };

export const ADMIN_DESTINATIONS: Destination[] = [
  { label: "לוח בקרה", href: "/admin", group: "מסכים", keywords: "בית ראשי סיכום דשבורד" },
  { label: "סטטיסטיקות", href: "/admin/stats", group: "מסכים", keywords: "סטטיסטיקה כניסות מבקרים צפיות הכנסות רווח רווח נקי כסף מכירות גרף יומי שבועי חודשי שנתי המרה מקורות תנועה" },
  { label: "הזמנות וחשבוניות", href: "/admin/orders", group: "מסכים", keywords: "הזמנה חשבונית לקוחות קניות מכירות סטטוס משלוח מעקב" },
  { label: "ביטולים והחזרות", href: "/admin/returns", group: "מסכים", keywords: "ביטול עסקה ביטולים החזרה החזרות החזר כספי זיכוי בקשת ביטול" },
  { label: "לקוחות יוצרים קשר", href: "/admin/messages", group: "מסכים", keywords: "פניות הודעות צור קשר לקוח פנייה" },
  { label: "מוצרים", href: "/admin/products", group: "מסכים", keywords: "מוצר פריט מחיר מחירים קטלוג" },
  { label: "מוצר חדש", href: "/admin/products/new", group: "פעולות", keywords: "הוספת מוצר העלאת מוצר להוסיף מוצר חדש" },
  { label: "ייבוא מוצרים מאקסל", href: "/admin/products/import", group: "פעולות", keywords: "ייבוא אקסל excel csv קובץ העלאת מוצרים רשימה" },
  { label: "מלאי", href: "/admin/stock", group: "מסכים", keywords: "מלאי כמות נמכר בחנות הגיעה סחורה ספירה החזרה" },
  { label: "המלצות להזמנה", href: "/admin/reorder", group: "מסכים", keywords: "להזמין ספק הזמנה מספק נמכרים ביותר אוזל" },
  { label: "הזמנות רכש", href: "/admin/purchase-orders", group: "מסכים", keywords: "רכש הזמנת רכש ספק ספקים להזמין סחורה קליטת סחורה הגיעה סחורה" },
  { label: "ספקים", href: "/admin/suppliers", group: "מסכים", keywords: "ספק ספקים יבואן מפיץ סיטונאי זמן אספקה" },
  { label: "דוח מלאי שנתי", href: "/admin/reports/stock", group: "מסכים", keywords: "דוח מלאי שנתי רואה חשבון ספירת מלאי pdf אקסל הדפסה שווי" },
  { label: "קטגוריות ותפריט", href: "/admin/categories", group: "מסכים", keywords: "קטגוריה מחלקה מחלקות תפריט אביזרים" },
  { label: "מותגים", href: "/admin/brands", group: "מסכים", keywords: "מותג לוגו יצרן זמן אספקה" },
  { label: "סוגי מוצר ומפרט", href: "/admin/types", group: "מסכים", keywords: "מפרט סוג מוצר שדות סינון" },
  { label: "באנרים", href: "/admin/banners", group: "מסכים", keywords: "באנר תמונה ראשית דף הבית מבצע פרסומת" },
  { label: "מאמרים", href: "/admin/articles", group: "מסכים", keywords: "מאמר בלוג תוכן קידום גוגל" },
  { label: "מאמר חדש", href: "/admin/articles/new", group: "פעולות", keywords: "כתיבת מאמר להוסיף מאמר" },
  { label: "עמודי תוכן", href: "/admin/pages", group: "מסכים", keywords: "עמוד תקנון פרטיות נגישות הצהרת נגישות משלוחים החזרות אודות שאלות נפוצות" },
  { label: "רשימת דיוור ומבצעים", href: "/admin/marketing", group: "מסכים", keywords: "דיוור וואטסאפ ווצאפ מבצע הודעה לקוחות רשימת תפוצה sms מייל פרסום ספאם" },
  { label: "גוגל שופינג", href: "/admin/google-shopping", group: "מסכים", keywords: "גוגל שופינג google shopping merchant center פיד קניות מוצרים בגוגל" },
  { label: "קופונים", href: "/admin/coupons", group: "מסכים", keywords: "קופון הנחה קוד מבצע" },
  { label: "חיפוש במערכת", href: "/admin/search", group: "מסכים", keywords: "חיפוש" },
  { label: "פרטי העסק", href: "/admin/settings#business", group: "הגדרות", keywords: "טלפון וואטסאפ כתובת שעות פעילות ח.פ שם העסק פייסבוק אינסטגרם ניווט מע\"מ מעמ" },
  { label: "משלוחים והפס הכתום", href: "/admin/settings#shipping", group: "הגדרות", keywords: "משלוח חינם פס כתום הודעה זמן אספקה אחריות החזרות" },
  { label: "התראות מלאי והזמנה", href: "/admin/settings#inventory", group: "הגדרות", keywords: "זמן אספקה ימים מהירות מכירה" },
  { label: "טקסטים בדף הבית", href: "/admin/settings#home", group: "הגדרות", keywords: "מועדון לקוחות טקסט תחתון" },
  { label: "קידום בגוגל (SEO) ומעקב", href: "/admin/settings#seo", group: "הגדרות", keywords: "גוגל seo search console analytics אנליטיקס פיקסל פייסבוק תיאור כותרת" },
  { label: "נגישות - רכז נגישות", href: "/admin/settings#accessibility", group: "הגדרות", keywords: "נגישות רכז" },
  { label: "שינוי סיסמה ומייל שחזור", href: "/admin/account", group: "חשבון", keywords: "סיסמה מייל שחזור חשבון שלי" },
  { label: "משתמשים ואבטחה", href: "/admin/users", group: "חשבון", keywords: "משתמש עובד הרשאות יומן פעילות אבטחה מכשירים ניתוק" },
  { label: "צפייה באתר", href: "/", group: "פעולות", keywords: "אתר חנות לצפות" },
];

const norm = (s: string) => s.toLowerCase().replace(/["'״׳]/g, "").trim();

/** Destinations matching every word of the query (label matches rank first). */
export function matchDestinations(q: string, limit = 8): Destination[] {
  const words = norm(q).split(/\s+/).filter(Boolean);
  if (!words.length) return [];
  return ADMIN_DESTINATIONS.map((d) => {
    const label = norm(d.label);
    const hay = `${label} ${norm(d.keywords)}`;
    if (!words.every((w) => hay.includes(w))) return null;
    const score = words.reduce((s, w) => s + (label.startsWith(w) ? 3 : label.includes(w) ? 2 : 1), 0);
    return { d, score };
  })
    .filter((x): x is { d: Destination; score: number } => x !== null)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((x) => x.d);
}
