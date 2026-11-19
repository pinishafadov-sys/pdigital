import "server-only";
import type { PurchaseOrderStatus } from "@/generated/prisma/client";
import { formatDate, formatPrice } from "@/lib/format";
import { waNumber } from "@/lib/marketing";

export const PO_STATUS: Record<PurchaseOrderStatus, { label: string; cls: string }> = {
  DRAFT: { label: "טיוטה", cls: "" },
  SENT: { label: "נשלחה לספק", cls: "blue" },
  PARTIAL: { label: "התקבלה חלקית", cls: "orange" },
  RECEIVED: { label: "התקבלה", cls: "green" },
  CANCELLED: { label: "בוטלה", cls: "pink" },
};

type Line = { qty: number; unitCost: number };

/** Order totals in agorot. Unit costs are before VAT. */
export function poTotals(items: Line[], vatRate: number) {
  const net = items.reduce((s, i) => s + i.qty * i.unitCost, 0);
  const vat = Math.round((net * vatRate) / 100);
  return { net, vat, total: net + vat, units: items.reduce((s, i) => s + i.qty, 0) };
}

type MsgOrder = {
  number: number;
  expectedAt: Date | null;
  notes: string | null;
  supplier: { name: string; contactName: string | null };
  items: { name: string; sku: string | null; qty: number; unitCost: number }[];
};

/** Plain-text order for WhatsApp / email: what to send, how many, at what price. */
export function poMessage(po: MsgOrder, businessName: string) {
  const hi = po.supplier.contactName || po.supplier.name;
  const lines = po.items.map(
    (i, n) => `${n + 1}. ${i.name}${i.sku ? ` (מק"ט ${i.sku})` : ""} - ${i.qty} יח'${i.unitCost ? ` × ₪${formatPrice(i.unitCost)}` : ""}`,
  );
  return [
    `שלום ${hi},`,
    `הזמנת רכש מס' ${po.number} מ-${businessName}:`,
    "",
    ...lines,
    "",
    po.expectedAt ? `מועד אספקה מבוקש: ${formatDate(po.expectedAt)}` : null,
    po.notes ? `הערות: ${po.notes}` : null,
    "נא לאשר קבלת ההזמנה. תודה!",
  ]
    .filter((l) => l !== null)
    .join("\n");
}

export function poWhatsappLink(phone: string | null, text: string) {
  const n = waNumber(phone);
  return n ? `https://wa.me/${n}?text=${encodeURIComponent(text)}` : null;
}

export function poMailtoLink(email: string | null, subject: string, body: string) {
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return null;
  return `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}
