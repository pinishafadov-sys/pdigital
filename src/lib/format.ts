const wholeFmt = new Intl.NumberFormat("he-IL", { maximumFractionDigits: 0 });
const centsFmt = new Intl.NumberFormat("he-IL", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** 4990 agorot -> "49.90", 5000 -> "50" (whole shekels without ".00", like price tags in shops) */
export function formatPrice(agorot: number) {
  return agorot % 100 === 0 ? wholeFmt.format(agorot / 100) : centsFmt.format(agorot / 100);
}

/** agorot -> value for a price <input> ("49.90") */
export function priceInput(agorot: number | null | undefined) {
  return agorot == null ? "" : (agorot / 100).toFixed(2).replace(/\.00$/, "");
}

export function discountPercent(price: number, compareAt: number | null | undefined) {
  if (!compareAt || compareAt <= price) return null;
  return Math.round(((compareAt - price) / compareAt) * 100);
}

const dateFmt = new Intl.DateTimeFormat("he-IL", { dateStyle: "medium" });
const dateTimeFmt = new Intl.DateTimeFormat("he-IL", { dateStyle: "short", timeStyle: "short" });

export const formatDate = (d: Date) => dateFmt.format(d);
export const formatDateTime = (d: Date) => dateTimeFmt.format(d);

/** Is a value a "[placeholder]" that still waits for the owner's input? */
export const isPlaceholder = (v: string | null | undefined) => !v || /^\[.*\]$/.test(v.trim());
