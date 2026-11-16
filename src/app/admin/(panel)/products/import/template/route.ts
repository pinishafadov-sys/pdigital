import { NextResponse } from "next/server";
import { getCurrentAdmin } from "@/lib/auth/session";
import { db } from "@/lib/db";

// Example file for the product import (CSV with BOM so Hebrew opens correctly in Excel).
// The example rows use the store's real category names and are clearly marked as examples.
export async function GET() {
  const me = await getCurrentAdmin();
  if (!me || me.mustChangePassword || me.role === "EDITOR") return new NextResponse("Unauthorized", { status: 401 });
  const cat = await db.category.findFirst({ where: { parentId: null }, orderBy: { sortOrder: "asc" } });
  const catName = cat?.name ?? "[קטגוריה]";
  const header = ["מק\"ט", "שם מוצר", "קטגוריה", "תת-קטגוריה", "מותג", "וריאנט", "מחיר", "מחיר לפני הנחה", "מחיר עלות", "מלאי", "ברקוד", "תיאור קצר", "תיאור", "תגיות", "סטטוס", "תמונה", "אחריות"];
  const rows = [
    ["EX-001", "[דוגמה - למחוק] שם מוצר", catName, "", "[מותג]", "שחור", "99.90", "129.90", "50", "10", "", "תיאור קצר", "תיאור מלא", "חדש", "טיוטה", "", "12"],
    ["EX-002", "[דוגמה - למחוק] שם מוצר", catName, "", "[מותג]", "לבן", "99.90", "", "50", "5", "", "", "", "", "טיוטה", "", "12"],
  ];
  const cell = (v: string) => `"${v.replace(/"/g, '""')}"`;
  const csv = String.fromCharCode(0xfeff) + [header, ...rows].map((r) => r.map(cell).join(",")).join("\r\n");
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="pdigital-products-template.csv"',
      "Cache-Control": "no-store",
    },
  });
}
