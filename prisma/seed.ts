// Initial data: admin user, departments from CLAUDE.md, content pages (templates with [placeholders]).
// Safe to run more than once - existing rows are not overwritten.
import "dotenv/config";
import { randomBytes, scrypt as scryptCb } from "node:crypto";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }) });

// Same format as src/lib/auth/password.ts
function hashPassword(password: string) {
  const N = 2 ** 15, r = 8, p = 1;
  const salt = randomBytes(16);
  return new Promise<string>((resolve, reject) =>
    scryptCb(password.normalize("NFKC"), salt, 64, { N, r, p, maxmem: 128 * N * r * 2 }, (err, key) =>
      err ? reject(err) : resolve(["scrypt", N, r, p, salt.toString("base64url"), key.toString("base64url")].join("$")),
    ),
  );
}

const CATEGORIES = [
  { slug: "gaming", name: "גיימינג" },
  { slug: "gadgets", name: "גאדג'טים" },
  { slug: "special", name: "מוצרים מיוחדים" },
  { slug: "cellular", name: "סלולר" },
  { slug: "electronics", name: "אלקטרוניקה", description: "אלקטרוניקה, אביזרי סלולר ומטענים" },
  { slug: "gifts", name: "מתנות" },
];

const PAGES: { slug: string; title: string; body: string }[] = [
  {
    slug: "about",
    title: "אודות pdigital",
    body: `pdigital - הכל באתר אחד!

[כמה משפטים על העסק: ממתי הוא פועל, איפה החנות הפיזית, ומה מייחד אתכם]

## מה תמצאו אצלנו
- גיימינג
- גאדג'טים
- מוצרים מיוחדים
- סלולר ואלקטרוניקה, כולל אביזרים ומטענים
- מתנות`,
  },
  {
    slug: "shipping",
    title: "משלוחים",
    body: `## זמני משלוח
בדרך כלל [N] ימי עסקים. התחייבות: עד [N] ימי עסקים.

## עלות משלוח
משלוח חינם בקנייה מעל [סכום] ₪. מתחת לסכום זה: [מחיר משלוח] ₪.

## חברת המשלוחים
[שם חברת המשלוחים]. אפשר לקבל את ההזמנה עד הבית או בנקודת איסוף.

## איסוף עצמי
[האם יש איסוף עצמי מהחנות, כתובת ושעות]`,
  },
  {
    slug: "returns",
    title: "אחריות והחזרות",
    body: `## ביטול עסקה והחזרות
[מדיניות ההחזרה בשפה פשוטה, בהתאם לחוק הגנת הצרכן: תוך כמה ימים, באיזה מצב המוצר צריך להיות, ומי משלם על המשלוח]

## אחריות
[תקופת האחריות לכל סוג מוצר ומי נותן אותה: יבואן רשמי / יבואן מקביל / החנות]

## איך פונים
[טלפון / וואטסאפ / אימייל לשירות לקוחות]`,
  },
  {
    slug: "faq",
    title: "שאלות נפוצות",
    body: `## כמה זמן לוקח משלוח?
[N] ימי עסקים בדרך כלל.

## האם המוצרים מקוריים?
[תשובה]

## אפשר להחזיר מוצר?
כן, לפי מדיניות ההחזרות. [קישור או פירוט קצר]

## יש חנות פיזית?
[כתובת ושעות]`,
  },
  {
    slug: "terms",
    title: "תקנון האתר",
    body: `[תבנית - יש להשלים ולהעביר לבדיקת עורך דין לפני ההשקה]

## כללי
האתר מופעל על ידי [שם העסק הרשמי, ח.פ / ע.מ], [כתובת]. השימוש באתר ורכישה בו כפופים לתקנון זה.

## הזמנות ותשלום
[אמצעי תשלום, אישור הזמנה, מחירים כוללים מע"מ]

## משלוחים
ראו עמוד [משלוחים](/pages/shipping).

## ביטול עסקה
[בהתאם לחוק הגנת הצרכן, התשמ"א-1981 ותקנות ביטול עסקה]

## אחריות
ראו עמוד [אחריות והחזרות](/pages/returns).

## פרטיות
ראו [מדיניות הפרטיות](/pages/privacy).

## יצירת קשר
[טלפון, אימייל, כתובת]`,
  },
  {
    slug: "privacy",
    title: "מדיניות פרטיות",
    body: `[תבנית - יש להשלים ולהעביר לבדיקת עורך דין לפני ההשקה]

## איזה מידע נאסף
פרטים שמסרתם בהזמנה (שם, טלפון, אימייל, כתובת למשלוח), ונתוני שימוש אנונימיים באתר.

## תשלום
פרטי כרטיס האשראי מוזנים בדף מאובטח של חברת הסליקה, ואינם נשמרים בשרתי האתר.

## שימוש במידע
לצורך טיפול בהזמנה, שירות לקוחות, ודיוור רק אם נתתם הסכמה.

## עוגיות (Cookies)
[פירוט כלי מדידה בשימוש, למשל Google Analytics]

## זכויותיכם
אפשר לבקש לעיין במידע, לתקן אותו או למחוק אותו: [אימייל לפניות]`,
  },
  {
    slug: "accessibility",
    title: "הצהרת נגישות",
    body: `אנו ב-pdigital רואים חשיבות רבה במתן שירות שוויוני לכל הלקוחות, ופועלים להנגשת האתר לאנשים עם מוגבלות.

## רמת הנגישות באתר
האתר נבנה בהתאם לתקן הישראלי ת"י 5568 ולהנחיות WCAG 2.0 ברמה AA, לפי תקנות שוויון זכויות לאנשים עם מוגבלות (התאמות נגישות לשירות), התשע"ג-2013.

## מה נעשה באתר
- ניווט מלא באמצעות מקלדת, עם סימון ברור של הרכיב הפעיל
- קישור "דילוג לתוכן הראשי" בתחילת כל עמוד
- טקסט חלופי לתמונות
- תוויות לכל שדות הטפסים
- ניגודיות צבעים תקינה
- התאמה לקוראי מסך ומבנה כותרות היררכי
- תפריט נגישות: הגדלת טקסט, ניגודיות גבוהה, הדגשת קישורים, גופן קריא ועצירת אנימציות
- תצוגה מותאמת לטלפון נייד
- כיבוד הגדרת "הפחתת תנועה" של מערכת ההפעלה

## הסדרי נגישות בחנות הפיזית
[פירוט: חניית נכים, כניסה נגישה, שירותים נגישים וכו']

## נתקלתם בבעיה?
אם מצאתם רכיב שאינו נגיש, נשמח לשמוע ולתקן:
- רכז/ת נגישות: {{coordinatorName}}
- טלפון: {{coordinatorPhone}}
- אימייל: {{coordinatorEmail}}

הצהרה זו עודכנה בתאריך {{updatedAt}}.`,
  },
];

