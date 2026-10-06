import React from "react";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { fontFamily } from "../fonts";
import { Character, CharacterProps } from "../character/Character";
import { clamp } from "./anim";

export const W = 1080;
export const H = 1920;
export const INK = "#111111";
export const RED = "#E8352B";
export const GREEN = "#1FA855";
export const YELLOW = "#FFD43B";

/* ---------------- background ---------------- */

const TINTS = {
  paper: { bg: "#F6F4EF", dot: "#DCD7CC" },
  red: { bg: "#FBEAE6", dot: "#EFC9C1" },
  green: { bg: "#E9F6EC", dot: "#C3E3CB" },
  blue: { bg: "#EAF1FA", dot: "#C7D7EE" },
} as const;

export type Tint = keyof typeof TINTS;

export const Backdrop: React.FC<{ tint?: Tint; floorY?: number }> = ({
  tint = "paper",
  floorY = 1600,
}) => {
  const t = TINTS[tint];
  return (
    <div style={{ position: "absolute", left: -W, top: -H, width: W * 3, height: H * 3, background: t.bg }}>
      <svg width={W * 3} height={H * 3} style={{ position: "absolute", inset: 0 }}>
        <defs>
          <pattern id={`dots-${tint}`} width={44} height={44} patternUnits="userSpaceOnUse">
            <circle cx={22} cy={22} r={2.4} fill={t.dot} />
          </pattern>
          <radialGradient id={`spot-${tint}`} cx="50%" cy="45%" r="60%">
            <stop offset="0%" stopColor="#FFFFFF" stopOpacity={0.85} />
            <stop offset="100%" stopColor="#FFFFFF" stopOpacity={0} />
          </radialGradient>
        </defs>
        <rect width={W * 3} height={H * 3} fill={`url(#dots-${tint})`} />
        <g transform={`translate(${W} ${H})`}>
          <rect width={W} height={H} fill={`url(#spot-${tint})`} />
          <rect x={-W} y={floorY} width={W * 3} height={H * 2} fill={t.dot} opacity={0.35} />
          <line x1={-W} x2={W * 2} y1={floorY} y2={floorY} stroke={INK} strokeWidth={4} />
        </g>
      </svg>
    </div>
  );
};

/* ---------------- camera ---------------- */

export const Camera: React.FC<{
  zoom: number;
  cx?: number;
  cy?: number;
  rotate?: number;
  shake?: number;
  children: React.ReactNode;
}> = ({ zoom, cx = W / 2, cy = H / 2, rotate = 0, shake = 0, children }) => {
  const frame = useCurrentFrame();
  const sx = shake * Math.sin(frame * 2.3) * 14;
  const sy = shake * Math.cos(frame * 1.7) * 10;
  return (
    <AbsoluteFill
      style={{
        transformOrigin: "0 0",
        transform: `translate(${W / 2 + sx}px, ${H / 2 + sy}px) rotate(${rotate}deg) scale(${zoom}) translate(${-cx}px, ${-cy}px)`,
      }}
    >
      {children}
    </AbsoluteFill>
  );
};

/* ---------------- character placement ---------------- */

/** Character drawn with its feet on (x, footY), `width` px wide (height = 2x). */
export const PlacedCharacter: React.FC<
  CharacterProps & { x: number; footY: number; width: number }
> = ({ x, footY, width, ...props }) => {
  const s = width / 400;
  return (
    <div
      style={{
        position: "absolute",
        left: x - width / 2,
        top: footY - 778 * s,
        width,
        height: width * 2,
      }}
    >
      <Character {...props} />
    </div>
  );
};

/** Converts a point in the character viewBox to stage pixels. */
export const toStage = (
  p: { x: number; y: number },
  place: { x: number; footY: number; width: number },
) => {
  const s = place.width / 400;
  return { x: place.x - place.width / 2 + p.x * s, y: place.footY - 778 * s + p.y * s };
};

/* ---------------- HUD ---------------- */

const CamIcon: React.FC = () => (
  <svg width={46} height={34} viewBox="0 0 46 34">
    <rect x={2} y={6} width={30} height={24} rx={6} fill="none" stroke="#fff" strokeWidth={4} />
    <path d="M 32 14 L 44 7 L 44 29 L 32 22 Z" fill="#fff" />
    <circle cx={9} cy={2.5} r={2.5} fill={RED} />
  </svg>
);

