import type { Metadata } from "next";
import { Breadcrumbs } from "@/components/site/Shared";
import { getSettings } from "@/lib/settings";
import { CartView } from "./CartView";

export const metadata: Metadata = { title: "עגלת קניות", robots: { index: false, follow: false } };

export default async function CartPage() {
  const s = await getSettings();
  const free = Number(s.shipping.freeShippingFrom);
  return (
    <main className="page">
      <div className="container">
        <Breadcrumbs items={[{ name: "עגלת קניות" }]} />
        <div className="page-title">
          <h1>עגלת קניות</h1>
        </div>
        <CartView freeShippingFrom={Number.isFinite(free) && free > 0 ? free * 100 : null} />
      </div>
    </main>
  );
}
