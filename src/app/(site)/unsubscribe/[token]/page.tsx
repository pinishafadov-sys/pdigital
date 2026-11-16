import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { unsubscribeByTokenAction } from "./actions";

export const metadata: Metadata = { title: "הסרה מרשימת התפוצה", robots: { index: false, follow: false }, referrer: "no-referrer" };

// Opening the link only shows a button; the removal happens on click
// (so email security scanners that "open" links can't remove people by accident).
export default async function UnsubscribePage({ params, searchParams }: { params: Promise<{ token: string }>; searchParams: Promise<{ done?: string }> }) {
  const { token } = await params;
  const { done } = await searchParams;
  if (!/^[a-z0-9]{20,40}$/.test(token)) notFound();
  const c = await db.customer.findUnique({ where: { unsubToken: token }, select: { email: true, unsubscribedAt: true } });
  if (!c) notFound();
  const removed = done || c.unsubscribedAt;

  return (
    <main className="page">
      <div className="container" style={{ maxWidth: 560 }}>
        <section className="panel prose-panel" style={{ textAlign: "center" }}>
          {removed ? (
            <>
              <h1 style={{ marginTop: 0 }}>הוסרת מרשימת התפוצה</h1>
              <p>
                לא נשלח יותר מבצעים ל-<span dir="ltr">{c.email}</span>. הודעות על הזמנות שתבצעו ימשיכו להגיע כרגיל.
              </p>
            </>
          ) : (
            <>
              <h1 style={{ marginTop: 0 }}>הסרה מרשימת התפוצה</h1>
              <p>
                להסיר את <span dir="ltr">{c.email}</span> מקבלת מבצעים והטבות של pdigital?
              </p>
              <form action={unsubscribeByTokenAction}>
                <input type="hidden" name="token" value={token} />
                <button type="submit" className="btn btn-primary btn-lg">כן, הסירו אותי</button>
              </form>
            </>
          )}
          <p style={{ marginTop: 20 }}>
            <Link href="/" style={{ color: "var(--brand-purple)" }}>חזרה לחנות</Link>
          </p>
        </section>
      </div>
    </main>
  );
}
