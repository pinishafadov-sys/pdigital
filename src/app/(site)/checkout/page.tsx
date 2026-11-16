import type { Metadata } from "next";
import { Breadcrumbs } from "@/components/site/Shared";
import { CheckoutForm } from "./CheckoutForm";

export const metadata: Metadata = { title: "קופה", robots: { index: false, follow: false } };

export default function CheckoutPage() {
  return (
    <main className="page">
      <div className="container">
        <Breadcrumbs items={[{ name: "עגלת קניות", href: "/cart" }, { name: "קופה" }]} />
        <div className="page-title">
          <h1>קופה</h1>
        </div>
        <CheckoutForm />
      </div>
    </main>
  );
}
