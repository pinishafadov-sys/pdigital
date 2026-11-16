import { NextResponse, type NextRequest } from "next/server";
import { audit, getCurrentAdmin } from "@/lib/auth/session";
import { marketingList, waNumber } from "@/lib/marketing";

// vCard file: opening it on a phone adds all listed customers to the contacts at once,
// ready for a WhatsApp Business broadcast list.
const esc = (s: string) => s.replace(/\\/g, "\\\\").replace(/[,;]/g, (c) => `\\${c}`).replace(/\r?\n/g, " ");

export async function GET(req: NextRequest) {
  const me = await getCurrentAdmin();
  if (!me || me.mustChangePassword || (me.role !== "OWNER" && me.role !== "MANAGER")) return new NextResponse("Unauthorized", { status: 401 });
  const p = req.nextUrl.searchParams;
  const { customers } = await marketingList({ q: p.get("q") ?? "", cat: p.get("cat") ?? "", days: p.get("days") ?? "" }, 20000);
  const cards = customers
    .map((c) => {
      const wa = waNumber(c.phone);
      if (!wa) return null;
      const first = c.firstName === "-" ? "" : c.firstName;
      const last = c.lastName === "-" ? "" : c.lastName;
      const full = `${first} ${last}`.trim() || c.email;
      return [
        "BEGIN:VCARD",
        "VERSION:3.0",
        `N:${esc(last)};${esc(first)};;;`,
        `FN:${esc(`${full} (pdigital)`)}`,
        `TEL;TYPE=CELL:+${wa}`,
        `EMAIL:${esc(c.email)}`,
        "ORG:לקוחות pdigital",
        "END:VCARD",
      ].join("\r\n");
    })
    .filter(Boolean);
  await audit(me.id, "marketing_contacts_exported", "Customer", String(cards.length));
  return new NextResponse(cards.join("\r\n") + "\r\n", {
    headers: {
      "Content-Type": "text/vcard; charset=utf-8",
      "Content-Disposition": 'attachment; filename="pdigital-customers.vcf"',
      "Cache-Control": "no-store",
    },
  });
}
