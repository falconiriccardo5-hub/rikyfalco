// Radar "Area personale" (voti 1-5), come il grafico del foglio Visita. SVG puro, nessuna libreria.
export function Radar({ points, previous, size = 280 }: {
  points: { label: string; value: number | null }[];
  previous?: { label: string; value: number | null }[];
  size?: number;
}) {
  const n = points.length;
  if (n < 3) return null;
  const c = size / 2, r = size / 2 - 40;
  const at = (i: number, v: number) => {
    const a = (Math.PI * 2 * i) / n - Math.PI / 2;
    return [c + Math.cos(a) * r * (v / 5), c + Math.sin(a) * r * (v / 5)] as const;
  };
  const poly = (pts: { value: number | null }[]) => pts.map((p, i) => at(i, p.value ?? 0).join(",")).join(" ");
  const short = (s: string) => s.replace(/[^\p{L}\p{N}/ ]/gu, "").trim();
  return (
    <svg viewBox={`-90 0 ${size + 180} ${size}`} className="h-auto w-full max-w-[440px]" role="img"
      aria-label={points.map((p) => `${short(p.label)}: ${p.value ?? "—"}`).join(", ")}>
      {[1, 2, 3, 4, 5].map((l) => (
        <polygon key={l} points={points.map((_, i) => at(i, l).join(",")).join(" ")} fill="none"
          stroke="rgb(255 255 255 / .08)" strokeWidth={l === 5 ? 1 : 0.7} />
      ))}
      {points.map((_, i) => <line key={i} x1={c} y1={c} x2={at(i, 5)[0]} y2={at(i, 5)[1]} stroke="rgb(255 255 255 / .06)" />)}
      {previous && previous.some((p) => p.value != null) && (
        <polygon points={poly(previous)} fill="rgb(255 255 255 / .04)" stroke="#5c5c6b" strokeDasharray="4 4" strokeWidth={1.2} />
      )}
      <polygon points={poly(points)} fill="rgb(139 92 246 / .22)" stroke="#a78bfa" strokeWidth={1.8}
        style={{ filter: "drop-shadow(0 0 10px rgb(167 139 250 / .55))" }} />
      {points.map((p, i) => {
        const [x, y] = at(i, p.value ?? 0);
        const [lx, ly] = at(i, 6);
        return (
          <g key={p.label}>
            {p.value != null && <circle cx={x} cy={y} r={3} fill="#c4b5fd" />}
            <text x={lx} y={ly} textAnchor={Math.abs(lx - c) < 4 ? "middle" : lx > c ? "start" : "end"} dominantBaseline="middle"
              className="fill-[#8b8b9a] text-[12px]">
              {short(p.label)} <tspan className="fill-[#f4f4f6]">{p.value ?? "—"}</tspan>
            </text>
          </g>
        );
      })}
    </svg>
  );
}