async function main() {
  // ---- admin
  const username = (process.env.ADMIN_INITIAL_USERNAME || "admin").toLowerCase();
  const password = process.env.ADMIN_INITIAL_PASSWORD || "";
  if (!password) throw new Error("ADMIN_INITIAL_PASSWORD is empty in .env");
  if (process.env.NODE_ENV === "production" && password.length < 12)
    throw new Error("Refusing to create a production admin with a weak password (min 12 chars).");
  const existing = await db.adminUser.findUnique({ where: { username } });
  if (!existing) {
    await db.adminUser.create({
      data: { username, displayName: "מנהל ראשי", role: "OWNER", passwordHash: await hashPassword(password), mustChangePassword: true },
    });
    console.log(`✓ admin user "${username}" created (must change password on first login)`);
  } else console.log(`• admin user "${username}" already exists - unchanged`);

  // ---- departments + accessories sub-category in each
  for (const [i, c] of CATEGORIES.entries()) {
    const cat = await db.category.upsert({
      where: { slug: c.slug },
      update: {},
      create: { slug: c.slug, name: c.name, description: c.description, sortOrder: i },
    });
    await db.category.upsert({
      where: { slug: `${c.slug}-accessories` },
      update: {},
      create: { slug: `${c.slug}-accessories`, name: "אביזרים", parentId: cat.id, isAccessories: true, sortOrder: 99, showOnHome: false },
    });
  }
  console.log(`✓ ${CATEGORIES.length} departments (each with an accessories sub-category)`);

  // ---- content pages
  for (const p of PAGES) {
    await db.page.upsert({ where: { slug: p.slug }, update: {}, create: { ...p, isPublished: true } });
  }
  console.log(`✓ ${PAGES.length} content pages`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
