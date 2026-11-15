import Link from "next/link";
import { LogoMark } from "@/components/Logo";

export default function NotFound() {
  return (
    <main className="page">
      <div className="container panel empty" style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
        <LogoMark size={80} />
        <h1 style={{ margin: 0, color: "var(--text-primary)" }}>הדף לא נמצא</h1>
        <p style={{ margin: 0 }}>ייתכן שהקישור שגוי או שהמוצר כבר לא זמין.</p>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "center" }}>
          <Link href="/" className="btn btn-primary">לדף הבית</Link>
          <Link href="/site-map" className="btn btn-ghost">מפת האתר</Link>
        </div>
      </div>
    </main>
  );
}
