/** Kit condiviso per i reel verticali 9:16 (palestrina, camera, etichette, card dei passi). */
import React from 'react';
import {AbsoluteFill} from 'remotion';
import {C, E, FONT, OUT, mix, prog, rnd, useT} from '../brand';
import {Dumbbell, cardStyle} from '../ui';
import {Riky, RikyProps} from '../Riky';

export const VW = 1080;
export const VH = 1920;
export const FLOOR = 1330;
export type Cam = {z: number; cx: number; cy: number};
export const w2s = (p: [number, number], c: Cam): [number, number] => [VW / 2 + (p[0] - c.cx) * c.z, VH / 2 + (p[1] - c.cy) * c.z];

export const Room: React.FC<{mat?: boolean}> = ({mat = true}) => (
  <g>
    <defs>
      <pattern id="dotsK" width={54} height={54} patternUnits="userSpaceOnUse">
        <circle cx={27} cy={27} r={2.6} fill="rgba(17,17,17,0.10)" />
      </pattern>
    </defs>
    <rect x={-900} y={-900} width={2900} height={2600} fill="#FFFFFF" />
    <rect x={-900} y={-900} width={2900} height={2600} fill="url(#dotsK)" />
    <g transform="translate(60,420)">
      <rect width={300} height={340} rx={18} fill="#E4DAFB" stroke={C.ink} strokeWidth={OUT} />
      <circle cx={215} cy={92} r={40} fill="#FFE9A8" stroke={C.ink} strokeWidth={OUT - 2} />
      <path d="M 0 238 Q 74 196 150 238 T 300 228 L 300 340 L 0 340 Z" fill={C.blueL} opacity={0.7} />
      <line x1={150} y1={0} x2={150} y2={340} stroke={C.ink} strokeWidth={OUT} />
      <line x1={0} y1={170} x2={300} y2={170} stroke={C.ink} strokeWidth={OUT} />
      <rect x={-14} y={340} width={328} height={22} rx={8} fill="#fff" stroke={C.ink} strokeWidth={OUT} />
    </g>
    <g transform="translate(790,400)">
      <rect width={230} height={310} rx={14} fill="#fff" stroke={C.ink} strokeWidth={OUT} />
      <rect x={16} y={16} width={198} height={196} rx={8} fill={C.blue} />
      <Dumbbell x={115} y={114} s={1.15} color="#fff" />
      <text x={115} y={256} textAnchor="middle" fontFamily="Inter" fontWeight={900} fontSize={40} fill={C.ink}>COACH</text>
      <text x={115} y={296} textAnchor="middle" fontFamily="Inter" fontWeight={900} fontSize={40} fill={C.blue}>RIKY</text>
    </g>
    <rect x={-900} y={1010} width={2900} height={120} fill={C.blue} />
    <rect x={-900} y={1004} width={2900} height={10} fill={C.ink} />
    <rect x={-900} y={1126} width={2900} height={8} fill={C.ink} />
    <rect x={-900} y={1134} width={2900} height={1000} fill="#2A2D33" />
    {Array.from({length: 16}).map((_, i) => (
      <line key={i} x1={-700 + i * 190} y1={1134} x2={-840 + i * 220} y2={1900} stroke="#33373E" strokeWidth={4} />
    ))}
    <g transform="translate(820,830)">
      <rect x={0} y={118} width={250} height={14} rx={6} fill={C.steel} stroke={C.ink} strokeWidth={OUT} />
      <rect x={10} y={16} width={230} height={14} rx={6} fill={C.steel} stroke={C.ink} strokeWidth={OUT} />
      {[0, 1, 2].map((i) => (
        <Dumbbell key={'a' + i} x={50 + i * 75} y={8} s={0.36 + i * 0.03} color={i % 2 ? C.ink : C.blue} />
      ))}
      {[0, 1, 2].map((i) => (
        <Dumbbell key={'b' + i} x={50 + i * 75} y={110} s={0.44 + i * 0.03} color={i % 2 ? C.blue : C.ink} />
      ))}
      <rect x={20} y={132} width={12} height={170} fill={C.steel} stroke={C.ink} strokeWidth={OUT - 2} />
      <rect x={218} y={132} width={12} height={170} fill={C.steel} stroke={C.ink} strokeWidth={OUT - 2} />
    </g>
    {mat && (
      <>
        <rect x={-30} y={1316} width={760} height={80} rx={18} fill={C.blueD} stroke={C.ink} strokeWidth={OUT} />
        <rect x={-30} y={1316} width={760} height={16} rx={8} fill={C.blue} />
      </>
    )}
  </g>
);

