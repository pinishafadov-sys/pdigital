"use client";

import Link from "next/link";
import { startTransition, useActionState, useState } from "react";
import { importAction } from "./actions";

const ACTION = { create: ["מוצר חדש", "blue"], update: ["עדכון", "green"], error: ["שגיאה - יידלג", "pink"] } as const;

export function ImportForm() {
  const [state, action, pending] = useActionState(importAction, undefined);
  const [mode, setMode] = useState<"preview" | "commit">("preview");
  const [onlyErrors, setOnlyErrors] = useState(false);

  if (state?.stage === "done") {
    return (
      <div className="card form-section">
        <p className="form-ok">
          הייבוא הסתיים: {state.created} מוצרים/וריאנטים חדשים, {state.updated} עודכנו
          {state.skipped ? `, ${state.skipped} שורות עם שגיאות דולגו` : ""}.
        </p>
        <p className="muted" style={{ margin: 0 }}>מוצרים חדשים נשמרים כ&quot;טיוטה&quot; (מוסתרים מהאתר) אלא אם בעמודת הסטטוס כתוב &quot;פעיל&quot;.</p>
        <div className="toolbar-row">
          <Link href="/admin/products" className="btn btn-primary">לרשימת המוצרים</Link>
          <Link href="/admin/products/import" className="btn btn-ghost" onClick={() => location.reload()}>ייבוא קובץ נוסף</Link>
        </div>
      </div>
    );
  }

  const plan = state?.stage === "preview" ? state.plan : null;
  const rows = plan ? (onlyErrors ? plan.rows.filter((r) => r.action === "error") : plan.rows) : [];

  // Submit manually (not via the form "action" prop) so the chosen file stays selected
  // between step 1 (check) and step 2 (import) - React resets action forms after submit.
  const submit = (m: "preview" | "commit") => (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    const form = e.currentTarget.form;
    if (!form || !form.reportValidity()) return;
    setMode(m);
    const fd = new FormData(form);
    fd.set("mode", m);
    startTransition(() => action(fd));
  };

  return (
    <form className="form-section" onSubmit={(e) => e.preventDefault()}>
      <div className="card form-section">
        <label className="field">
          <span>קובץ אקסל (.xlsx) או CSV</span>
          <input type="file" name="file" accept=".xlsx,.csv" required style={{ paddingTop: 10 }} />
          <span className="hint">שורה ראשונה = כותרות העמודות. עד 3,000 שורות, עד 5MB.</span>
        </label>
        <div className="toolbar-row">
          <button type="button" className="btn btn-primary" disabled={pending} onClick={submit("preview")}>
            {pending && mode === "preview" ? "בודק..." : "1. בדיקת הקובץ"}
          </button>
          <a href="/admin/products/import/template" className="btn btn-ghost" download>הורדת קובץ דוגמה</a>
        </div>
        {state?.stage === "error" && <p className="form-error">{state.error}</p>}
      </div>

      {plan && (
        <div className="card form-section">
          <h2 style={{ margin: 0 }}>תוצאות הבדיקה: {state?.stage === "preview" ? state.fileName : ""}</h2>
          <div className="kpis">
            <div className="kpi"><span className="label">מוצרים חדשים</span><span className="value">{plan.newProducts}</span><span className="note">{plan.creates} שורות</span></div>
            <div className="kpi"><span className="label">עדכונים</span><span className="value">{plan.updates}</span><span className="note">לפי מק&quot;ט קיים</span></div>
            <div className="kpi"><span className="label">שגיאות</span><span className="value" style={{ color: plan.errors ? "var(--text-danger)" : undefined }}>{plan.errors}</span><span className="note">ידלגו עליהן</span></div>
            <div className="kpi"><span className="label">מותגים חדשים</span><span className="value">{plan.newBrands.length}</span><span className="note">{plan.newBrands.slice(0, 3).join(", ")}</span></div>
          </div>
          {plan.unknownColumns.length > 0 && (
            <p className="warn">עמודות שלא זוהו ולא ייובאו: {plan.unknownColumns.join(", ")}</p>
          )}
          {plan.errors > 0 && (
            <label className="check"><input type="checkbox" checked={onlyErrors} onChange={(e) => setOnlyErrors(e.target.checked)} />הצג רק שורות עם שגיאות</label>
          )}
          <div className="table-wrap" style={{ maxHeight: 420, overflowY: "auto" }}>
            <table className="table">
              <thead><tr><th>שורה</th><th>מק&quot;ט</th><th>שם</th><th>מה יקרה</th><th>הערות</th></tr></thead>
              <tbody>
                {rows.slice(0, 500).map((r) => (
                  <tr key={r.line}>
                    <td>{r.line}</td>
                    <td dir="ltr">{r.sku}</td>
                    <td>{r.name}</td>
                    <td><span className={`pill ${ACTION[r.action][1]}`}>{ACTION[r.action][0]}</span></td>
                    <td style={{ color: r.messages.length ? "var(--text-danger)" : undefined }}>{r.messages.join(" · ")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="toolbar-row">
            <button type="button" className="btn btn-primary btn-lg" disabled={pending || plan.creates + plan.updates === 0}
              onClick={submit("commit")}>
              {pending && mode === "commit" ? "מייבא..." : `2. אישור וייבוא ${plan.creates + plan.updates} שורות`}
            </button>
            <span className="muted">שום דבר לא נשמר עד שלוחצים על הכפתור הזה.</span>
          </div>
        </div>
      )}
    </form>
  );
}
