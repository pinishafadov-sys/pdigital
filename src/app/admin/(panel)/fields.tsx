// Plain server-renderable form fields for admin screens.
type Base = { name: string; label: string; hint?: string; className?: string };

export function Text({
  name, label, hint, className, defaultValue, type = "text", required, dir, placeholder, maxLength = 500,
}: Base & { defaultValue?: string | number | null; type?: string; required?: boolean; dir?: "ltr" | "rtl"; placeholder?: string; maxLength?: number }) {
  return (
    <label className={`field ${className ?? ""}`}>
      <span>
        {label}
        {required && <span aria-hidden="true"> *</span>}
      </span>
      <input name={name} type={type} defaultValue={defaultValue ?? ""} required={required} dir={dir} placeholder={placeholder} maxLength={maxLength} />
      {hint && <span className="hint">{hint}</span>}
    </label>
  );
}

export function Area({ name, label, hint, className, defaultValue, rows = 6, maxLength = 20000 }: Base & { defaultValue?: string | null; rows?: number; maxLength?: number }) {
  return (
    <label className={`field ${className ?? ""}`}>
      <span>{label}</span>
      <textarea name={name} defaultValue={defaultValue ?? ""} rows={rows} maxLength={maxLength} />
      {hint && <span className="hint">{hint}</span>}
    </label>
  );
}

export function Select({
  name, label, hint, className, defaultValue, options, emptyLabel,
}: Base & { defaultValue?: string | null; options: { value: string; label: string }[]; emptyLabel?: string }) {
  return (
    <label className={`field ${className ?? ""}`}>
      <span>{label}</span>
      <select name={name} defaultValue={defaultValue ?? ""}>
        {emptyLabel !== undefined && <option value="">{emptyLabel}</option>}
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      {hint && <span className="hint">{hint}</span>}
    </label>
  );
}

export function Check({ name, label, defaultChecked, value }: { name: string; label: string; defaultChecked?: boolean; value?: string }) {
  return (
    <label className="check">
      <input type="checkbox" name={name} defaultChecked={defaultChecked} value={value ?? "on"} />
      {label}
    </label>
  );
}

export function ImageInput({ name, label, current }: { name: string; label: string; current?: string | null }) {
  return (
    <div className="field">
      <span>{label}</span>
      {current && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={current} alt="" style={{ width: 120, height: 80, objectFit: "cover", borderRadius: 8 }} />
      )}
      <input type="file" name={name} accept="image/jpeg,image/png,image/webp,image/gif,image/avif" style={{ paddingTop: 10 }} />
      <span className="hint">JPG / PNG / WEBP עד 5MB{current ? ". השאירו ריק כדי לשמור את התמונה הנוכחית" : ""}</span>
    </div>
  );
}

export const RICH_HINT = "עיצוב פשוט: שורה ריקה = פסקה חדשה · ## כותרת · - פריט ברשימה · **מודגש** · [טקסט](כתובת)";