export const World: React.FC<{cam: Cam; children: React.ReactNode; mat?: boolean}> = ({cam, children, mat}) => (
  <svg width={VW} height={VH} style={{position: 'absolute', left: 0, top: 0}}>
    <g transform={`translate(${VW / 2},${VH / 2}) scale(${cam.z}) translate(${-cam.cx},${-cam.cy})`}>
      <Room mat={mat} />
      {children}
    </g>
  </svg>
);

export const repH = (t: number, t0: number, period = 2.8, lo = 0.04, hi = 0.94) => {
  if (t < t0) return lo;
  const u = ((((t - t0) % period) + period) % period) / period;
  const vv = 0.5 - 0.5 * Math.cos(2 * Math.PI * u);
  const s = Math.max(0, Math.min(1, (vv - 0.08) / 0.84));
  return lo + (hi - lo) * (s * s * (3 - 2 * s));
};

export const StepCard: React.FC<{n: string | number; title: string; t0: number; sub?: string; bad?: boolean; top?: number}> = ({n, title, t0, sub, bad, top = 96}) => {
  const t = useT();
  const p = prog(t, t0, t0 + 0.32, E.back);
  const col = bad ? C.red : C.blue;
  return (
    <div style={{position: 'absolute', left: 54, right: 54, top, transform: `translateY(${(1 - p) * -60}px) scale(${mix(0.94, 1, p)})`, opacity: Math.min(1, p * 2), display: 'flex', alignItems: 'center', gap: 22}}>
      <div style={{width: 118, height: 118, borderRadius: 59, background: col, border: `${OUT}px solid ${C.ink}`, boxShadow: `7px 7px 0 ${C.ink}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: FONT, fontWeight: 900, fontSize: 76, color: '#fff', flexShrink: 0}}>{n}</div>
      <div style={{...cardStyle('#fff', 8), padding: '12px 28px 14px', fontFamily: FONT, fontWeight: 900, fontSize: 54, lineHeight: 1.02, color: C.ink, textTransform: 'uppercase', letterSpacing: -1}}>
        {title}
        {sub && <div style={{fontSize: 32, fontWeight: 800, color: col, marginTop: 6, textTransform: 'none', letterSpacing: 0}}>{sub}</div>}
      </div>
    </div>
  );
};

export const Tag: React.FC<{t0: number; at: [number, number]; to?: [number, number]; text: string; bg?: string; fg?: string; size?: number; rot?: number; icon?: 'ok' | 'no' | null; t1?: number}> = ({
  t0,
  t1 = 1e9,
  at,
  to,
  text,
  bg = '#fff',
  fg = C.ink,
  size = 44,
  rot = -2,
  icon = null,
}) => {
  const t = useT();
  if (t < t0 || t > t1) return null;
  const p = prog(t, t0, t0 + 0.28, E.back);
  const halfW = (text.length * size * 0.6 + 90 + (icon ? size : 0)) / 2 + 24;
  at = [Math.min(Math.max(at[0], halfW), VW - halfW), at[1]];
  return (
    <>
      {to && (
        <svg width={VW} height={VH} style={{position: 'absolute', left: 0, top: 0, pointerEvents: 'none'}}>
          <line x1={at[0]} y1={at[1]} x2={mix(at[0], to[0], p)} y2={mix(at[1], to[1], p)} stroke={C.ink} strokeWidth={OUT} strokeLinecap="round" />
          <circle cx={mix(at[0], to[0], p)} cy={mix(at[1], to[1], p)} r={13 * p} fill={bg === '#fff' ? C.blue : bg} stroke={C.ink} strokeWidth={OUT - 2} />
        </svg>
      )}
      <div style={{position: 'absolute', left: at[0], top: at[1], transform: `translate(-50%,-50%) scale(${p}) rotate(${rot}deg)`, ...cardStyle(bg, 8), padding: '8px 24px 10px', fontFamily: FONT, fontWeight: 900, fontSize: size, color: fg, whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 12}}>
        {icon === 'ok' && <span style={{display: 'inline-block', width: size * 0.9, height: size * 0.9, borderRadius: '50%', background: C.blue, color: '#fff', textAlign: 'center', lineHeight: `${size * 0.9}px`, fontSize: size * 0.62}}>✓</span>}
        {icon === 'no' && <span style={{display: 'inline-block', width: size * 0.9, height: size * 0.9, borderRadius: '50%', background: C.red, color: '#fff', textAlign: 'center', lineHeight: `${size * 0.9}px`, fontSize: size * 0.62}}>✕</span>}
        {text}
      </div>
    </>
  );
};

export const Burst: React.FC<{t0: number; x: number; y: number; text: string; color?: string; size?: number; rot?: number; hold?: number}> = ({t0, x, y, text, color = C.red, size = 64, rot = -8, hold = 0.9}) => {
  const t = useT();
  if (t < t0) return null;
  const p = prog(t, t0, t0 + 0.3, E.back);
  const out = prog(t, t0 + hold, t0 + hold + 0.2, E.in);
  const pts = Array.from({length: 16}).map((_, i) => {
    const a = (i / 16) * Math.PI * 2;
    const r = i % 2 ? 78 : 118;
    return `${Math.cos(a) * r},${Math.sin(a) * r}`;
  });
  return (
    <div style={{position: 'absolute', left: x, top: y, transform: `translate(-50%,-50%) scale(${p * (1 - out)}) rotate(${rot}deg)`}}>
      <svg width={260} height={260} viewBox="-130 -130 260 260" style={{position: 'absolute', left: -130, top: -130}}>
        <polygon points={pts.join(' ')} fill={color} stroke={C.ink} strokeWidth={OUT} strokeLinejoin="round" />
      </svg>
      <div style={{position: 'relative', fontFamily: FONT, fontWeight: 900, fontSize: size, color: '#fff', WebkitTextStroke: `${size * 0.06}px ${C.ink}`, paintOrder: 'stroke fill', transform: 'translate(-50%,-50%)', whiteSpace: 'nowrap', left: 0, top: 0}}>{text}</div>
    </div>
  );
};

export const Sparkles: React.FC<{t0: number; x: number; y: number; n?: number; hearts?: boolean}> = ({t0, x, y, n = 10, hearts}) => {
  const t = useT();
  if (t < t0) return null;
  const d = t - t0;
  return (
    <svg width={VW} height={VH} style={{position: 'absolute', left: 0, top: 0, pointerEvents: 'none'}}>
      {Array.from({length: n}).map((_, i) => {
        const a = rnd(i * 3 + 1) * Math.PI * 2;
        const sp = 140 + rnd(i * 5 + 2) * 240;
        const px = x + Math.cos(a) * sp * Math.min(1, d * 1.6);
        const py = y + Math.sin(a) * sp * Math.min(1, d * 1.6) - d * 60;
        const life = Math.max(0, 1 - d / 1.5);
        const s = (hearts ? 30 : 20) * life * (0.6 + rnd(i) * 0.8);
        return hearts ? (
          <path key={i} transform={`translate(${px},${py}) scale(${s / 30})`} d="M 0 12 C -34 -16 -16 -40 0 -22 C 16 -40 34 -16 0 12 Z" fill={i % 2 ? C.blue : C.blueL} stroke={C.ink} strokeWidth={4} opacity={life} />
        ) : (
          <path key={i} transform={`translate(${px},${py}) rotate(${d * 120 + i * 30})`} d={`M 0 ${-s} L ${s * 0.3} ${-s * 0.3} L ${s} 0 L ${s * 0.3} ${s * 0.3} L 0 ${s} L ${-s * 0.3} ${s * 0.3} L ${-s} 0 L ${-s * 0.3} ${-s * 0.3} Z`} fill={i % 2 ? C.blue : C.ink} opacity={life} />
        );
      })}
    </svg>
  );
};

export const RikyP: React.FC<{x?: number; y?: number; scale?: number; flip?: boolean} & Partial<RikyProps>> = ({x = 800, y = FLOOR, scale = 0.7, flip = true, ...rest}) => (
  <Riky x={x} y={y} scale={scale} flip={flip} {...rest} />
);

/** Testo grande "titolo" (non legato alla voce) */
export const Headline: React.FC<{t0: number; t1?: number; lines: {text: string; color?: string}[]; top?: number; size?: number; rot?: number}> = ({t0, t1 = 1e9, lines, top = 120, size = 96, rot = -2}) => {
  const t = useT();
  if (t < t0 || t > t1) return null;
  return (
    <div style={{position: 'absolute', left: 50, right: 50, top, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, transform: `rotate(${rot}deg)`}}>
      {lines.map((l, i) => {
        const p = prog(t, t0 + i * 0.18, t0 + i * 0.18 + 0.3, E.back);
        return (
          <div key={i} style={{fontFamily: FONT, fontWeight: 900, fontSize: size, lineHeight: 1.0, letterSpacing: -size * 0.025, textTransform: 'uppercase', color: l.color ?? C.ink, WebkitTextStroke: `${size * 0.06}px ${l.color ? C.ink : '#fff'}`, paintOrder: 'stroke fill', textShadow: l.color ? `${size * 0.05}px ${size * 0.05}px 0 ${C.ink}` : undefined, transform: `scale(${p})`, opacity: Math.min(1, p * 2), textAlign: 'center'}}>
            {l.text}
          </div>
        );
      })}
    </div>
  );
};

/** Card finale con parola chiave per i DM */
export const KeywordCTA: React.FC<{t0: number; word: string; pre?: string; post?: string}> = ({t0, word, pre = 'SCRIVIMI', post = 'IN DM'}) => {
  const t = useT();
  const p = prog(t, t0, t0 + 0.35, E.back);
  const pulse = 1 + 0.04 * Math.sin(t * 6);
  return (
    <div style={{position: 'absolute', left: 60, right: 60, top: 150, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 18, transform: `scale(${p})`, opacity: Math.min(1, p * 2)}}>
      <div style={{fontFamily: FONT, fontWeight: 900, fontSize: 64, color: C.ink, letterSpacing: -1}}>{pre}</div>
      <div style={{transform: `scale(${pulse}) rotate(-3deg)`, background: C.blue, border: `${OUT + 2}px solid ${C.ink}`, borderRadius: 28, boxShadow: `12px 12px 0 ${C.ink}`, padding: '10px 50px 18px', fontFamily: FONT, fontWeight: 900, fontSize: 138, color: '#fff', letterSpacing: 2}}>{word}</div>
      <div style={{display: 'flex', alignItems: 'center', gap: 16, fontFamily: FONT, fontWeight: 900, fontSize: 64, color: C.ink}}>
        {post}
        <svg width={72} height={72} viewBox="0 0 64 64"><path d="M 6 30 L 58 8 L 44 56 L 30 38 Z" fill={C.blue} stroke={C.ink} strokeWidth={5} strokeLinejoin="round" /><path d="M 30 38 L 58 8" stroke={C.ink} strokeWidth={4} /></svg>
      </div>
    </div>
  );
};

export const Handle: React.FC<{t0: number; top?: number}> = ({t0, top = 640}) => {
  const t = useT();
  const p = prog(t, t0, t0 + 0.3, E.back);
  return (
    <div style={{position: 'absolute', left: 0, right: 0, top, display: 'flex', justifyContent: 'center', transform: `scale(${p})`}}>
      <div style={{display: 'inline-flex', alignItems: 'center', gap: 16, background: C.ink, borderRadius: 999, padding: '12px 30px 12px 14px', boxShadow: `7px 7px 0 ${C.blue}`}}>
        <svg width={46} height={46} viewBox="0 0 64 64">
          <rect x={4} y={4} width={56} height={56} rx={17} fill="none" stroke="#fff" strokeWidth={5} />
          <circle cx={32} cy={32} r={13} fill="none" stroke="#fff" strokeWidth={5} />
          <circle cx={47} cy={17} r={3.5} fill="#fff" />
        </svg>
        <span style={{fontFamily: FONT, fontWeight: 800, fontSize: 40, color: '#fff'}}>@riccardofalconi_coach</span>
      </div>
    </div>
  );
};

export {AbsoluteFill};
