"use client";

import { useState } from "react";
import { saveProduct } from "../actions";
import { ActionForm } from "../../ui";

type Opt = { value: string; label: string };
type VariantRow = { id: string; name: string; sku: string; price: string; compare: string; cost: string; stock: string };
type Props = {
  product: {
    id: string; name: string; slug: string; shortDescription: string | null; description: string | null;
    status: string; tags: string[]; categoryId: string; brandId: string | null; productTypeId: string | null;
    warrantyMonths: number | null; isWeeklyDeal: boolean; seoTitle: string | null; seoDescription: string | null;
    variants: VariantRow[]; images: { url: string; alt: string }[]; specs: Record<string, string>; accessories: string[];
  } | null;
  categories: Opt[];
  brands: Opt[];
  types: { id: string; name: string; fields: { id: string; label: string; unit: string | null }[] }[];
  accessoryOptions: { id: string; name: string }[];
};

const emptyVariant = (): VariantRow => ({ id: "", name: "", sku: "", price: "", compare: "", cost: "", stock: "0" });
let key = 0;
const withKey = <T,>(x: T) => ({ ...x, _k: ++key });

export function ProductForm({ product: p, categories, brands, types, accessoryOptions }: Props) {
  const [variants, setVariants] = useState(() => (p?.variants.length ? p.variants : [emptyVariant()]).map(withKey));
  const [images, setImages] = useState(() => (p?.images ?? []).map(withKey));
  const [typeId, setTypeId] = useState(p?.productTypeId ?? "");
  const type = types.find((t) => t.id === typeId);

  const moveImage = (i: number, d: -1 | 1) =>
    setImages((arr) => {
      const next = [...arr];
      const j = i + d;
      if (j < 0 || j >= next.length) return arr;
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });

  return (
    <ActionForm action={saveProduct} submitLabel={p ? "שמירת שינויים" : "יצירת מוצר"}>
      <input type="hidden" name="id" value={p?.id ?? ""} />

      <section className="card form-section" aria-labelledby="sec-basic">
        <h2 id="sec-basic">פרטים בסיסיים</h2>
        <div className="form-grid cols-2">
          <label className="field span-all">
            <span>שם המוצר *</span>
            <input name="name" defaultValue={p?.name} required maxLength={200} />
          </label>
          <label className="field">
            <span>קטגוריה *</span>
            <select name="categoryId" defaultValue={p?.categoryId ?? ""} required>
              <option value="">בחירה...</option>
              {categories.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
            <span className="hint">אביזרים: בחרו את תת-הקטגוריה &quot;אביזרים&quot; של המחלקה</span>
          </label>
          <label className="field">
            <span>מותג</span>
            <select name="brandId" defaultValue={p?.brandId ?? ""}>
              <option value="">ללא</option>
              {brands.map((b) => <option key={b.value} value={b.value}>{b.label}</option>)}
            </select>
          </label>
          <label className="field">
            <span>סטטוס</span>
            <select name="status" defaultValue={p?.status ?? "DRAFT"}>
              <option value="ACTIVE">פעיל - מוצג באתר</option>
              <option value="DRAFT">טיוטה - מוסתר</option>
              <option value="ARCHIVED">ארכיון</option>
            </select>
          </label>
          <label className="field">
            <span>אחריות (חודשים)</span>
            <input name="warrantyMonths" type="number" min={0} max={240} defaultValue={p?.warrantyMonths ?? ""} />
          </label>
          <fieldset className="field span-all" style={{ border: 0, padding: 0, margin: 0 }}>
            <legend style={{ marginBottom: 6 }}>תגיות ותצוגה</legend>
            <div className="toolbar-row">
              {[["NEW", "חדש"], ["SALE", "מבצע"], ["HOT", "להיט"]].map(([v, l]) => (
                <label key={v} className="check"><input type="checkbox" name="tags" value={v} defaultChecked={p?.tags.includes(v)} />{l}</label>
              ))}
              <label className="check"><input type="checkbox" name="isWeeklyDeal" defaultChecked={p?.isWeeklyDeal} />להציג ב&quot;מבצעי השבוע&quot;</label>
            </div>
          </fieldset>
          <label className="field span-all">
            <span>תיאור קצר (מופיע ליד המחיר)</span>
            <input name="shortDescription" defaultValue={p?.shortDescription ?? ""} maxLength={400} />
          </label>
          <label className="field span-all">
            <span>תיאור מלא</span>
            <textarea name="description" defaultValue={p?.description ?? ""} rows={8} maxLength={20000} />
            <span className="hint">שורה ריקה = פסקה חדשה · ## כותרת · - פריט ברשימה · **מודגש**</span>
          </label>
        </div>
      </section>

      <section className="card form-section" aria-labelledby="sec-var">
        <h2 id="sec-var">מחיר, מלאי ווריאנטים</h2>
        <p className="muted" style={{ margin: 0 }}>
          מוצר רגיל = שורה אחת. מוצר עם צבעים / נפחים = שורה לכל אפשרות. מחיר העלות לא מוצג ללקוחות, ומשמש לדוח המלאי השנתי.
        </p>
        <div className="rows">
          {variants.map((v, i) => (
            <div key={v._k} className="row-item variant">
              <input type="hidden" name="v_id" value={v.id} />
              <label className="field"><span>שם וריאנט (למשל: שחור 128GB)</span><input name="v_name" defaultValue={v.name} maxLength={120} /></label>
              <label className="field"><span>מק&quot;ט *</span><input name="v_sku" defaultValue={v.sku} dir="ltr" maxLength={60} /></label>
              <label className="field"><span>מחיר ₪ *</span><input name="v_price" defaultValue={v.price} inputMode="decimal" dir="ltr" /></label>
              <label className="field"><span>מחיר לפני הנחה ₪</span><input name="v_compare" defaultValue={v.compare} inputMode="decimal" dir="ltr" /></label>
              <label className="field"><span>מחיר עלות ₪</span><input name="v_cost" defaultValue={v.cost} inputMode="decimal" dir="ltr" title="כמה שילמת ליחידה. לא מוצג ללקוחות" /></label>
              <label className="field"><span>מלאי</span><input name="v_stock" type="number" min={0} defaultValue={v.stock} /></label>
              <button type="button" className="icon-btn" aria-label={`הסרת וריאנט ${i + 1}`} disabled={variants.length === 1}
                onClick={() => setVariants((arr) => arr.filter((x) => x._k !== v._k))}>✕</button>
            </div>
          ))}
        </div>
        <button type="button" className="btn btn-ghost" style={{ alignSelf: "flex-start" }} onClick={() => setVariants((a) => [...a, withKey(emptyVariant())])}>
          + הוספת וריאנט
        </button>
      </section>

      <section className="card form-section" aria-labelledby="sec-img">
        <h2 id="sec-img">תמונות (מומלץ 3-5)</h2>
        <div className="rows">
          {images.map((img, i) => (
            <div key={img._k} className="row-item image">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={img.url} alt="" />
              <input type="hidden" name="img_url" value={img.url} />
              <label className="field"><span>תיאור התמונה (לנגישות ולגוגל)</span><input name="img_alt" defaultValue={img.alt} maxLength={200} /></label>
              <span className="muted" style={{ fontSize: 13, wordBreak: "break-all" }}>{i === 0 ? "תמונה ראשית" : `תמונה ${i + 1}`}</span>
              <div style={{ display: "flex", gap: 6 }}>
                <button type="button" className="icon-btn" aria-label="הזזה למעלה" onClick={() => moveImage(i, -1)}>↑</button>
                <button type="button" className="icon-btn" aria-label="הזזה למטה" onClick={() => moveImage(i, 1)}>↓</button>
                <button type="button" className="icon-btn" aria-label="הסרת תמונה" onClick={() => setImages((a) => a.filter((x) => x._k !== img._k))}>✕</button>
              </div>
            </div>
          ))}
        </div>
        <div className="form-grid cols-2">
          <label className="field">
            <span>העלאת תמונות</span>
            <input type="file" name="newImages" multiple accept="image/jpeg,image/png,image/webp,image/gif,image/avif" style={{ paddingTop: 10 }} />
            <span className="hint">JPG / PNG / WEBP, עד 5MB לתמונה</span>
          </label>
          <label className="field">
            <span>או כתובת תמונה (https)</span>
            <input name="newImageUrl" dir="ltr" placeholder="https://..." />
          </label>
        </div>
      </section>

      <section className="card form-section" aria-labelledby="sec-spec">
        <h2 id="sec-spec">מפרט טכני</h2>
        <label className="field" style={{ maxWidth: 360 }}>
          <span>סוג מוצר (קובע את שדות המפרט והסינון)</span>
          <select name="productTypeId" value={typeId} onChange={(e) => setTypeId(e.target.value)}>
            <option value="">ללא</option>
            {types.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        </label>
        {type ? (
          <div className="form-grid cols-3">
            {type.fields.map((f) => (
              <label key={f.id} className="field">
                <span>{f.label}{f.unit ? ` (${f.unit})` : ""}</span>
                <input name={`spec_${f.id}`} defaultValue={p?.specs[f.id] ?? ""} maxLength={200} />
              </label>
            ))}
          </div>
        ) : (
          <p className="muted" style={{ margin: 0 }}>בחרו סוג מוצר כדי למלא מפרט. סוגים ושדות מגדירים במסך &quot;סוגי מוצר ומפרט&quot;.</p>
        )}
      </section>

      {accessoryOptions.length > 0 && (
        <section className="card form-section" aria-labelledby="sec-acc">
          <h2 id="sec-acc">אביזרים מתאימים</h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 8, maxHeight: 260, overflowY: "auto" }}>
            {accessoryOptions.map((a) => (
              <label key={a.id} className="check"><input type="checkbox" name="accessories" value={a.id} defaultChecked={p?.accessories.includes(a.id)} />{a.name}</label>
            ))}
          </div>
        </section>
      )}

      <section className="card form-section" aria-labelledby="sec-seo">
        <h2 id="sec-seo">קידום בגוגל (לא חובה)</h2>
        <div className="form-grid cols-2">
          <label className="field"><span>כתובת (slug)</span><input name="slug" defaultValue={p?.slug ?? ""} maxLength={120} /><span className="hint">ריק = נוצר אוטומטית מהשם</span></label>
          <label className="field"><span>כותרת לגוגל</span><input name="seoTitle" defaultValue={p?.seoTitle ?? ""} maxLength={120} /><span className="hint">ריק = שם המוצר</span></label>
          <label className="field span-all"><span>תיאור לגוגל (עד 160 תווים)</span><input name="seoDescription" defaultValue={p?.seoDescription ?? ""} maxLength={300} /></label>
        </div>
      </section>
    </ActionForm>
  );
}
