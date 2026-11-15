"use client";

import { useState } from "react";
import { saveType } from "../content-actions";
import { ActionForm } from "../ui";

type F = { id: string; label: string; unit: string; group: string; filter: boolean; card: boolean };
let k = 0;

export function TypeForm({ type }: { type: { id: string; name: string; slug: string; fields: F[] } | null }) {
  const [fields, setFields] = useState(() =>
    (type?.fields.length ? type.fields : [{ id: "", label: "", unit: "", group: "", filter: true, card: true }]).map((f) => ({ ...f, _k: ++k })),
  );
  return (
    <ActionForm action={saveType}>
      <input type="hidden" name="id" value={type?.id ?? ""} />
      <label className="field"><span>שם הסוג *</span><input name="name" defaultValue={type?.name} required maxLength={80} /></label>
      <input type="hidden" name="slug" value={type?.slug ?? ""} />
      <div className="rows">
        {fields.map((f, i) => (
          <div key={f._k} className="row-item" style={{ gridTemplateColumns: "1fr" }}>
            <input type="hidden" name="f_id" value={f.id} />
            <div className="form-grid cols-3">
              <label className="field"><span>שם השדה (למשל: הספק)</span><input name="f_label" defaultValue={f.label} maxLength={80} /></label>
              <label className="field"><span>יחידה (W, mAh...)</span><input name="f_unit" defaultValue={f.unit} maxLength={20} dir="ltr" /></label>
              <label className="field"><span>קבוצה בדף המוצר</span><input name="f_group" defaultValue={f.group} placeholder="מפרט טכני" maxLength={60} /></label>
            </div>
            <div className="toolbar-row">
              <label className="check"><input type="checkbox" name="f_filter" value={String(i)} defaultChecked={f.filter} />סינון בדף הקטגוריה</label>
              <label className="check"><input type="checkbox" name="f_card" value={String(i)} defaultChecked={f.card} />להציג בכרטיס המוצר</label>
              <button type="button" className="icon-btn" aria-label="הסרת שדה" onClick={() => setFields((a) => a.filter((x) => x._k !== f._k))}>✕</button>
            </div>
          </div>
        ))}
      </div>
      <button type="button" className="btn btn-ghost" style={{ alignSelf: "flex-start" }}
        onClick={() => setFields((a) => [...a, { id: "", label: "", unit: "", group: "", filter: true, card: false, _k: ++k }])}>
        + שדה מפרט
      </button>
    </ActionForm>
  );
}
