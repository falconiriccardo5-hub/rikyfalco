import React from 'react';
import {AbsoluteFill, useCurrentFrame, useVideoConfig, staticFile, Img} from 'remotion';
import {C, E, FONT, OUT, prog, rnd, useT} from './brand';

export const W = 1920;
export const H = 1080;

/** Mostra i figli solo tra from..to (secondi assoluti) con un piccolo "punch" di scala in ingresso. */
export const Show: React.FC<{from: number; to: number; punch?: number; children: React.ReactNode}> = ({
  from,
  to,
  punch = 0.05,
  children,
}) => {
  const t = useT();
  if (t < from || t >= to) return null;
  const p = prog(t, from, from + 0.28, E.out);
  const s = 1 + punch * (1 - p);
  return (
    <AbsoluteFill style={{transform: `scale(${s})`, transformOrigin: '50% 50%'}}>{children}</AbsoluteFill>
  );
};

/** Sfondo a puntini (come un quaderno / griglia coach) */
export const Bg: React.FC<{color?: string; dot?: string; drift?: number; size?: number}> = ({
  color = C.cream,
  dot = 'rgba(17,17,17,0.10)',
  drift = 14,
  size = 54,
}) => {
  const t = useT();
  return (
    <AbsoluteFill
      style={{
        background: color,
        backgroundImage: `radial-gradient(${dot} 2.5px, transparent 3px)`,
        backgroundSize: `${size}px ${size}px`,
        backgroundPosition: `${t * drift}px ${t * drift * 0.6}px`,
      }}
    />
  );
};

export const Grain: React.FC = () => {
  const f = useCurrentFrame();
  const o = Math.floor(f / 2);
  return (
    <>
      <AbsoluteFill
        style={{
          backgroundImage: `url(${staticFile('grain.png')})`,
          backgroundSize: '256px 256px',
          backgroundPosition: `${rnd(o) * 256}px ${rnd(o + 7) * 256}px`,
          opacity: 0.22,
          mixBlendMode: 'multiply',
          pointerEvents: 'none',
        }}
      />
      <AbsoluteFill
        style={{
          background: 'radial-gradient(ellipse at center, rgba(0,0,0,0) 62%, rgba(0,0,0,0.16) 100%)',
          pointerEvents: 'none',
        }}
      />
    </>
  );
};

export const cardStyle = (bg: string = C.cream, shadow = 10): React.CSSProperties => ({
  background: bg,
  border: `${OUT}px solid ${C.ink}`,
  borderRadius: 26,
  boxShadow: `${shadow}px ${shadow}px 0 ${C.ink}`,
});

/** Bilanciere frontale con dischi (coordinate locali, centro cx,cy). */
export const Barbell: React.FC<{
  cx: number;
  cy: number;
  half?: number;
  plates?: number;
  size?: number;
  color?: string;
  label?: string;
  labelColor?: string;
  drop?: (i: number) => number; // offset verticale per il disco i (animazioni di caduta)
}> = ({cx, cy, half = 240, plates = 2, size = 1, color = C.blue, label, labelColor = '#fff', drop}) => {
  const hs = [190, 160, 130, 104, 84, 66];
  const items: React.ReactNode[] = [];
  for (const side of [-1, 1]) {
    for (let i = 0; i < plates; i++) {
      const h = hs[Math.min(i, hs.length - 1)] * size;
      const w = 30 * size;
      const x = cx + side * (half - 22 * size - i * (w + 4 * size));
      items.push(
        <rect
          key={`${side}${i}`}
          x={x - w / 2}
          y={cy - h / 2 + (drop ? drop(i) : 0)}
          width={w}
          height={h}
          rx={10 * size}
          fill={i % 2 === 0 ? color : C.ink}
          stroke={C.ink}
          strokeWidth={OUT}
        />,
      );
    }
  }
  return (
    <g>
      <rect x={cx - half - 30 * size} y={cy - 8 * size} width={(half + 30 * size) * 2} height={16 * size} rx={8 * size} fill={C.steel} stroke={C.ink} strokeWidth={OUT} />
      {items}
      {label && plates > 0 && (
        <text
          x={cx - (half - 22 * size)}
          y={cy + 9 * size}
          fontFamily={FONT}
          fontWeight={900}
          fontSize={26 * size}
          fill={labelColor}
          textAnchor="middle"
          transform={`rotate(-90 ${cx - (half - 22 * size)} ${cy})`}
        >
          {label}
        </text>
      )}
    </g>
  );
};

export const Dumbbell: React.FC<{x: number; y: number; s?: number; color?: string; rot?: number}> = ({x, y, s = 1, color = C.blue, rot = 0}) => (
  <g transform={`translate(${x},${y}) rotate(${rot}) scale(${s})`} stroke={C.ink} strokeWidth={OUT / s > 8 ? 8 : OUT} strokeLinejoin="round">
    <rect x={-46} y={-6} width={92} height={12} rx={6} fill={C.steel} />
    <rect x={-58} y={-26} width={22} height={52} rx={7} fill={color} />
    <rect x={36} y={-26} width={22} height={52} rx={7} fill={color} />
    <rect x={-74} y={-16} width={14} height={32} rx={5} fill={C.ink} />
    <rect x={60} y={-16} width={14} height={32} rx={5} fill={C.ink} />
  </g>
);

export const Check: React.FC<{x: number; y: number; r?: number; p?: number; color?: string}> = ({x, y, r = 30, p = 1, color = C.blue}) => (
  <g transform={`translate(${x},${y}) scale(${p})`}>
    <circle r={r} fill={color} stroke={C.ink} strokeWidth={OUT} />
    <path d={`M ${-r * 0.42} ${r * 0.02} L ${-r * 0.1} ${r * 0.34} L ${r * 0.46} ${-r * 0.32}`} stroke="#fff" strokeWidth={r * 0.2} fill="none" strokeLinecap="round" strokeLinejoin="round" />
  </g>
);

/** Timbro rotato "slam" */
export const Stamp: React.FC<{text: string; t0: number; x: number; y: number; rot?: number; color?: string; size?: number; bg?: string}> = ({
  text,
  t0,
  x,
  y,
  rot = -8,
  color = C.red,
  size = 96,
  bg = 'transparent',
}) => {
  const t = useT();
  if (t < t0) return null;
  const p = prog(t, t0, t0 + 0.22, E.back);
  const s = 2.4 - 1.4 * p;
  return (
    <div
      style={{
        position: 'absolute',
        left: x,
        top: y,
        transform: `translate(-50%,-50%) rotate(${rot}deg) scale(${s})`,
        opacity: Math.min(1, p * 2),
        border: `${OUT + 2}px solid ${color}`,
        color,
        background: bg,
        borderRadius: 18,
        padding: '6px 34px',
        fontFamily: FONT,
        fontWeight: 900,
        fontSize: size,
        letterSpacing: 2,
        whiteSpace: 'nowrap',
      }}
    >
      {text}
    </div>
  );
};

export const FullSvg: React.FC<{children: React.ReactNode}> = ({children}) => (
  <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{position: 'absolute', left: 0, top: 0}}>
    {children}
  </svg>
);

export const Img2 = Img;
export {useVideoConfig};
