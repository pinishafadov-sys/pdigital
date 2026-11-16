import Link from "next/link";
import { requireAdmin } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { formatDateTime } from "@/lib/format";
import { whatsappLink } from "@/lib/settings";
import type { ContactStatus, Prisma } from "@/generated/prisma/client";
import { AdminTop } from "../AdminTop";
import { ActionForm } from "../ui";
import { updateMessage } from "./actions";

export const metadata = { title: "לקוחות יוצרים קשר" };

const STATUS: Record<ContactStatus, { label: string; cls: string }> = {
  NEW: { label: "חדשה", cls: "pink" },
  IN_PROGRESS: { label: "בטיפול", cls: "orange" },
  HANDLED: { label: "טופלה", cls: "green" },
};

export default async function MessagesPage({ searchParams }: { searchParams: Promise<{ status?: string; q?: string; id?: string }> }) {
  await requireAdmin();
  const sp = await searchParams;
  const status = sp.status && sp.status in STATUS ? (sp.status as ContactStatus) : undefined;
  const q = (sp.q ?? "").trim().slice(0, 80);
  const digits = q.replace(/\D/g, "");
  const where: Prisma.ContactMessageWhereInput = {
    ...(status ? { status } : {}),
    ...(q
      ? {
          OR: [
            { name: { contains: q, mode: "insensitive" } },
            { email: { contains: q, mode: "insensitive" } },
            { message: { contains: q, mode: "insensitive" } },
            ...(digits.length >= 3 ? [{ phone: { contains: digits } }] : []),
          ],
        }
      : {}),
  };
  const [messages, counts] = await Promise.all([
    db.contactMessage.findMany({ where, orderBy: { createdAt: "desc" }, take: 100 }),
    db.contactMessage.groupBy({ by: ["status"], _count: true }),
  ]);
  const count = (s: ContactStatus) => counts.find((c) => c.status === s)?._count ?? 0;

  return (
    <>
      <AdminTop title="לקוחות יוצרים קשר" />
      <main className="admin-content">
        <form method="get" className="toolbar-row" role="search">
          <input type="search" name="q" defaultValue={q} placeholder="חיפוש לפי שם, טלפון, מייל או תוכן" aria-label="חיפוש פניות" />
          {status && <input type="hidden" name="status" value={status} />}
          <button className="btn btn-ghost" type="submit">חיפוש</button>
          <Link href="/admin/messages" className="btn btn-ghost" aria-current={!status ? "page" : undefined}>הכל</Link>
          {(Object.keys(STATUS) as ContactStatus[]).map((s) => (
            <Link key={s} href={`/admin/messages?status=${s}`} className="btn btn-ghost" aria-current={status === s ? "page" : undefined}>
              {STATUS[s].label} ({count(s)})
            </Link>
          ))}
        </form>

        {messages.length ? (
          <div className="msg-list">
            {messages.map((m) => {
              const wa = whatsappLink(m.phone.replace(/^0/, "972"));
              return (
                <article key={m.id} id={m.id} className={`card msg ${sp.id === m.id ? "msg-focus" : ""}`}>
                  <header className="msg-head">
                    <div>
                      <b>{m.name}</b> <span className={`pill ${STATUS[m.status].cls}`}>{STATUS[m.status].label}</span>
                      <div className="muted" style={{ fontSize: 13 }}>{formatDateTime(m.createdAt)}</div>
                    </div>
                    <div className="msg-actions">
                      <a href={`tel:${m.phone}`} className="btn btn-ghost" dir="ltr">📞 {m.phone}</a>
                      {wa && <a href={wa} target="_blank" rel="noopener noreferrer" className="btn btn-ghost">וואטסאפ</a>}
                      <a href={`mailto:${m.email}`} className="btn btn-ghost" dir="ltr">✉ {m.email}</a>
                    </div>
                  </header>
                  <p className="msg-body">{m.message}</p>
                  <ActionForm action={updateMessage} submitLabel="עדכון" className="msg-form">
                    <input type="hidden" name="id" value={m.id} />
                    <label className="field">
                      <span>סטטוס</span>
                      <select name="status" defaultValue={m.status}>
                        {(Object.keys(STATUS) as ContactStatus[]).map((s) => (
                          <option key={s} value={s}>{STATUS[s].label}</option>
                        ))}
                      </select>
                    </label>
                    <label className="field">
                      <span>הערה פנימית (לא נשלחת ללקוח)</span>
                      <input name="adminNote" defaultValue={m.adminNote ?? ""} maxLength={2000} />
                    </label>
                  </ActionForm>
                </article>
              );
            })}
          </div>
        ) : (
          <p className="card muted">
            {q || status ? "לא נמצאו פניות." : <>עדיין אין פניות. הן יגיעו לכאן מעמוד <Link href="/contact" target="_blank">צור קשר</Link> באתר.</>}
          </p>
        )}
      </main>
    </>
  );
}
