import { requireAdmin } from "@/lib/auth/session";
import { getStoredGroup, SETTING_GROUPS, siteUrl, type SettingField, type SettingGroup } from "@/lib/settings";
import { AdminTop } from "../AdminTop";
import { ActionForm } from "../ui";
import { saveSettings } from "./actions";

export const metadata = { title: "הגדרות ו-SEO" };

export default async function SettingsPage() {
  await requireAdmin("MANAGER");
  const groups = Object.keys(SETTING_GROUPS) as SettingGroup[];
  const stored = Object.fromEntries(await Promise.all(groups.map(async (g) => [g, await getStoredGroup(g)] as const)));

  return (
    <>
      <AdminTop title="הגדרות ו-SEO" />
      <main className="admin-content">
        <nav className="toolbar-row" aria-label="קבוצות הגדרות">
          {groups.map((g) => (
            <a key={g} href={`#${g}`} className="btn btn-ghost" style={{ minHeight: 36 }}>{SETTING_GROUPS[g].title}</a>
          ))}
        </nav>
        {groups.map((g) => (
          <section key={g} id={g} className="card" aria-labelledby={`h-${g}`} style={{ scrollMarginTop: 16 }}>
            <h2 id={`h-${g}`}>{SETTING_GROUPS[g].title}</h2>
            {g === "seo" && (
              <div className="help" style={{ marginBottom: 14 }}>
                <b>מה כבר מובנה באתר:</b> מפת אתר לגוגל ({siteUrl()}/sitemap.xml), robots.txt, כתובות קנוניות, תגיות Open Graph לשיתוף
                בוואטסאפ ופייסבוק, נתונים מובנים (Schema) למוצרים, מאמרים, פירורי לחם ופרטי העסק, ודפים מהירים ונגישים.
                <br />
                <b>מה נשאר לך:</b> לפתוח חשבון ב-Google Search Console, להדביק כאן את קוד האימות, ולשלוח שם את כתובת מפת האתר.
              </div>
            )}
            <ActionForm action={saveSettings}>
              <input type="hidden" name="group" value={g} />
              <div className="form-grid cols-2">
                {(SETTING_GROUPS[g].fields as SettingField[]).map((f) => (
                  <label key={f.key} className={`field ${f.type === "textarea" ? "span-all" : ""}`}>
                    <span>{f.label}</span>
                    {f.type === "textarea" ? (
                      <textarea name={f.key} defaultValue={stored[g][f.key] ?? ""} placeholder={f.placeholder} rows={3} maxLength={2000} />
                    ) : (
                      <input
                        name={f.key}
                        type={f.type === "number" ? "text" : f.type ?? "text"}
                        inputMode={f.type === "number" ? "decimal" : undefined}
                        defaultValue={stored[g][f.key] ?? ""}
                        placeholder={f.placeholder}
                        dir={["url", "email", "tel"].includes(f.type ?? "") || g === "seo" ? "ltr" : undefined}
                        maxLength={300}
                      />
                    )}
                    {f.hint && <span className="hint">{f.hint}</span>}
                  </label>
                ))}
              </div>
            </ActionForm>
          </section>
        ))}
      </main>
    </>
  );
}
