import { NextResponse, type NextRequest } from "next/server";
import { audit, getCurrentAdmin } from "@/lib/auth/session";
import { endOfDayIsrael, inventoryAt } from "@/lib/inventory-report";

// Excel-friendly CSV (UTF-8 with BOM so Hebrew opens correctly in Excel).
const money = (agorot: number | null) => (agorot == null ? "" : (agorot / 100).toFixed(2));

/** Quote a CSV cell and neutralise spreadsheet formulas (cells starting with = + - @). */
function cell(v: string | number | null) {
  let s = v == null ? "" : String(v);
  if (typeof v === "string" && /^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return `"${s.replace(/"/g, '""')}"`;
}

export async function GET(req: NextRequest) {
  const me = await getCurrentAdmin();
  if (!me || me.mustChangePassword || (me.role !== "OWNER" && me.role !== "MANAGER")) {
    return new NextResponse("Unauthorized", { status: 401 });
  }
  const date = req.nextUrl.searchParams.get("date") ?? "";
  const at = endOfDayIsrael(date);
  if (!at) return new NextResponse("Bad date", { status: 400 });

  const { rows, totalQty, totalValue } = await inventoryAt(at);
  const [y, m, d] = date.split("-");
  const lines = [
    [`דוח מלאי נכון לסוף יום ${d}.${m}.${y}`],
    [],
    ["מק\"ט", "ברקוד", "מוצר", "וריאנט", "קטגוריה", "כמות", "עלות ליחידה לפני מע\"מ (₪)", "שווי לפי עלות לפני מע\"מ (₪)", "מחיר מכירה נוכחי כולל מע\"מ (₪)"],
    ...rows.map((r) => [r.sku, r.barcode ?? "", r.product, r.variant ?? "", r.category, r.qty, money(r.cost), money(r.value), money(r.price)]),
    [],
    ["סה\"כ", "", "", "", "", totalQty, "", money(totalValue), ""],
  ];
  const csv = String.fromCharCode(0xfeff) + lines.map((l) => l.map(cell).join(",")).join("\r\n");
  await audit(me.id, "stock_report_exported", "Report", date);

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="stock-report-${date}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
