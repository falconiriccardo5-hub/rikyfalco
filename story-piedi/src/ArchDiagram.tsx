import React from "react";
import { Easing, interpolate } from "remotion";
import { fontFamily } from "./fonts";
import { clamp, GREEN, INK, RED } from "./ui";

/**
 * Side view of the foot as a truss (like the classic textbook model):
 * heel - talus - forefoot bones on top, plantar fascia as a spring underneath.
 * `load` 0..1 = how much body weight has been put on it.
 */
const Truss: React.FC<{
  collapsed: boolean;
  load: number;
  frame: number;
}> = ({ collapsed, load, frame }) => {
  const groundY = 200;
  const heel = { x: 50, y: groundY - 10 };
  const fore = { x: 350, y: groundY - 10 };
  // normal arch: dips a little then springs back. collapsed: sinks flat.
  const rest = 95;
  const sink = collapsed ? 62 * load : 14 * Math.sin(load * Math.PI) ;
  const apex = { x: 145, y: groundY - rest + sink };
  const stretch = collapsed ? load : 0;
  const color = collapsed ? RED : GREEN;

  // plantar fascia spring, drawn as a coil between heel and forefoot
  const coils = 9;
  const amp = interpolate(stretch, [0, 1], [11, 4]);
  const steps = 160;
  const springY = groundY - 16;
  const shiver = collapsed ? Math.sin(frame * 1.7) * 2 * load : 0;
  const d = Array.from({ length: steps + 1 })
    .map((_, i) => {
      const t = i / steps;
      const x = heel.x + 18 + t * (fore.x - heel.x - 36);
      const y = springY + Math.sin(t * Math.PI * 2 * coils) * (amp + shiver);
      return `${i === 0 ? "M" : "L"} ${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(" ");

  const arrowY = interpolate(load, [0, 1], [-30, apex.y - 70]);
  return (
    <svg width={400} height={230} viewBox="0 0 400 230">
      {/* ground */}
      <line x1={10} x2={390} y1={groundY + 6} y2={groundY + 6} stroke={INK} strokeWidth={5} strokeLinecap="round" />
      {/* bones */}
      <path
        d={`M ${heel.x} ${heel.y} L ${apex.x} ${apex.y} L ${fore.x} ${fore.y}`}
        stroke={INK}
        strokeWidth={22}
        strokeLinejoin="round"
        strokeLinecap="round"
        fill="none"
      />
      <path
        d={`M ${heel.x} ${heel.y} L ${apex.x} ${apex.y} L ${fore.x} ${fore.y}`}
        stroke="#fff"
        strokeWidth={10}
        strokeLinejoin="round"
        strokeLinecap="round"
        fill="none"
      />
      {[heel, apex, fore].map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r={13} fill="#fff" stroke={INK} strokeWidth={6} />
      ))}
      {/* fascia spring */}
      <path d={d} stroke={color} strokeWidth={6} fill="none" strokeLinecap="round" />
      {/* body weight arrow */}
      <g opacity={interpolate(load, [0, 0.15], [0, 1], clamp)}>
        <rect x={apex.x - 20} y={arrowY - 40} width={40} height={44} fill={INK} rx={4} />
        <path d={`M ${apex.x - 42} ${arrowY} L ${apex.x + 42} ${arrowY} L ${apex.x} ${arrowY + 40} Z`} fill={INK} />
      </g>
    </svg>
  );
};

export const ArchDiagram: React.FC<{ frame: number; start: number }> = ({ frame, start }) => {
  const load = interpolate(frame, [start, start + 30], [0, 1], {
    ...clamp,
    easing: Easing.out(Easing.cubic),
  });
  const label = (text: string, color: string) => (
    <div
      style={{
        fontFamily,
        fontWeight: 800,
        fontSize: 34,
        color: "#fff",
        background: color,
        borderRadius: 12,
        padding: "4px 16px",
        alignSelf: "center",
      }}
    >
      {text}
    </div>
  );
  const sub = (text: string) => (
    <div style={{ fontFamily, fontWeight: 600, fontSize: 27, color: INK, textAlign: "center", lineHeight: 1.2 }}>
      {text}
    </div>
  );
  return (
    <div style={{ display: "flex", gap: 10, justifyContent: "space-between" }}>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, width: 420 }}>
        {label("ARCO ATTIVO", GREEN)}
        <Truss collapsed={false} load={load} frame={frame} />
        {sub("la fascia fa da molla e assorbe il peso")}
      </div>
      <div style={{ width: 5, background: "#E3DED3", borderRadius: 3 }} />
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, width: 420 }}>
        {label("ARCO CHE CEDE", RED)}
        <Truss collapsed load={load} frame={frame} />
        {sub("la molla si sovraccarica e il piede crolla")}
      </div>
    </div>
  );
};