export const ViewChip: React.FC<{ label: string; delay?: number }> = ({ label, delay = 4 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame: frame - delay, fps, config: { damping: 15 } });
  const rec = Math.floor(frame / 15) % 2 === 0;
  return (
    <div
      style={{
        position: "absolute",
        top: 190,
        left: 0,
        right: 0,
        display: "flex",
        justifyContent: "center",
        transform: `translateY(${(1 - s) * -60}px)`,
        opacity: s,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 16,
          background: INK,
          color: "#fff",
          borderRadius: 999,
          padding: "14px 30px",
          fontFamily,
          fontWeight: 800,
          fontSize: 34,
          letterSpacing: 2,
        }}
      >
        <CamIcon />
        {label}
        <div
          style={{
            width: 16,
            height: 16,
            borderRadius: 8,
            background: RED,
            opacity: rec ? 1 : 0.25,
          }}
        />
      </div>
    </div>
  );
};

export const Title: React.FC<{
  text: string;
  sub?: string;
  delay?: number;
  top?: number;
  color?: string;
}> = ({ text, sub, delay = 0, top = 300, color = INK }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame: frame - delay, fps, config: { damping: 11, stiffness: 160 } });
  const s2 = spring({ frame: frame - delay - 8, fps, config: { damping: 14 } });
  return (
    <div style={{ position: "absolute", top, left: 80, right: 80, textAlign: "center" }}>
      <div
        style={{
          fontFamily,
          fontWeight: 800,
          fontSize: 104,
          lineHeight: 1,
          color,
          transform: `scale(${s}) rotate(${(1 - s) * -8}deg)`,
          letterSpacing: -2,
        }}
      >
        {text}
      </div>
      {sub ? (
        <div
          style={{
            display: "inline-block",
            marginTop: 18,
            fontFamily,
            fontWeight: 800,
            fontSize: 48,
            color: INK,
            background: YELLOW,
            padding: "6px 22px",
            borderRadius: 14,
            transform: `translateY(${(1 - s2) * 30}px) rotate(-2deg)`,
            opacity: s2,
          }}
        >
          {sub}
        </div>
      ) : null}
    </div>
  );
};

export const Stamp: React.FC<{
  good: boolean;
  label: string;
  delay?: number;
}> = ({ good, label, delay = 6 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame: frame - delay, fps, config: { damping: 9, stiffness: 200 } });
  const color = good ? GREEN : RED;
  const scale = interpolate(s, [0, 1], [2.4, 1]);
  return (
    <div
      style={{
        position: "absolute",
        top: 300,
        left: 0,
        right: 0,
        display: "flex",
        justifyContent: "center",
        opacity: interpolate(frame - delay, [0, 3], [0, 1], clamp),
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 20,
          border: `8px solid ${color}`,
          color,
          borderRadius: 26,
          padding: "10px 34px 10px 18px",
          fontFamily,
          fontWeight: 800,
          fontSize: 84,
          background: "rgba(255,255,255,0.85)",
          transform: `scale(${scale}) rotate(${good ? -3 : 3}deg)`,
        }}
      >
        <svg width={84} height={84} viewBox="0 0 84 84">
          <circle cx={42} cy={42} r={38} fill={color} />
          {good ? (
            <path d="M 24 44 L 37 57 L 61 29" stroke="#fff" strokeWidth={10} fill="none" strokeLinecap="round" strokeLinejoin="round" />
          ) : (
            <path d="M 28 28 L 56 56 M 56 28 L 28 56" stroke="#fff" strokeWidth={10} strokeLinecap="round" />
          )}
        </svg>
        {label}
      </div>
    </div>
  );
};

/** Hand-drawn style dashed arc with an arrow head. */
export const ArcArrow: React.FC<{
  cx: number;
  cy: number;
  r: number;
  from: number;
  to: number;
  progress: number;
  color?: string;
  width?: number;
}> = ({ cx, cy, r, from, to, progress, color = INK, width = 7 }) => {
  const end = from + (to - from) * progress;
  const steps = 30;
  const pts = Array.from({ length: steps + 1 }).map((_, i) => {
    const a = ((from + ((end - from) * i) / steps) * Math.PI) / 180;
    return [cx + r * Math.cos(a), cy + r * Math.sin(a)];
  });
  const d = pts.map((p, i) => `${i === 0 ? "M" : "L"} ${p[0]} ${p[1]}`).join(" ");
  const a = (end * Math.PI) / 180;
  const dir = Math.sign(to - from);
  const tip = { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) };
  const tan = { x: -Math.sin(a) * dir, y: Math.cos(a) * dir };
  const nrm = { x: Math.cos(a), y: Math.sin(a) };
  const head = `M ${tip.x - tan.x * 26 + nrm.x * 16} ${tip.y - tan.y * 26 + nrm.y * 16} L ${tip.x} ${tip.y} L ${tip.x - tan.x * 26 - nrm.x * 16} ${tip.y - tan.y * 26 - nrm.y * 16}`;
  if (progress <= 0.01) return null;
  return (
    <g>
      <path d={d} stroke={color} strokeWidth={width} fill="none" strokeDasharray="18 12" strokeLinecap="round" />
      <path d={head} stroke={color} strokeWidth={width} fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </g>
  );
};
