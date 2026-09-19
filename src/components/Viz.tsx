/**
 * Small data-visual primitives, hand-drawn as inline SVG so the dashboard
 * ships no charting bundle.
 *
 * Accessibility rule applied throughout: the number is always written out in
 * text next to the shape. No value is conveyed by geometry or colour alone.
 */

export function RadialGauge({
  value,
  label,
  caption,
  size = 132,
  tone = 'accent',
}: {
  /** 0..1 */
  value: number;
  label: string;
  caption?: string;
  size?: number;
  tone?: 'accent' | 'positive' | 'warning';
}) {
  const clamped = Math.max(0, Math.min(1, Number.isFinite(value) ? value : 0));
  const stroke = 9;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const gradientId = `gauge-${tone}`;

  const stops: Record<string, [string, string]> = {
    accent: ['#4C8DFF', '#8B5CF6'],
    positive: ['#22D3EE', '#34D399'],
    warning: ['#FBBF24', '#F87171'],
  };
  const [from, to] = stops[tone];

  return (
    <div className="flex items-center gap-4">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label={`${label}: ${Math.round(clamped * 100)}%`}>
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor={from} />
            <stop offset="100%" stopColor={to} />
          </linearGradient>
        </defs>
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="#212636" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={`url(#${gradientId})`}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - clamped)}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
        <text
          x="50%"
          y="47%"
          textAnchor="middle"
          className="fill-primary text-[22px] font-semibold tabular-nums"
        >
          {Math.round(clamped * 100)}%
        </text>
        <text x="50%" y="62%" textAnchor="middle" className="fill-muted text-[10px] uppercase tracking-widest">
          {label}
        </text>
      </svg>
      {caption && <p className="text-sm text-secondary">{caption}</p>}
    </div>
  );
}

export function Sparkline({
  points,
  ariaLabel,
  width = 260,
  height = 56,
}: {
  points: number[];
  ariaLabel: string;
  width?: number;
  height?: number;
}) {
  if (points.length < 2) {
    return <div className="h-14 rounded-lg border border-dashed border-line" aria-hidden />;
  }

  const max = Math.max(...points);
  const min = Math.min(...points);
  const span = max - min || 1;
  const step = width / (points.length - 1);

  const coords = points.map((value, index) => {
    const x = index * step;
    const y = height - 6 - ((value - min) / span) * (height - 14);
    return [x, y] as const;
  });

  const line = coords.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`).join(' ');
  const area = `${line} L${width},${height} L0,${height} Z`;

  return (
    <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" role="img" aria-label={ariaLabel}>
      <defs>
        <linearGradient id="spark-line" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#4C8DFF" />
          <stop offset="100%" stopColor="#22D3EE" />
        </linearGradient>
        <linearGradient id="spark-area" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#4C8DFF" stopOpacity="0.28" />
          <stop offset="100%" stopColor="#4C8DFF" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill="url(#spark-area)" />
      <path d={line} fill="none" stroke="url(#spark-line)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={coords.at(-1)![0]} cy={coords.at(-1)![1]} r="3" fill="#22D3EE" />
    </svg>
  );
}

export function BarSeries({
  bars,
  ariaLabel,
}: {
  bars: { label: string; value: number; highlight?: boolean }[];
  ariaLabel: string;
}) {
  const max = Math.max(1, ...bars.map((bar) => bar.value));

  return (
    <div className="flex items-end justify-between gap-2" role="img" aria-label={ariaLabel}>
      {bars.map((bar) => (
        <div key={bar.label} className="flex min-w-0 flex-1 flex-col items-center gap-2">
          <div className="flex h-24 w-full items-end justify-center">
            <div
              className={`w-2.5 rounded-full ${
                bar.highlight
                  ? 'bg-gradient-to-t from-accent to-cyan'
                  : 'bg-gradient-to-t from-accent/45 to-accent/15'
              }`}
              style={{ height: `${Math.max(6, (bar.value / max) * 100)}%` }}
            />
          </div>
          <span className="truncate text-[10px] uppercase tracking-wider text-muted">{bar.label}</span>
          <span className="text-[11px] tabular-nums text-secondary">{bar.value}</span>
        </div>
      ))}
    </div>
  );
}

export function Meter({
  value,
  max,
  label,
  formatted,
  tone = 'accent',
}: {
  value: number;
  max: number;
  label: string;
  formatted: string;
  tone?: 'accent' | 'positive' | 'warning' | 'danger';
}) {
  const pct = max > 0 ? Math.max(0, Math.min(1, value / max)) : 0;
  const fill: Record<string, string> = {
    accent: 'from-accent to-violet',
    positive: 'from-cyan to-positive',
    warning: 'from-warning to-danger',
    danger: 'from-danger to-danger',
  };

  return (
    <div>
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-xs text-muted">{label}</span>
        <span className="text-xs tabular-nums text-secondary">{formatted}</span>
      </div>
      <div
        className="mt-2 h-1.5 overflow-hidden rounded-full bg-raised"
        role="progressbar"
        aria-valuenow={Math.round(pct * 100)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`${label}: ${formatted}`}
      >
        <div className={`h-full rounded-full bg-gradient-to-r ${fill[tone]}`} style={{ width: `${pct * 100}%` }} />
      </div>
    </div>
  );
}
