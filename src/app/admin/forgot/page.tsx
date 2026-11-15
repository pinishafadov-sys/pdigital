import type { Metadata } from "next";
import Link from "next/link";
import { Logo } from "@/components/Logo";
import { ForgotForm } from "./ForgotForm";
import "../admin.css";

export const metadata: Metadata = { title: "שכחתי סיסמה", robots: { index: false, follow: false } };

export default function ForgotPage() {
  return (
    <div className="login-page">
      <main className="login-card">
        <div className="login-head">
          <Logo size="lg" showSlogan={false} />
          <h1>שכחתי סיסמה</h1>
          <p>הזינו שם משתמש או מייל, ונשלח קישור לבחירת סיסמה חדשה.</p>
        </div>
        <ForgotForm />
      </main>
      <Link href="/admin/login" className="login-back">
        ← חזרה לכניסה
      </Link>
    </div>
  );
}
