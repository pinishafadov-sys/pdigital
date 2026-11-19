"use client";

import { useActionState, useState } from "react";
import { stockAction } from "../products/actions";

const KINDS = [
  { value: "STORE_SALE", label: "נמכר בחנות", sign: "−" },
  { value: "RESTOCK", label: "הגיעה סחורה", sign: "+" },
  { value: "RETURN", label: "החזרה", sign: "+" },
  { value: "COUNT", label: "ספירה (כמות מדויקת)", sign: "=" },
];

export function StockRow({
  variantId, title, sku, stock, low, price,
}: { variantId: string; title: string; sku: string; stock: number; low: number; price: string }) {
  const [state, action, pending] = useActionState(stockAction, undefined);
  const [kind, setKind] = useState("STORE_SALE");
  const cls = stock <= 0 ? "pink" : stock <= low ? "orange" : "green";
  return (
    <form action={action} className="stock-row">
      <input type="hidden" name="variantId" value={variantId} />
      <div className="stock-info">
        <b>{title}</b>
        <span className="muted" dir="ltr">{sku}</span>
      </div>
      <span className={`pill ${cls}`} aria-label={`במלאי ${stock}`}>
        {stock <= 0 ? "אזל" : `במלאי: ${stock}`}
      </span>
      <div className="stock-controls">
        <select name="kind" value={kind} onChange={(e) => setKind(e.target.value)} className="input" aria-label="סוג פעולה">
          {KINDS.map((k) => (
            <option key={k.value} value={k.value}>
              {k.sign} {k.label}
            </option>
          ))}
        </select>
        <input name="qty" type="number" min={kind === "COUNT" ? 0 : 1} defaultValue={kind === "COUNT" ? stock : 1} key={`qty-${kind}`}
          className="input" style={{ width: 80 }} aria-label="כמות" inputMode="numeric" />
        {(kind === "STORE_SALE" || kind === "RETURN") && (
          <label className="stock-price" key={`price-${kind}`}>
            <span>{kind === "RETURN" ? "₪ הוחזר ליח'" : "₪ ליח'"}</span>
            <input name="price" className="input" defaultValue={price} inputMode="decimal" style={{ width: 90 }}
              aria-label={kind === "RETURN" ? "סכום שהוחזר ללקוח ליחידה, כולל מע״מ" : "מחיר ליחידה שנגבה בפועל, כולל מע״מ"}
              title={kind === "RETURN" ? "כמה כסף הוחזר ללקוח ליחידה (0 אם הוחלף במוצר אחר)" : "המחיר שנגבה בפועל ליחידה (כולל מע״מ). מולא מראש המחיר באתר"} />
          </label>
        )}
        <input name="note" className="input" placeholder="הערה (לא חובה)" maxLength={200} aria-label="הערה" />
        <button type="submit" className="btn btn-primary" disabled={pending}>
          {pending ? "..." : "עדכון"}
        </button>
      </div>
      <span role="status" aria-live="polite" className="stock-msg">
        {state?.error && <span className="form-error">{state.error}</span>}
        {state?.ok && <span className="form-ok">{state.message}</span>}
      </span>
    </form>
  );
}
