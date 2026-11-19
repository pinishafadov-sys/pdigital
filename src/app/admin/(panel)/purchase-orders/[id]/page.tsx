import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { formatDate, formatDateTime, formatPrice, isPlaceholder, priceInput } from "@/lib/format";
import { PO_STATUS, poMailtoLink, poMessage, poTotals, poWhatsappLink } from "@/lib/purchasing";
import { getSettings, getVatRate } from "@/lib/settings";
import { AdminTop } from "../../AdminTop";
import { PrintButtons } from "../../PrintButtons";
import { ActionForm, ConfirmButton, SubmitButton } from "../../ui";
import { addPoItem, receivePurchaseOrder, savePurchaseOrder, setPoStatus } from "../actions";

export const metadata = { title: "הזמנת רכש" };

function StatusButton({ poId, to, label, cls = "btn btn-ghost" }: { poId: string; to: string; label: string; cls?: string }) {
  return (
    <form action={setPoStatus}>
      <input type="hidden" name="poId" value={poId} />
      <input type="hidden" name="to" value={to} />
      <SubmitButton label={label} className={cls} />
    </form>
  );
}

export default async function PurchaseOrderPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin("MANAGER");
  const { id } = await params;
  const po = await db.purchaseOrder.findUnique({
    where: { id },
    include: {
      supplier: true,
      createdBy: { select: { displayName: true } },
      items: { orderBy: { sortOrder: "asc" }, include: { variant: { select: { stock: true, productId: true } } } },
    },
  });
  if (!po) notFound();

  const [s, vatRate, variants] = await Promise.all([
    getSettings(),
    getVatRate(),
    db.productVariant.findMany({
      where: { isActive: true, product: { status: { not: "ARCHIVED" } } },
      select: { sku: true, name: true, product: { select: { name: true, supplierId: true } } },
      orderBy: { product: { name: "asc" } },
      take: 3000,
    }),
  ]);

  const received = po.items.some((i) => i.receivedQty > 0);
  const editable = po.status === "DRAFT" || (po.status === "SENT" && !received);
  const receiving = po.status === "SENT" || po.status === "PARTIAL";
  const t = poTotals(po.items, vatRate);
  const st = PO_STATUS[po.status];
  const sup = po.supplier;
  const bizName = isPlaceholder(s.business.legalName) ? s.business.name : s.business.legalName;
  const message = poMessage(po, s.business.name);
  const wa = poWhatsappLink(sup.whatsapp || sup.phone, message);
  const mail = poMailtoLink(sup.email, `הזמנת רכש ${po.number} - ${s.business.name}`, message);
  // Products of this supplier first in the "add product" list.
  const options = [...variants].sort(
    (a, b) => Number(b.product.supplierId === sup.id) - Number(a.product.supplierId === sup.id),
  );
  const listId = `po-products-${po.id}`;

  const readOnlyTable = (
    <table className="table">
      <thead>
        <tr><th>#</th><th>מוצר</th><th>מק&quot;ט</th><th>כמות</th>{po.status !== "DRAFT" && po.status !== "SENT" && <th>התקבל</th>}<th>מחיר ליח&apos; (לפני מע&quot;מ)</th><th>סה&quot;כ</th></tr>
      </thead>
      <tbody>
        {po.items.map((i, n) => (
          <tr key={i.id}>
            <td>{n + 1}</td>
            <td>{i.name}</td>
            <td dir="ltr">{i.sku ?? "-"}</td>
            <td>{i.qty}</td>
            {po.status !== "DRAFT" && po.status !== "SENT" && <td>{i.receivedQty}</td>}
            <td>{i.unitCost ? `₪${formatPrice(i.unitCost)}` : "-"}</td>
            <td>{i.unitCost ? `₪${formatPrice(i.qty * i.unitCost)}` : "-"}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );

  const totals = (
    <dl className="po-totals">
      <dt>סה&quot;כ יחידות</dt><dd>{t.units}</dd>
      <dt>סה&quot;כ לפני מע&quot;מ</dt><dd>₪{formatPrice(t.net)}</dd>
      <dt>מע&quot;מ ({vatRate}%)</dt><dd>₪{formatPrice(t.vat)}</dd>
      <dt><b>סה&quot;כ לתשלום</b></dt><dd><b>₪{formatPrice(t.total)}</b></dd>
    </dl>
  );

  return (
    <>
      <AdminTop
        title={`הזמנת רכש #${po.number}`}
        actions={
          <>
            {po.items.length > 0 && <PrintButtons fileTitle={`הזמנת רכש ${po.number} - ${sup.name}`} />}
            <Link href="/admin/purchase-orders" className="btn btn-ghost" style={{ minHeight: 40 }}>חזרה לרשימה</Link>
          </>
        }
      />
      <main className="admin-content report">
        <header className="print-only print-head">
          <div>
            <b>{bizName}</b>
            <span>{[s.business.phone, s.business.email].filter((x) => !isPlaceholder(x)).join(" · ")}</span>
          </div>
          <h1>הזמנת רכש מס&apos; {po.number}</h1>
          <span>תאריך: {formatDate(po.sentAt ?? po.createdAt)}{po.expectedAt ? ` · מועד אספקה מבוקש: ${formatDate(po.expectedAt)}` : ""}</span>
        </header>

        <section className="card po-head" aria-label="פרטי הספק וההזמנה">
          <div>
            <span className="muted">לכבוד</span>
            <h2 style={{ margin: "2px 0 6px" }}>{sup.name}</h2>
            <div className="po-sup">
              {sup.contactName && <span>איש קשר: {sup.contactName}</span>}
              {sup.phone && <span dir="ltr">{sup.phone}</span>}
              {sup.email && <span dir="ltr">{sup.email}</span>}
              {sup.address && <span>{sup.address}</span>}
              {sup.taxId && <span>ח.פ: {sup.taxId}</span>}
            </div>
            <Link href={`/admin/suppliers?edit=${sup.id}`} className="no-print" style={{ fontSize: 14 }}>עריכת פרטי הספק</Link>
          </div>
          <div className="no-print po-meta">
            <span className={`pill ${st.cls}`}>{st.label}</span>
            <span className="muted">נוצרה {formatDateTime(po.createdAt)}{po.createdBy ? ` ע"י ${po.createdBy.displayName}` : ""}</span>
            {po.sentAt && <span className="muted">נשלחה {formatDateTime(po.sentAt)}</span>}
            {po.receivedAt && <span className="muted">קבלה אחרונה {formatDateTime(po.receivedAt)}</span>}
          </div>
        </section>

        {/* ---------- send to supplier */}
        {(po.status === "DRAFT" || po.status === "SENT") && po.items.length > 0 && (
          <section className="card no-print" aria-labelledby="send">
            <h2 id="send">{po.status === "DRAFT" ? "שליחה לספק" : "שליחה חוזרת לספק"}</h2>
            <div className="toolbar-row">
              {wa ? (
                <a href={wa} target="_blank" rel="noopener noreferrer" className="btn btn-whatsapp">שליחה בוואטסאפ</a>
              ) : null}
              {mail ? <a href={mail} className="btn btn-ghost">שליחה במייל</a> : null}
              {po.status === "DRAFT" && <StatusButton poId={po.id} to="SENT" label="סימון: ההזמנה נשלחה ✓" cls="btn btn-primary" />}
            </div>
            {!wa && !mail && (
              <p className="warn" style={{ marginBottom: 0 }}>
                לספק אין וואטסאפ, טלפון נייד או מייל. <Link href={`/admin/suppliers?edit=${sup.id}`}>הוספת פרטים ←</Link> אפשר גם להוריד PDF ולשלוח אותו.
              </p>
            )}
            <p className="help" style={{ marginBottom: 0 }}>
              הכפתור פותח וואטסאפ / מייל עם ההזמנה כתובה ומוכנה, רק ללחוץ &quot;שלח&quot;. אפשר גם להוריד PDF (למעלה) ולצרף אותו.
              {po.status === "DRAFT" && " אחרי השליחה לחצו \"ההזמנה נשלחה\", כדי שתוכלו לקלוט את הסחורה כשהיא מגיעה."}
            </p>
          </section>
        )}

        {/* ---------- items */}
        <section className="card table-wrap" aria-labelledby="items">
          <h2 id="items" className="no-print">מוצרים בהזמנה ({po.items.length})</h2>
          {editable ? (
            <>
              {po.items.length > 0 ? (
                <ActionForm action={savePurchaseOrder} submitLabel="שמירת שינויים" className="form-section no-print">
                  <input type="hidden" name="poId" value={po.id} />
                  <table className="table">
                    <thead>
                      <tr><th>מוצר</th><th>במלאי עכשיו</th><th>כמות</th><th>מחיר ליח&apos; ₪ (לפני מע&quot;מ)</th><th>סה&quot;כ</th><th>הסרה</th></tr>
                    </thead>
                    <tbody>
                      {po.items.map((i) => (
                        <tr key={i.id}>
                          <td>{i.name}<div className="muted" dir="ltr" style={{ fontSize: 12 }}>{i.sku}</div></td>
                          <td>{i.variant?.stock ?? "-"}</td>
                          <td><input className="po-input" name={`qty_${i.id}`} type="number" min={0} max={100000} defaultValue={i.qty} aria-label={`כמות - ${i.name}`} /></td>
                          <td><input className="po-input" name={`cost_${i.id}`} inputMode="decimal" defaultValue={priceInput(i.unitCost || null)} placeholder="0.00" aria-label={`מחיר ליחידה - ${i.name}`} /></td>
                          <td>₪{formatPrice(i.qty * i.unitCost)}</td>
                          <td><input type="checkbox" name={`remove_${i.id}`} aria-label={`הסרת ${i.name}`} /></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <div className="form-grid cols-3">
                    <label className="field">
                      <span>מועד אספקה מבוקש</span>
                      <input type="date" name="expectedAt" defaultValue={po.expectedAt ? po.expectedAt.toISOString().slice(0, 10) : ""} />
                    </label>
                    <label className="field" style={{ gridColumn: "span 2" }}>
                      <span>הערות לספק</span>
                      <textarea name="notes" rows={2} maxLength={2000} defaultValue={po.notes ?? ""} />
                    </label>
                  </div>
                </ActionForm>
              ) : (
                <p className="muted no-print">ההזמנה ריקה. הוסיפו מוצרים למטה.</p>
              )}
              <div className="print-only po-print-table">{readOnlyTable}</div>

              <div className="no-print po-add">
                <h3>הוספת מוצר</h3>
                <ActionForm action={addPoItem} submitLabel="הוספה להזמנה" resetOnSuccess>
                  <input type="hidden" name="poId" value={po.id} />
                  <div className="form-grid cols-3">
                    <label className="field" style={{ gridColumn: "span 2" }}>
                      <span>מוצר (שם, מק&quot;ט או ברקוד)</span>
                      <input name="product" list={listId} required autoComplete="off" placeholder="התחילו להקליד..." />
                      <datalist id={listId}>
                        {options.map((v) => (
                          <option key={v.sku} value={`${v.sku} | ${v.name ? `${v.product.name} - ${v.name}` : v.product.name}`} />
                        ))}
                      </datalist>
                      <span className="hint">מוצרים של הספק הזה מופיעים ראשונים</span>
                    </label>
                    <label className="field">
                      <span>כמות</span>
                      <input name="qty" type="number" min={1} max={100000} defaultValue={1} required />
                    </label>
                    <label className="field">
                      <span>מחיר ליח&apos; ₪ (לפני מע&quot;מ)</span>
                      <input name="cost" inputMode="decimal" placeholder="ריק = מחיר העלות של המוצר" />
                    </label>
                  </div>
                </ActionForm>
              </div>
            </>
          ) : (
            readOnlyTable
          )}
          {po.items.length > 0 && totals}
          {po.notes && !editable && <p><b>הערות:</b> {po.notes}</p>}
          {po.notes && editable && <p className="print-only"><b>הערות:</b> {po.notes}</p>}
        </section>

        {/* ---------- receive goods */}
        {receiving && (
          <section className="card table-wrap no-print" aria-labelledby="receive">
            <h2 id="receive">הסחורה הגיעה? קליטה למלאי</h2>
            <p className="help">
              רשמו כמה הגיע מכל מוצר (מולא מראש מה שעוד חסר). הכמויות יתווספו למלאי באתר מיד, ויופיעו בהיסטוריית המלאי
              כ&quot;הגיעה סחורה - הזמנת רכש #{po.number}&quot;. אם הגיע רק חלק, ההזמנה תישאר פתוחה לשאר.
            </p>
            <ActionForm action={receivePurchaseOrder} submitLabel="קליטה למלאי">
              <input type="hidden" name="poId" value={po.id} />
              <table className="table">
                <thead><tr><th>מוצר</th><th>הוזמן</th><th>התקבל עד עכשיו</th><th>הגיע עכשיו</th></tr></thead>
                <tbody>
                  {po.items.map((i) => {
                    const left = Math.max(0, i.qty - i.receivedQty);
                    return (
                      <tr key={i.id}>
                        <td>{i.name}</td>
                        <td>{i.qty}</td>
                        <td>{i.receivedQty}</td>
                        <td>
                          {i.variantId ? (
                            <input className="po-input" name={`recv_${i.id}`} type="number" min={0} max={100000} defaultValue={left} aria-label={`הגיע עכשיו - ${i.name}`} />
                          ) : (
                            <span className="muted">המוצר נמחק</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              <label className="check">
                <input type="checkbox" name="updateCost" defaultChecked />
                לעדכן את מחיר העלות של המוצרים לפי המחיר בהזמנה (לדוח המלאי)
              </label>
            </ActionForm>
          </section>
        )}

        {/* ---------- other actions */}
        <section className="no-print toolbar-row" aria-label="פעולות נוספות">
          {po.status === "SENT" && !received && <StatusButton poId={po.id} to="DRAFT" label="החזרה לטיוטה" />}
          {po.status === "PARTIAL" && <StatusButton poId={po.id} to="CLOSE" label="סגירת ההזמנה (השאר לא יגיע)" />}
          {(po.status === "DRAFT" || po.status === "SENT") && !received && (
            <ConfirmButton action={setPoStatus} hidden={{ poId: po.id, to: "CANCELLED" }} label="ביטול ההזמנה" confirmText={`לבטל את הזמנת הרכש #${po.number}?`} />
          )}
          {po.status === "DRAFT" && (
            <ConfirmButton action={setPoStatus} hidden={{ poId: po.id, to: "DELETE" }} label="מחיקת הטיוטה" confirmText={`למחוק לגמרי את הטיוטה #${po.number}?`} />
          )}
        </section>
      </main>
    </>
  );
}
