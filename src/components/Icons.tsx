// Inline SVG icons (stroke style, from the design). Decorative: aria-hidden.
type P = { size?: number; color?: string; className?: string };

function Svg({ size = 24, color = "currentColor", className, children, sw = 2 }: P & { children: React.ReactNode; sw?: number }) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color}
      strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
      {children}
    </svg>
  );
}

export const IconWhatsapp = (p: P) => (
  <Svg {...p}><path d="M4 20l1.2-4A8 8 0 1 1 8.4 18.9z" /><path d="M9 9c0 3 3 6 6 6l1-1.5-2-1-1 .8c-.8-.4-1.6-1.2-2-2l.8-1-1-2z" /></Svg>
);
export const IconPhone = (p: P) => (
  <Svg {...p}><path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z" /></Svg>
);
export const IconPin = (p: P) => (
  <Svg {...p}><path d="M12 21s-7-6-7-11a7 7 0 0 1 14 0c0 5-7 11-7 11z" /><circle cx="12" cy="10" r="2.5" /></Svg>
);
export const IconSearch = (p: P) => (
  <Svg {...p} sw={2.4}><circle cx="11" cy="11" r="7" /><path d="M21 21l-4.5-4.5" /></Svg>
);
export const IconCart = (p: P) => (
  <Svg {...p}><path d="M3 4h2l2.4 11h10.2l2-8H6.2" /><circle cx="9" cy="20" r="1.5" /><circle cx="17" cy="20" r="1.5" /></Svg>
);
export const IconUser = (p: P) => (
  <Svg {...p}><circle cx="12" cy="8" r="4" /><path d="M4 21c0-4 4-6 8-6s8 2 8 6" /></Svg>
);
export const IconBox = (p: P) => (
  <Svg {...p} sw={1.5}><path d="M12 3l8 4.5v9L12 21l-8-4.5v-9z" /><path d="M12 12l8-4.5M12 12v9M12 12L4 7.5" /></Svg>
);
export const IconTruck = (p: P) => (
  <Svg {...p}><path d="M3 6h11v10H3z" /><path d="M14 10h4l3 3v3h-7" /><circle cx="7" cy="18" r="1.5" /><circle cx="17" cy="18" r="1.5" /></Svg>
);
export const IconLock = (p: P) => (
  <Svg {...p}><rect x="5" y="11" width="14" height="10" rx="2" /><path d="M8 11V8a4 4 0 0 1 8 0v3" /></Svg>
);
export const IconShield = (p: P) => (
  <Svg {...p}><path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z" /><path d="M9 12l2 2 4-4" /></Svg>
);
export const IconChat = (p: P) => (
  <Svg {...p}><path d="M4 5h16v11H9l-5 4z" /></Svg>
);
export const IconReturn = (p: P) => (
  <Svg {...p}><path d="M4 12a8 8 0 1 0 3-6.2M4 4v4h4" /></Svg>
);
export const IconStar = ({ size = 52, className }: P) => (
  <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="var(--brand-orange)" stroke="var(--brand-orange)"
    strokeWidth="1.5" strokeLinejoin="round" aria-hidden="true">
    <path d="M12 3l2.6 5.6 6.1.7-4.5 4.2 1.2 6L12 16.5 6.6 19.5l1.2-6L3.3 9.3l6.1-.7z" />
  </svg>
);
export const IconAccessibility = (p: P) => (
  <Svg {...p}><circle cx="12" cy="4.5" r="1.8" /><path d="M5 8.5l7 1.5 7-1.5M12 10v4.5M12 14.5l-3.5 6M12 14.5l3.5 6" /></Svg>
);
export const IconFacebook = (p: P) => (
  <Svg {...p}><path d="M15 3h-2.5A3.5 3.5 0 0 0 9 6.5V9H7v3h2v9h3v-9h2.5l.5-3h-3V6.5a.5.5 0 0 1 .5-.5H15z" /></Svg>
);
export const IconInstagram = (p: P) => (
  <Svg {...p}><rect x="3" y="3" width="18" height="18" rx="5" /><circle cx="12" cy="12" r="4" /><circle cx="17.5" cy="6.5" r="0.6" /></Svg>
);
export const IconTiktok = (p: P) => (
  <Svg {...p}><path d="M14 3v11.5a3.5 3.5 0 1 1-3.5-3.5M14 3c.5 2.5 2.5 4.5 5 4.8" /></Svg>
);

// Department icons from the design (by category slug keyword)
export const DEPT_ICONS: Record<string, { color: string; path: string }> = {
  gaming: { color: "var(--brand-blue-on-dark)", path: "M3 9h18a1 1 0 0 1 1 1v5a3 3 0 0 1-5.2 2L15 15H9l-1.8 2A3 3 0 0 1 2 15v-5a1 1 0 0 1 1-1zM7 11.5v3M5.5 13h3M16 12h.01M18 14h.01" },
  gadgets: { color: "var(--brand-pink-on-dark)", path: "M13 3L4 14h7l-1 7 9-11h-7l1-7z" },
  special: { color: "var(--brand-purple-light-on-dark)", path: "M12 3l2.6 5.6 6.1.7-4.5 4.2 1.2 6L12 16.5 6.6 19.5l1.2-6L3.3 9.3l6.1-.7z" },
  cellular: { color: "var(--brand-orange)", path: "M7 2h10a2 2 0 0 1 2 2v16a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2zM11 18h2" },
  electronics: { color: "var(--brand-pink-on-dark)", path: "M4 5h16v11H4zM8 21h8M12 16v5" },
  gifts: { color: "var(--brand-purple-light-on-dark)", path: "M3 10h18v4H3zM5 14h14v7H5zM12 10v11M12 10c-3 0-4-4-1.5-4S12 10 12 10zM12 10c3 0 4-4 1.5-4S12 10 12 10z" },
  chargers: { color: "var(--brand-blue-on-dark)", path: "M9 2v5M15 2v5M7 7h10v4a5 5 0 0 1-10 0zM12 16v6" },
};

export function DeptIcon({ slug, size = 44 }: { slug: string; size?: number }) {
  const icon = DEPT_ICONS[slug] ?? DEPT_ICONS.special;
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={icon.color} strokeWidth="1.8"
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={icon.path} />
    </svg>
  );
}
