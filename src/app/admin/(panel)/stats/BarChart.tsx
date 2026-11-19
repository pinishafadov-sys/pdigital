/**
 * Simple server-rendered bar chart (no libraries). One or two series per
 * bucket; oldest on the right, like Hebrew reading order. The table under each
 * chart holds the same numbers for screen readers and exact values.
 */
type Series = { name: string; color: string; values: number[] };

export function BarChart({
  labels,
  series,
  format,
  title,
}: {
  labels: string[];
  series: Series[];
  format: (v: number) => string;
  title: string;
}) {
  const W = 720;
  const H = 220;
  const top = 18;
  const bottom = 2;
  const max = Math.max(1, ...series.flatMap((s) => s.values));
  const slot = W / labels.length;
  const gap = Math.min(10, slot * 0.25);
  const barW = Math.max(2, (slot - gap) / series.length);
  const y = (v: number) => top + (H - top - bottom) * (1 - Math.max(0, v) / max);
  // Show at most ~6 date labels (always including the newest).
  const every = Math.ceil(labels.length / 6);

  return (
    <figure className="chart" aria-label={title}>
      <div className="chart-legend" aria-hidden="true">
        {series.map((s) => (
          <span key={s.name}>
            <i style={{ background: s.color }} />
            {s.name}
          </span>
        ))}
        <span className="muted">גבוה ביותר: {format(max)}</span>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={title}>
        {labels.map((l, i) => {
          // Oldest (index 0) on the right, newest on the left - Hebrew reading order.
          const x0 = W - (i + 1) * slot + gap / 2;
          return (
            <g key={l + i}>
              {series.map((s, j) => {
                const v = s.values[i];
                const yy = y(v);
                return (
                  <rect key={s.name} x={x0 + j * barW} y={yy} width={barW - 1} height={Math.max(0, H - bottom - yy)} fill={s.color} rx={2}>
                    <title>{`${l} · ${s.name}: ${format(v)}`}</title>
                  </rect>
                );
              })}
            </g>
          );
        })}
      </svg>
      {/* Dates as normal text (not scaled with the drawing), oldest on the right. */}
      <div className="chart-x" aria-hidden="true">
        {labels.map((l, i) => (
          <span key={l + i}>{(labels.length - 1 - i) % every === 0 ? l : ""}</span>
        ))}
      </div>
    </figure>
  );
}
