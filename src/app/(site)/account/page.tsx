import type { Metadata } from "next";
import { Breadcrumbs } from "@/components/site/Shared";

export const metadata: Metadata = { title: "החשבון שלי", robots: { index: false, follow: false } };

export default function AccountPage() {
  return (
    <main className="page">
      <div className="container">
        <Breadcrumbs items={[{ name: "התחברות" }]} />
        <div className="panel prose-panel">
          <h1 style={{ marginTop: 0 }}>התחברות והרשמה למועדון</h1>
          <p>[התחברות לקוחות והצטרפות למועדון ייפתחו בשלב העגלה והתשלום]</p>
        </div>
      </div>
    </main>
  );
}
