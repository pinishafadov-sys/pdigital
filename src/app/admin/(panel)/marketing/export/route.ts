import { NextResponse, type NextRequest } from "next/server";
import { audit, getCurrentAdmin } from "@/lib/auth/session";
import { marketingList } from "@/lib/marketing";

const cell = (v: string) => {
  const s = /^[=+\-@\t\r]/.test(v) ? `'${v}` : v;
  return `"${s.replace(/"/g, '""')}"`;
};

export async function GET(req: NextRequest) {
  const me = await getCurrentAdmin();
  if (!me || me.mustChangePassword || (me.role !== "OWNER" && me.role !== "MANAGER")) return new NextResponse("Unauthorized", { status: 401 });
  const p = req.nextUrl.searchParams;
  const { customers } = await marketingList({ q: p.get("q") ?? "", cat: p.get("cat") ?? "", days: p.get("days") ?? "" }, 20000);
  const lines = [
    ["שם פרטי", "שם משפחה", "טלפון", "מייל", "תאריך הסכמה", "מקור"],
    ...customers.map((c) => [c.firstName, c.lastName, c.phone ?? "", c.email, c.consentAt?.toISOString().slice(0, 10) ?? "", c.consentSource ?? ""]),
  ];
  await audit(me.id, "marketing_exported", "Customer", String(customers.length));
  const csv = String.fromCharCode(0xfeff) + lines.map((l) => l.map(cell).join(",")).join("\r\n");
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="pdigital-marketing-list.csv"',
      "Cache-Control": "no-store",
    },
  });
}
