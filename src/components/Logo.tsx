type Props = {
  size?: "sm" | "md" | "lg";
  onDark?: boolean;
  showSlogan?: boolean;
  className?: string;
};

const SIZES = { sm: { mark: 34, text: 22 }, md: { mark: 44, text: 32 }, lg: { mark: 48, text: 34 } };

/** The four-shard "play" mark. Colors come from design tokens. */
export function LogoMark({ size = 44, onDark = false, className }: { size?: number; onDark?: boolean; className?: string }) {
  const c = onDark
    ? ["var(--brand-blue-on-dark)", "var(--brand-pink-on-dark)", "var(--brand-purple-light-on-dark)", "var(--brand-orange)"]
    : ["var(--brand-blue)", "var(--brand-pink)", "var(--brand-purple)", "var(--brand-orange)"];
  return (
    <svg className={className} width={size} height={size * 1.1} viewBox="-2 -2 58 64" aria-hidden="true" focusable="false">
      <polygon className="shard s1" points="0,0 27,15 18,30" fill={c[0]} stroke={c[0]} strokeWidth="3" strokeLinejoin="round" />
      <polygon className="shard s2" points="0,0 18,30 0,60" fill={c[1]} stroke={c[1]} strokeWidth="3" strokeLinejoin="round" />
      <polygon className="shard s3" points="18,30 27,45 0,60" fill={c[2]} stroke={c[2]} strokeWidth="3" strokeLinejoin="round" />
      <polygon className="shard s4" points="27,15 54,30 27,45 18,30" fill={c[3]} stroke={c[3]} strokeWidth="3" strokeLinejoin="round" />
    </svg>
  );
}

export function Logo({ size = "md", onDark = false, showSlogan = true, className }: Props) {
  const s = SIZES[size];
  return (
    <span className={`logo ${className ?? ""}`}>
      <LogoMark size={s.mark} onDark={onDark} />
      <span className="logo-text">
        <span className="logo-word" dir="ltr" style={{ fontSize: s.text }}>
          <span style={{ color: onDark ? "var(--brand-purple-light-on-dark)" : "var(--brand-purple)" }}>p</span>
          <span style={{ color: "var(--brand-orange)" }}>digital</span>
        </span>
        {showSlogan && <span className="logo-slogan">הכל באתר אחד!</span>}
      </span>
    </span>
  );
}
