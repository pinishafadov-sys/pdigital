import Link from "next/link";

/** Page header used by every admin screen, with a site-wide admin search box. */
export function AdminTop({ title, actions }: { title: string; actions?: React.ReactNode }) {
  return (
    <header className="admin-top">
      <h1>{title}</h1>
      <form action="/admin/search" method="get" role="search" className="admin-search">
        <label htmlFor="admin-q" className="visually-hidden">חיפוש במערכת</label>
        <input id="admin-q" type="search" name="q" placeholder="חיפוש: לקוח, טלפון, חשבונית, מוצר..." maxLength={80} />
      </form>
      <div className="actions">
        <Link href="/" target="_blank" className="btn btn-outline" style={{ minHeight: 40 }}>
          צפייה באתר ←
        </Link>
        {actions}
      </div>
    </header>
  );
}
