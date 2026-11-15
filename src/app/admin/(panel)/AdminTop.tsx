import Link from "next/link";

/** Page header used by every admin screen. */
export function AdminTop({ title, actions }: { title: string; actions?: React.ReactNode }) {
  return (
    <header className="admin-top">
      <h1>{title}</h1>
      <div className="actions">
        <Link href="/" target="_blank" className="btn btn-outline" style={{ minHeight: 40 }}>
          צפייה באתר ←
        </Link>
        {actions}
      </div>
    </header>
  );
}
