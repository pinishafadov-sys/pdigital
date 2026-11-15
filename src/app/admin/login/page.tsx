import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Logo } from "@/components/Logo";
import { getCurrentAdmin } from "@/lib/auth/session";
import { LoginForm } from "./LoginForm";
import "../admin.css";

export const metadata: Metadata = { title: "כניסה למערכת הניהול", robots: { index: false, follow: false } };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ reset?: string }> }) {
  if (await getCurrentAdmin()) redirect("/admin");
  const { reset } = await searchParams;
  return (
    <div className="login-page">
      <main className="login-card">
        <div className="login-head">
          <Logo size="lg" showSlogan={false} />
          <h1>כניסה למערכת הניהול</h1>
          <p>גישה למורשים בלבד</p>
        </div>
        {reset && <p className="form-ok">הסיסמה עודכנה. אפשר להיכנס עם הסיסמה החדשה.</p>}
        <LoginForm />
        <Link href="/admin/forgot" style={{ color: "var(--brand-purple)", fontWeight: 500, textAlign: "center" }}>
          שכחתי סיסמה
        </Link>
        <p className="login-foot">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z" />
          </svg>
          החיבור מוצפן. ניסיונות כניסה נרשמים.
        </p>
      </main>
      <Link href="/" className="login-back">
        ← חזרה לאתר
      </Link>
    </div>
  );
}
