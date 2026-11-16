"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useActionState, useEffect, useMemo, useState, useTransition } from "react";
import { clearCart, setQty, useCart } from "@/lib/cart";
import { formatPrice } from "@/lib/format";
import { placeOrderAction, previewCartAction } from "./actions";

type Preview = Awaited<ReturnType<typeof previewCartAction>>;

export function CheckoutForm() {
  const cart = useCart();
  const router = useRouter();
  const [preview, setPreview] = useState<Preview | null>(null);
  const [, startPreview] = useTransition();
  const [method, setMethod] = useState<"delivery" | "pickup">("delivery");
  const [business, setBusiness] = useState(false);
  const [state, action, pending] = useActionState(placeOrderAction, undefined);
  const lines = useMemo(() => cart.map((c) => ({ variantId: c.variantId, qty: c.qty })), [cart]);
  const cartKey = JSON.stringify(lines);

  // Live prices and stock from the server, and keep the browser cart in sync with them.
  useEffect(() => {
    if (!lines.length) return;
    startPreview(async () => {
      const p = await previewCartAction(lines);
      setPreview(p);
      for (const l of lines) {
        const item = p.items.find((i) => i.variantId === l.variantId);
        if (!item) setQty(l.variantId, 0);
        else if (item.quantity !== l.qty) setQty(l.variantId, item.quantity);
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- re-run only when the cart contents change
  }, [cartKey]);

  useEffect(() => {
    if (state?.ok) {
      clearCart();
      router.push(`/order/${state.token}`);
    }
  }, [state, router]);

  if (!cart.length && !state?.ok) {
    return (
      <div className="panel empty">
        <p>העגלה ריקה.</p>
        <Link href="/" className="btn btn-primary">להתחיל לקנות</Link>
      </div>
    );
  }

  const f = state && !state.ok ? state.fields : undefined;
  const subtotal = preview?.subtotal ?? 0;
  const ship = method === "pickup" ? 0 : (preview?.delivery ?? 0);
  const problems = [...(preview?.problems ?? []), ...(state && !state.ok ? state.problems ?? [] : [])];

  return (
    <form action={action} className="checkout-layout" noValidate>
      <input type="hidden" name="cart" value={cartKey} />
      <input type="hidden" name="method" value={method} />

      <div className="checkout-main">
        <section className="panel checkout-card" aria-labelledby="c-details">
          <h2 id="c-details">1. פרטים</h2>
          <p className="muted" style={{ marginTop: -6 }}>לא צריך להירשם כדי לקנות.</p>
          <div className="checkout-grid">
            <Field name="firstName" label="שם פרטי" auto="given-name" def={f?.firstName} />
            <Field name="lastName" label="שם משפחה" auto="family-name" def={f?.lastName} />
            <Field name="phone" label="טלפון" auto="tel" type="tel" def={f?.phone} ltr />
            <Field name="email" label="אימייל (לשם תישלח החשבונית)" auto="email" type="email" def={f?.email} ltr />
          </div>
        </section>

        <section className="panel checkout-card" aria-labelledby="c-ship">
          <h2 id="c-ship">2. משלוח</h2>
          <div className="ship-options" role="radiogroup" aria-label="שיטת משלוח">
            <label className={`ship-option ${method === "delivery" ? "on" : ""}`}>
              <input type="radio" name="_m" checked={method === "delivery"} onChange={() => setMethod("delivery")} />
              <span>
                <b>משלוח עד הבית</b>
                <span className="muted">
                  {preview == null
                    ? "..."
                    : preview.delivery === 0 && preview.deliveryPriceSet
                      ? "חינם"
                      : preview.deliveryPriceSet
                        ? `₪${formatPrice(preview.delivery)}`
                        : "[מחיר משלוח]"}
                  {preview?.freeFrom != null && preview.delivery > 0 && ` · חינם מעל ₪${formatPrice(preview.freeFrom)}`}
                </span>
              </span>
            </label>
            {preview?.pickup.enabled !== false && (
              <label className={`ship-option ${method === "pickup" ? "on" : ""}`}>
                <input type="radio" name="_m" checked={method === "pickup"} onChange={() => setMethod("pickup")} />
                <span>
                  <b>איסוף עצמי מהחנות</b>
                  <span className="muted">חינם · {preview?.pickup.address ?? ""}</span>
                </span>
              </label>
            )}
          </div>
          {method === "delivery" && (
            <div className="checkout-grid" style={{ marginTop: 14 }}>
              <Field name="city" label="עיר" auto="address-level2" def={f?.city} />
              <Field name="street" label="רחוב" auto="address-line1" def={f?.street} />
              <Field name="houseNumber" label="מספר בית" def={f?.houseNumber} short />
              <Field name="apartment" label="דירה / קומה" def={f?.apartment} short optional />
            </div>
          )}
          <label className="checkout-field" style={{ marginTop: 12 }}>
            <span>הערות להזמנה (לא חובה)</span>
            <textarea name="notes" maxLength={500} rows={2} defaultValue={f?.notes} className="input" />
          </label>
        </section>

        <section className="panel checkout-card" aria-labelledby="c-more">
          <h2 id="c-more">3. אפשרויות נוספות</h2>
          <label className="check-line">
            <input type="checkbox" checked={business} onChange={(e) => setBusiness(e.target.checked)} />
            אני צריך חשבונית על שם עסק
          </label>
          {business && (
            <div className="checkout-grid" style={{ marginTop: 10 }}>
              <Field name="companyName" label="שם העסק" def={f?.companyName} />
              <Field name="companyTaxId" label="ח.פ / ע.מ" def={f?.companyTaxId} ltr />
            </div>
          )}
          <label className="check-line">
            <input type="checkbox" name="saveDetails" />
            שמרו את הפרטים שלי לקנייה הבאה (לא חובה)
          </label>
          <label className="check-line">
            <input type="checkbox" name="marketing" />
            אשמח לקבל מבצעים והטבות של מועדון pdigital בוואטסאפ, SMS ומייל (לא חובה, אפשר להסיר בכל עת)
          </label>
          <label className="visually-hidden" aria-hidden="true">
            אתר
            <input name="website" tabIndex={-1} autoComplete="off" />
          </label>
        </section>
      </div>

      <aside className="panel checkout-summary" aria-labelledby="c-sum">
        <h2 id="c-sum">סיכום הזמנה</h2>
        <ul className="sum-lines">
          {(preview?.items ?? []).map((i) => (
            <li key={i.variantId}>
              <span>
                {i.productName}
                {i.variantName ? ` (${i.variantName})` : ""} × {i.quantity}
              </span>
              <b>₪{formatPrice(i.lineTotal)}</b>
            </li>
          ))}
        </ul>
        <div className="sum-row"><span>מוצרים</span><span>₪{formatPrice(subtotal)}</span></div>
        <div className="sum-row">
          <span>משלוח</span>
          <span>{method === "delivery" && preview && !preview.deliveryPriceSet ? "[מחיר משלוח]" : ship === 0 ? "חינם" : `₪${formatPrice(ship)}`}</span>
        </div>
        <div className="sum-row total"><span>לתשלום</span><span>₪{formatPrice(subtotal + ship)}</span></div>

        {problems.length > 0 && (
          <div className="notice" role="alert">
            {problems.map((p) => <div key={p}>{p}</div>)}
          </div>
        )}
        {state && !state.ok && state.error && <p className="contact-error" role="alert">{state.error}</p>}

        <label className="check-line">
          <input type="checkbox" name="terms" required />
          <span>
            קראתי ואני מסכים/ה ל<Link href="/pages/terms" target="_blank">תקנון</Link> ול<Link href="/pages/privacy" target="_blank">מדיניות הפרטיות</Link>
          </span>
        </label>
        <button type="submit" className="btn btn-primary btn-lg btn-block" disabled={pending || !preview?.items.length}>
          {pending ? "שולח..." : "ביצוע הזמנה"}
        </button>
        <p className="muted" style={{ fontSize: 13, margin: 0 }}>
          [התשלום המאובטח יחובר כשייבחר סולק. עד אז ההזמנה נשמרת כ&quot;ממתינה לתשלום&quot; ונחזור אליכם לתשלום]
        </p>
      </aside>
    </form>
  );
}

function Field(p: { name: string; label: string; def?: string; auto?: string; type?: string; ltr?: boolean; short?: boolean; optional?: boolean }) {
  return (
    <label className={`checkout-field ${p.short ? "short" : ""}`}>
      <span>
        {p.label}
        {!p.optional && <span aria-hidden="true"> *</span>}
      </span>
      <input
        name={p.name}
        type={p.type ?? "text"}
        defaultValue={p.def}
        autoComplete={p.auto}
        dir={p.ltr ? "ltr" : undefined}
        required={!p.optional}
        maxLength={120}
        className="input"
      />
    </label>
  );
}
