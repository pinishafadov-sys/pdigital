import type { Metadata } from "next";
import Link from "next/link";
import { Logo } from "@/components/Logo";
import { isResetTokenValid } from "../reset-actions";
import { ResetForm } from "./ResetForm";
import "../admin.css";

export const metadata: Metadata = {
  title: "בחירת סיסמה חדשה",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

export default async function ResetPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token = "" } = await searchParams;
  const valid = await isResetTokenValid(token);
  return (
    <div className="login-page">
      <main className="login-card">
        <div className="login-head">
          <Logo size="lg" showSlogan={false} />
          <h1>בחירת סיסמה חדשה</h1>
        </div>
        {valid ? (
          <ResetForm token={token} />
        ) : (
          <>
            <p className="form-error">הקישור לא תקף, כבר נוצל, או שפג תוקפו.</p>
            <Link href="/admin/forgot" className="btn btn-primary btn-lg">
              בקשת קישור חדש
            </Link>
          </>
        )}
      </main>
      <Link href="/admin/login" className="login-back">
        ← חזרה לכניסה
      </Link>
    </div>
  );
}
