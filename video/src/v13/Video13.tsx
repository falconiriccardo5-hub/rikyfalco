import React from 'react';
import {AbsoluteFill, Audio, staticFile} from 'remotion';
import {C, E, FONT, OUT, mix, prog, shake, rnd, useT, useTalk} from '../brand';
import {Show, Grain, Dumbbell, cardStyle} from '../ui';
import {Captions, CapLine} from '../Captions';
import {Transitions, Tr} from '../Transitions';
import {Riky, RikyProps} from '../Riky';
import {GirlSide, GirlProps, girlGeom} from './Girl';
import timing from '../voice13_timing.json';
import envR from '../voice13_env_r.json';
import envG from '../voice13_env_g.json';

export const FPS = 30;
export const VW = 1080;
export const VH = 1920;
type VT = {slot: string; text: string; t0: number; t1: number; words: number[]; who: string};
const VL = timing as VT[];
const v = (s: string) => {
  const x = VL.find((q) => q.slot === s);
  if (!x) throw new Error('slot voce mancante ' + s);
  return x;
};
const st = (s: string) => v(s).t0;
const en = (s: string) => v(s).t1;
const ER = envR as number[];
const EG = envG as number[];

const G = 0.22;
export const END = Math.min(44.5, en('g10') + 1.3);
export const DURATION13 = Math.ceil(END * FPS);
export const W: Record<string, [number, number]> = {
  s1a: [0, st('g02') - G],
  s1b: [st('g02') - G, st('r03') - G],
  s1c: [st('r03') - G, st('r04') - G],
  s2a: [st('r04') - G, st('r05') - G],
  s2b: [st('r05') - G, st('r06') - G],
  s3a: [st('r06') - G, st('r07') - G],
  s3b: [st('r07') - G, st('r08') - G],
  s4a: [st('r08') - G, st('r09') - G],
  s4b: [st('r09') - G, st('g10') - G],
  s5: [st('g10') - G, END],
};

/* ------------------------------------------------------------------ mondo (palestrina verticale) */
const FLOOR = 1330;
const GX = 330; // piedi della ragazza
const RX = 800; // piedi di Riky
type Cam = {z: number; cx: number; cy: number};
const w2s = (p: [number, number], c: Cam): [number, number] => [VW / 2 + (p[0] - c.cx) * c.z, VH / 2 + (p[1] - c.cy) * c.z];

const Room: React.FC = () => (
  <g>
    <defs>
      <pattern id="dots13" width={54} height={54} patternUnits="userSpaceOnUse">
        <circle cx={27} cy={27} r={2.6} fill="rgba(17,17,17,0.10)" />
      </pattern>
    </defs>
    <rect x={-700} y={-700} width={2500} height={2200} fill="#FFFFFF" />
    <rect x={-700} y={-700} width={2500} height={2200} fill="url(#dots13)" />
    {/* finestra */}
    <g transform="translate(60,420)">
      <rect width={300} height={340} rx={18} fill="#E4DAFB" stroke={C.ink} strokeWidth={OUT} />
      <circle cx={215} cy={92} r={40} fill="#FFE9A8" stroke={C.ink} strokeWidth={OUT - 2} />
      <path d="M 0 238 Q 74 196 150 238 T 300 228 L 300 340 L 0 340 Z" fill={C.blueL} opacity={0.7} />
      <line x1={150} y1={0} x2={150} y2={340} stroke={C.ink} strokeWidth={OUT} />
      <line x1={0} y1={170} x2={300} y2={170} stroke={C.ink} strokeWidth={OUT} />
      <rect x={-14} y={340} width={328} height={22} rx={8} fill="#fff" stroke={C.ink} strokeWidth={OUT} />
    </g>
    {/* poster brand */}
    <g transform="translate(790,400)">
      <rect width={230} height={310} rx={14} fill="#fff" stroke={C.ink} strokeWidth={OUT} />
      <rect x={16} y={16} width={198} height={196} rx={8} fill={C.blue} />
      <Dumbbell x={115} y={114} s={1.15} color="#fff" />
      <text x={115} y={256} textAnchor="middle" fontFamily="Inter" fontWeight={900} fontSize={40} fill={C.ink}>COACH</text>
      <text x={115} y={296} textAnchor="middle" fontFamily="Inter" fontWeight={900} fontSize={40} fill={C.blue}>RIKY</text>
    </g>
    {/* zoccolo viola */}
    <rect x={-700} y={1010} width={2500} height={120} fill={C.blue} />
    <rect x={-700} y={1004} width={2500} height={10} fill={C.ink} />
    <rect x={-700} y={1126} width={2500} height={8} fill={C.ink} />
    {/* pavimento */}
    <rect x={-700} y={1134} width={2500} height={900} fill="#2A2D33" />
    {Array.from({length: 14}).map((_, i) => (
      <line key={i} x1={-500 + i * 190} y1={1134} x2={-640 + i * 220} y2={1900} stroke="#33373E" strokeWidth={4} />
    ))}
    {/* rastrelliera */}
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
    {/* tappetino */}
    <rect x={-30} y={1316} width={760} height={80} rx={18} fill={C.blueD} stroke={C.ink} strokeWidth={OUT} />
    <rect x={-30} y={1316} width={760} height={16} rx={8} fill={C.blue} />
  </g>
);

const World: React.FC<{cam: Cam; children: React.ReactNode}> = ({cam, children}) => (
  <svg width={VW} height={VH} style={{position: 'absolute', left: 0, top: 0}}>
    <g transform={`translate(${VW / 2},${VH / 2}) scale(${cam.z}) translate(${-cam.cx},${-cam.cy})`}>
      <Room />
      {children}
    </g>
  </svg>
);

/** movimento ripetuto dello stacco: h 0..1 */
const repH = (t: number, t0: number, period = 2.8, lo = 0.04, hi = 0.94) => {
  if (t < t0) return lo;
  const u = (((t - t0) % period) + period) % period / period;
  const vv = 0.5 - 0.5 * Math.cos(2 * Math.PI * u);
  const s = Math.max(0, Math.min(1, (vv - 0.08) / 0.84));
  return lo + (hi - lo) * (s * s * (3 - 2 * s));
};

const CapeBehind: React.FC<{x: number; y: number; scale: number; flip?: boolean; t: number; show: number}> = ({x, y, scale, flip, t, show}) => {
  const fl = Math.sin(t * 9) * 16;
  const fl2 = Math.sin(t * 9 + 1.3) * 22;
  const sc = scale * (flip ? -1 : 1);
  return (
    <g transform={`translate(${x},${y}) scale(${sc * show},${scale * show}) translate(-409,-1304)`}>
      <path
        d={`M 322 592 L 498 592 C 560 700 ${610 + fl} 880 ${590 + fl2} 1100 L 240 1100 C ${220 - fl} 880 ${268} 700 322 592 Z`}
        fill={C.blue}
        stroke={C.ink}
        strokeWidth={OUT}
        strokeLinejoin="round"
      />
      <path d={`M 360 640 C 330 800 ${300 - fl * 0.5} 940 ${296 - fl} 1060`} stroke={C.blueL} strokeWidth={10} fill="none" strokeLinecap="round" opacity={0.7} />
    </g>
  );
};

/* ------------------------------------------------------------------ elementi grafici */
const StepCard: React.FC<{n: number; title: string; t0: number; sub?: string}> = ({n, title, t0, sub}) => {
  const t = useT();
  const p = prog(t, t0, t0 + 0.32, E.back);
  return (
    <div style={{position: 'absolute', left: 54, right: 54, top: 96, transform: `translateY(${(1 - p) * -60}px) scale(${mix(0.94, 1, p)})`, opacity: Math.min(1, p * 2), display: 'flex', alignItems: 'center', gap: 22}}>
      <div style={{width: 118, height: 118, borderRadius: 59, background: C.blue, border: `${OUT}px solid ${C.ink}`, boxShadow: `7px 7px 0 ${C.ink}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: FONT, fontWeight: 900, fontSize: 84, color: '#fff', flexShrink: 0}}>{n}</div>
      <div style={{...cardStyle('#fff', 8), padding: '12px 28px 14px', fontFamily: FONT, fontWeight: 900, fontSize: 56, lineHeight: 1.02, color: C.ink, textTransform: 'uppercase', letterSpacing: -1}}>
        {title}
        {sub && <div style={{fontSize: 32, fontWeight: 800, color: C.blue, marginTop: 4, textTransform: 'none', letterSpacing: 0}}>{sub}</div>}
      </div>
    </div>
  );
};

const Tag: React.FC<{t0: number; at: [number, number]; to?: [number, number]; text: string; bg?: string; fg?: string; size?: number; rot?: number; icon?: 'ok' | 'no' | null}> = ({
  t0,
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
  if (t < t0) return null;
  const p = prog(t, t0, t0 + 0.28, E.back);
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

const Burst: React.FC<{t0: number; x: number; y: number; text: string; color?: string; size?: number; rot?: number}> = ({t0, x, y, text, color = C.red, size = 64, rot = -8}) => {
  const t = useT();
  if (t < t0) return null;
  const p = prog(t, t0, t0 + 0.3, E.back);
  const out = prog(t, t0 + 0.9, t0 + 1.1, E.in);
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

const Sparkles: React.FC<{t0: number; x: number; y: number; n?: number; hearts?: boolean}> = ({t0, x, y, n = 10, hearts}) => {
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

/* ------------------------------------------------------------------ personaggi */
const useGirl = () => useTalk(EG);
const useRiky = () => useTalk(ER);

const RikyP: React.FC<{x?: number; y?: number; scale?: number; flip?: boolean} & Partial<RikyProps>> = ({x = RX, y = FLOOR, scale = 0.7, flip = true, ...rest}) => (
  <Riky x={x} y={y} scale={scale} flip={flip} {...rest} />
);

/* ------------------------------------------------------------------ scene */
const S1a: React.FC<{a: number}> = ({a}) => {
  const t = useT();
  const tG = st('g02');
  const talk = useRiky();
  const walk = prog(t, a, a + 1.15, E.out);
  const rx = mix(1380, RX, walk);
  const hop = walk < 1 ? Math.abs(Math.sin(t * 12)) * 16 : 0;
  const wave = Math.sin(t * 11) * 28;
  const h = repH(t, a + 0.2, 2.5) * (1 - prog(t, tG - 0.85, tG - 0.2, E.inOut));
  const cam: Cam = {z: mix(1.05, 1.12, prog(t, a, W.s1a[1], E.lin)), cx: 560, cy: 1000};
  return (
    <AbsoluteFill>
      <World cam={cam}>
        <GirlSide x={GX} y={FLOOR} scale={0.95} h={h} sway={Math.sin(t * 4)} smile={0.2} hurt={0.1} plate={34} />
        <RikyP x={rx} hop={hop} mouth={talk} smile={1} brow={6} armR={t > a + 1.2 ? {hand: [650 + wave * 0.6, 410]} : undefined} tilt={Math.sin(t * 3) * 2} />
      </World>
    </AbsoluteFill>
  );
};

const S1b: React.FC<{a: number}> = ({a}) => {
  const t = useT();
  const gt = useGirl();
  const talkR = useRiky();
  const w = v('g02').words;
  const back = prog(t, a + 0.15, a + 0.6, E.out);
  const pulse = 0.55 + 0.45 * Math.sin(t * 9);
  const lumbar = prog(t, w[5] - 0.1, w[5] + 0.2) * pulse;
  const q = prog(t, w[12], w[12] + 0.3, E.back);
  const cam: Cam = {z: mix(1.55, 1.7, prog(t, a, W.s1b[1], E.lin)), cx: 400, cy: 1010};
  const gm = girlGeom(0, 0, back);
  return (
    <AbsoluteFill>
      <World cam={cam}>
        <g transform={`translate(${GX + 60},${FLOOR - 18}) scale(0.45)`}>
          <Dumbbell x={0} y={0} s={1} color={C.blue} />
        </g>
        <GirlSide x={GX} y={FLOOR} scale={0.95} h={0.02} backHand={back} noDb={back > 0.5} hurt={0.95 * back} mouth={gt} lumbar={lumbar} sway={Math.sin(t * 2) * 0.4} smile={-0.3} />
        <RikyP scale={0.7} mouth={talkR * 0} smile={0.6} brow={10} browTilt={-4} look={-6} />
        {q > 0 && (
          <g transform={`translate(${GX - 20 + gm.hip[0] * 0.95},${FLOOR + gm.hip[1] * 0.95 + 10}) scale(${q})`}>
            <circle r={44} fill="#fff" stroke={C.ink} strokeWidth={OUT} />
            <text y={22} textAnchor="middle" fontFamily="Inter" fontWeight={900} fontSize={64} fill={C.ink}>?</text>
          </g>
        )}
      </World>
      <Burst t0={w[7]} x={700} y={640} text="AHI!" size={78} />
    </AbsoluteFill>
  );
};

const S1c: React.FC<{a: number}> = ({a}) => {
  const t = useT();
  const w = v('r03').words;
  const talk = useRiky();
  const capeP = prog(t, w[3] - 0.25, w[3] + 0.15, E.back);
  const heroP = prog(t, w[3] - 0.2, w[3] + 0.3, E.backSoft);
  const gt = useGirl();
  const cam: Cam = {z: mix(1.12, 1.25, prog(t, a, W.s1c[1], E.lin)), cx: 600, cy: 1010};
  return (
    <AbsoluteFill>
      <World cam={cam}>
        <GirlSide x={GX} y={FLOOR} scale={0.95} h={0.02} backHand={1} noDb hurt={0.5} mouth={gt} smile={0.3} />
        <g transform={`translate(${GX + 60},${FLOOR - 18}) scale(0.45)`}>
          <Dumbbell x={0} y={0} s={1} color={C.blue} />
        </g>
        <CapeBehind x={RX} y={FLOOR - 0} scale={0.7 * mix(1, 1.04, heroP)} flip t={t} show={capeP} />
        <RikyP scale={0.7 * mix(1, 1.04, heroP)} mouth={talk} smile={1} brow={8} armL={{hand: [330, 846]}} armR={{hand: [490, 846]}} tilt={-3 * heroP} bob={Math.sin(t * 6) * 3 * heroP} hop={Math.abs(Math.sin(t * 6)) * 5 * heroP} />
      </World>
      <Burst t0={w[3] + 0.0} x={300} y={600} text="SOS" size={84} color={C.blue} rot={8} />
      <Tag t0={w[6] - 0.05} at={[360, 480]} text="COACH RIKY AL VOLO" bg={C.blue} fg="#fff" size={40} />
      <Sparkles t0={w[3]} x={760} y={760} n={12} />
    </AbsoluteFill>
  );
};

/* scene didattiche: ragazza al centro-sinistra, Riky "presentatore" a destra */
const Explain: React.FC<{
  a: number;
  b: number;
  cam?: (t: number) => Cam;
  girl: (t: number) => Partial<GirlProps>;
  riky?: Partial<RikyProps>;
  children?: (t: number, cam: Cam) => React.ReactNode;
  world?: (t: number, cam: Cam) => React.ReactNode;
}> = ({a, b, cam, girl, riky, children, world}) => {
  const t = useT();
  const talk = useRiky();
  const c = cam ? cam(t) : {z: mix(1.15, 1.24, prog(t, a, b, E.lin)), cx: 520, cy: 1050};
  const gp = girl(t);
  return (
    <AbsoluteFill>
      <World cam={c}>
        <GirlSide x={GX} y={FLOOR} scale={0.95} sway={Math.sin(t * 4) * 0.8} {...gp} />
        <RikyP x={RX} scale={0.58} mouth={talk} smile={0.9} {...riky} />
        {world && world(t, c)}
      </World>
      {children && children(t, c)}
    </AbsoluteFill>
  );
};

const gW = (lx: number, ly: number, scale = 0.95): [number, number] => [GX + lx * scale, FLOOR + ly * scale];

const S2a: React.FC<{a: number}> = ({a}) => {
  const w = v('r04').words;
  return (
    <Explain
      a={a}
      b={W.s2a[1]}
      girl={(t) => ({h: repH(t, a + 0.3, 2.8), smile: 0.8, plate: 34})}
      riky={{armR: {hand: [690, 560]}, brow: 6}}
      children={(t, cam) => {
        const g = girlGeom(repH(t, a + 0.3, 2.8), 0, 0);
        const hp = w2s(gW(g.hand[0], g.hand[1]), cam);
        return (
          <>
            <StepCard n={1} title="Peso adatto al tuo livello" t0={a + 0.05} />
            <Tag t0={w[5] - 0.1} at={[hp[0] + 250, hp[1] - 200]} to={hp} text="PESO GIUSTO" icon="ok" size={44} />
          </>
        );
      }}
    />
  );
};

const S2b: React.FC<{a: number}> = ({a}) => {
  const w = v('r05').words;
  return (
    <Explain
      a={a}
      b={W.s2b[1]}
      cam={(t) => ({z: mix(1.15, 1.3, prog(t, a, W.s2b[1], E.lin)), cx: 520, cy: 1050})}
      girl={(t) => {
        const hh = repH(t, a + 0.1, 2.2, 0.15, 0.95);
        const r = prog(t, w[1], w[1] + 0.6);
        return {h: hh, round: r, plate: 56, plateColor: C.red, lumbar: r * (0.6 + 0.4 * Math.sin(t * 9)), hurt: r * 0.8, smile: -0.2};
      }}
      riky={{armR: {hand: [690, 560]}, brow: 14, browTilt: -4, tilt: -3}}
      children={(t, cam) => (
        <>
          <StepCard n={1} title="Peso adatto al tuo livello" t0={a - 5} />
          <Tag t0={w[0] + 0.05} at={[620, 560]} text="TROPPO PESO" icon="no" bg="#fff" size={46} rot={3} />
          <Tag t0={w[4]} at={[380, 420]} text="LAVORA LA SCHIENA" bg={C.red} fg="#fff" size={40} rot={-3} />
        </>
      )}
    />
  );
};

const S3a: React.FC<{a: number}> = ({a}) => {
  const w = v('r06').words;
  const wrongP = (t: number) => prog(t, w[7], w[7] + 0.4);
  return (
    <Explain
      a={a}
      b={W.s3a[1]}
      cam={(t) => ({z: mix(1.55, 1.7, prog(t, a, W.s3a[1], E.lin)), cx: 360, cy: 1110})}
      girl={(t) => ({h: 0.55 + 0.06 * Math.sin(t * 2), smile: 0.3, plate: 34, heel: wrongP(t) * 0.8})}
      riky={{armR: {hand: [690, 560]}, scale: 0.0001 as unknown as number}}
      world={(t, cam) => {
        const toe = gW(86, -6);
        const heel = gW(-40, -6);
        const pF = prog(t, w[3] - 0.15, w[3] + 0.25, E.back);
        const pH = prog(t, w[9] - 0.1, w[9] + 0.25, E.back);
        const pulse = 1 + 0.12 * Math.sin(t * 10);
        return (
          <>
            {pF > 0 && (
              <g transform={`translate(${toe[0]},${toe[1]}) scale(${pF * pulse})`}>
                <circle r={36} fill={C.blue} opacity={0.35} />
                <path d="M 0 -100 L 0 -34 M -22 -56 L 0 -30 L 22 -56" stroke={C.blue} strokeWidth={14} fill="none" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M 0 -100 L 0 -34 M -22 -56 L 0 -30 L 22 -56" stroke={C.ink} strokeWidth={4} fill="none" strokeLinecap="round" strokeLinejoin="round" opacity={0.5} />
              </g>
            )}
            {pH > 0 && (
              <g transform={`translate(${heel[0]},${heel[1]}) scale(${pH})`}>
                <circle r={30} fill={C.red} opacity={0.35} />
                <path d="M -22 -80 L 22 -36 M 22 -80 L -22 -36" stroke={C.red} strokeWidth={14} strokeLinecap="round" />
              </g>
            )}
          </>
        );
      }}
      children={(t, cam) => {
        const toe = w2s(gW(86, -6), cam);
        const heel = w2s(gW(-40, -6), cam);
        return (
          <>
            <StepCard n={2} title="Peso sulla punta del piede" t0={a + 0.05} />
            <Tag t0={w[3] - 0.05} at={[toe[0] + 200, toe[1] - 230]} to={[toe[0], toe[1] - 20]} text="PUNTA DEL PIEDE" icon="ok" size={46} />
            <Tag t0={w[9] - 0.05} at={[heel[0] - 60, heel[1] - 340]} to={[heel[0], heel[1] - 20]} text="TALLONE" icon="no" size={46} rot={3} />
          </>
        );
      }}
    />
  );
};

const S3b: React.FC<{a: number}> = ({a}) => {
  const w = v('r07').words;
  return (
    <Explain
      a={a}
      b={W.s3b[1]}
      cam={(t) => ({z: mix(1.2, 1.28, prog(t, a, W.s3b[1], E.lin)), cx: 470, cy: 1050})}
      girl={(t) => ({h: repH(t, a + 0.1, 2.4), smile: 0.8, lumbarOk: prog(t, w[2], w[2] + 0.4) * (0.7 + 0.3 * Math.sin(t * 5))})}
      riky={{armR: {hand: [690, 560]}, brow: 6}}
      children={(t, cam) => {
        const g = girlGeom(repH(t, a + 0.1, 2.4), 0, 0);
        const lp = w2s(gW(g.hip[0] - 40, g.hip[1] - 120), cam);
        return (
          <>
            <StepCard n={2} title="Peso sulla punta del piede" t0={a - 5} />
            <Tag t0={w[5] - 0.1} at={[lp[0] + 330, lp[1] - 260]} to={lp} text="LOMBARE SCARICA" icon="ok" size={42} />
          </>
        );
      }}
    />
  );
};

const S4a: React.FC<{a: number}> = ({a}) => {
  const w = v('r08').words;
  const P = 3.2;
  const hh = (t: number) => repH(t, a + 0.05, P, 0.05, 0.96);
  return (
    <Explain
      a={a}
      b={W.s4a[1]}
      cam={(t) => ({z: mix(1.3, 1.4, prog(t, a, W.s4a[1], E.lin)), cx: 330, cy: 1020})}
      girl={(t) => ({h: hh(t), smile: 0.6})}
      riky={{armR: {hand: [690, 560]}, scale: 0.0001 as unknown as number}}
      world={(t) => {
        const g = girlGeom(hh(t), 0, 0);
        const hip = gW(g.hip[0], g.hip[1]);
        const p = prog(t, w[2] - 0.1, w[2] + 0.3, E.back);
        const dash = (t * 40) % 24;
        return (
          <>
            {/* verticale di riferimento dal piede */}
            <line x1={GX} y1={FLOOR - 460} x2={GX} y2={FLOOR} stroke={C.ink} strokeWidth={4} strokeDasharray="10 12" opacity={0.45} />
            {p > 0 && (
              <g>
                <circle cx={hip[0]} cy={hip[1]} r={44 * p} fill={C.blue} opacity={0.3} />
                <circle cx={hip[0]} cy={hip[1]} r={20 * p} fill={C.blue} stroke={C.ink} strokeWidth={OUT - 2} />
                <path d={`M ${hip[0] - 40} ${hip[1] - 150} L ${mix(hip[0] - 40, hip[0] - 260, p)} ${hip[1] - 150}`} stroke={C.ink} strokeWidth={OUT + 6} strokeLinecap="round" strokeDasharray={`18 ${12}`} strokeDashoffset={-dash} />
                <path d={`M ${hip[0] - 40} ${hip[1] - 150} L ${mix(hip[0] - 40, hip[0] - 260, p)} ${hip[1] - 150}`} stroke={C.blue} strokeWidth={OUT} strokeLinecap="round" strokeDasharray="18 12" strokeDashoffset={-dash} />
                <path d={`M ${hip[0] - 250} ${hip[1] - 188} L ${hip[0] - 300} ${hip[1] - 150} L ${hip[0] - 250} ${hip[1] - 112}`} stroke={C.ink} strokeWidth={OUT + 6} fill="none" strokeLinecap="round" strokeLinejoin="round" opacity={p} />
                <path d={`M ${hip[0] - 250} ${hip[1] - 188} L ${hip[0] - 300} ${hip[1] - 150} L ${hip[0] - 250} ${hip[1] - 112}`} stroke={C.blue} strokeWidth={OUT} fill="none" strokeLinecap="round" strokeLinejoin="round" opacity={p} />
              </g>
            )}
          </>
        );
      }}
      children={(t, cam) => {
        const g = girlGeom(hh(t), 0, 0);
        const hp = w2s(gW(g.hip[0], g.hip[1]), cam);
        return (
          <>
            <StepCard n={3} title="Ruota l'anca all'indietro" t0={a + 0.05} />
            <Tag t0={w[2] + 0.1} at={[Math.max(250, hp[0] + 300), hp[1] + 190]} to={[hp[0], hp[1]]} text="ANCA INDIETRO" size={46} bg={C.blue} fg="#fff" rot={-3} />
          </>
        );
      }}
    />
  );
};

const S4b: React.FC<{a: number}> = ({a}) => {
  const w = v('r09').words;
  const hhold = (t: number) => 0.9 + 0.04 * Math.sin(t * 2.5);
  return (
    <Explain
      a={a}
      b={W.s4b[1]}
      cam={(t) => ({z: mix(1.2, 1.32, prog(t, a, W.s4b[1], E.lin)), cx: 430, cy: 1040})}
      girl={(t) => ({h: prog(t, a, a + 0.9, E.inOut) * hhold(t), glute: prog(t, w[1] - 0.1, w[1] + 0.4) * (0.75 + 0.25 * Math.sin(t * 6)), lumbarOk: prog(t, w[7], w[7] + 0.4) * 0.8, smile: 0.9})}
      riky={{armR: {hand: [690, 560]}, brow: 8}}
      children={(t, cam) => {
        const g = girlGeom(hhold(t), 0, 0);
        const gl = w2s(gW(g.hip[0] - 40, g.hip[1] + 20), cam);
        const fem = w2s(gW((g.hip[0] + g.knee[0]) / 2 - 30, (g.hip[1] + g.knee[1]) / 2), cam);
        const lp = w2s(gW(g.hip[0] - 20, g.hip[1] - 150), cam);
        return (
          <>
            <StepCard n={3} title="Ruota l'anca all'indietro" t0={a - 5} />
            <Tag t0={w[1]} at={[gl[0] - 150, gl[1] + 250]} to={gl} text="GLUTEI" bg={C.blue} fg="#fff" size={46} />
            <Tag t0={w[3] + 0.05} at={[fem[0] + 250, fem[1] + 150]} to={fem} text="FEMORALI" bg={C.blue} fg="#fff" size={46} rot={2} />
            <Tag t0={w[7]} at={[lp[0] + 250, lp[1] - 250]} to={lp} text="SCHIENA AL SICURO" icon="ok" size={40} />
          </>
        );
      }}
    />
  );
};

const S5: React.FC<{a: number}> = ({a}) => {
  const t = useT();
  const w = v('g10').words;
  const gt = useGirl();
  const p = prog(t, a + 0.1, a + 0.5, E.back);
  const follow = prog(t, w[3] - 0.05, w[3] + 0.2, E.back);
  const done = t > w[3] + 0.05;
  const bounce = Math.abs(Math.sin(t * 5)) * 6;
  const cam: Cam = {z: mix(1.1, 1.2, prog(t, a, END, E.lin)), cx: 560, cy: 1040};
  return (
    <AbsoluteFill>
      <World cam={cam}>
        <GirlSide x={GX} y={FLOOR - bounce * 0.4} scale={0.95} h={0.02} smile={1} mouth={gt} sway={Math.sin(t * 5)} plate={34} />
        <RikyP x={RX} scale={0.7} smile={1} brow={8} armL={{hand: [250, 560]}} armR={{hand: [640 + Math.sin(t * 8) * 22, 420]}} hop={bounce} tilt={Math.sin(t * 4) * 2} />
      </World>
      {/* card profilo */}
      <div style={{position: 'absolute', left: 54, right: 54, top: 110, transform: `translateY(${(1 - p) * -80}px) scale(${mix(0.95, 1, p)})`, opacity: p, ...cardStyle('#fff', 10), padding: '22px 26px', display: 'flex', alignItems: 'center', gap: 22}}>
        <div style={{width: 112, height: 112, borderRadius: 56, background: C.blue, border: `${OUT}px solid ${C.ink}`, overflow: 'hidden', flexShrink: 0}}>
          <svg width={112} height={112} viewBox="0 0 112 112"><g transform="translate(56,64) scale(0.24) translate(-409,-372)"><Riky x={409} y={1304} scale={1} shadow={false} smile={1} /></g></svg>
        </div>
        <div style={{flex: 1, minWidth: 0}}>
          <div style={{fontFamily: FONT, fontWeight: 900, fontSize: 40, color: C.ink, lineHeight: 1.05}}>riccardofalconi_coach</div>
          <div style={{fontFamily: FONT, fontWeight: 700, fontSize: 28, color: 'rgba(17,17,17,0.6)'}}>Personal trainer · Coach Riky</div>
        </div>
        <div style={{padding: '14px 30px', borderRadius: 18, border: `${OUT - 1}px solid ${C.ink}`, background: done ? '#fff' : C.blue, color: done ? C.ink : '#fff', fontFamily: FONT, fontWeight: 900, fontSize: 38, transform: `scale(${done ? mix(1.15, 1, follow) : 1})`, whiteSpace: 'nowrap'}}>{done ? 'Segui già ✓' : 'Segui'}</div>
      </div>
      {t > w[3] && <Sparkles t0={w[3]} x={560} y={560} n={14} hearts />}
    </AbsoluteFill>
  );
};

/* ------------------------------------------------------------------ sottotitoli */
const buildCaps = (): CapLine[] => {
  const lines: CapLine[] = [];
  // hook grande sul primo scambio
  lines.push({t0: 0.2, t1: W.s1a[1] - 0.02, text: 'Stacchi rumeni, schiena in fiamme?', big: true, size: 104, y: 150, hl: [3, 4], color: C.red, times: [0.25, 0.7, 1.15, 1.5, 1.9], slam: 3});
  const meta: Record<string, {hl: number[]; who: 'R' | 'G'}> = {
    r01: {hl: [3], who: 'R'},
    g02: {hl: [0, 7, 12], who: 'G'},
    r03: {hl: [4, 7], who: 'R'},
    r04: {hl: [0, 3, 6], who: 'R'},
    r05: {hl: [1, 6], who: 'R'},
    r06: {hl: [0, 3, 5], who: 'R'},
    r07: {hl: [4, 7], who: 'R'},
    r08: {hl: [0, 3], who: 'R'},
    r09: {hl: [1, 3, 6], who: 'R'},
    g10: {hl: [1, 3], who: 'G'},
  };
  const small = Object.entries(meta)
    .map(([slot, m]) => {
      const x = v(slot);
      const g = m.who === 'G';
      return {
        t0: x.words[0] - 0.15,
        t1: x.t1 + 0.35,
        text: x.text,
        hl: m.hl,
        times: x.words,
        bottom: 330,
        wrapAt: 20,
        fs: 54,
        bg: g ? C.ink : '#fff',
        fg: g ? C.cream : C.ink,
        hlBg: g ? C.blue : C.blue,
      } as CapLine;
    })
    .sort((p, q) => p.t0 - q.t0);
  small.forEach((l, i) => {
    const nx = small[i + 1];
    if (nx) l.t1 = Math.min(l.t1, nx.t0 - 0.03);
    l.t1 = Math.min(l.t1, END - 0.05);
  });
  return [...lines, ...small];
};
const CAPS = buildCaps();

const TRANS: Tr[] = [
  {t: W.s1b[0], type: 'wipeR', color: C.blue},
  {t: W.s1c[0], type: 'stripes', color: C.ink},
  {t: W.s2a[0], type: 'iris', color: C.blue},
  {t: W.s2b[0], type: 'wipeL', color: C.red},
  {t: W.s3a[0], type: 'wipeU', color: C.blue},
  {t: W.s3b[0], type: 'wipeR', color: C.ink},
  {t: W.s4a[0], type: 'iris', color: C.blue},
  {t: W.s4b[0], type: 'wipeU', color: C.ink},
  {t: W.s5[0], type: 'stripes', color: C.blue},
];

export const Video13: React.FC = () => (
  <AbsoluteFill style={{background: '#fff', fontFamily: FONT}}>
    <style>{`
      @font-face{font-family:'Inter';font-weight:900;src:url(${staticFile('fonts/Inter-Black.otf')});}
      @font-face{font-family:'Inter';font-weight:800;src:url(${staticFile('fonts/Inter-ExtraBold.otf')});}
      @font-face{font-family:'Inter';font-weight:700;src:url(${staticFile('fonts/Inter-Bold.otf')});}
    `}</style>
    <Show from={W.s1a[0]} to={W.s1a[1]} punch={0}><S1a a={W.s1a[0]} /></Show>
    <Show from={W.s1b[0]} to={W.s1b[1]}><S1b a={W.s1b[0]} /></Show>
    <Show from={W.s1c[0]} to={W.s1c[1]}><S1c a={W.s1c[0]} /></Show>
    <Show from={W.s2a[0]} to={W.s2a[1]}><S2a a={W.s2a[0]} /></Show>
    <Show from={W.s2b[0]} to={W.s2b[1]}><S2b a={W.s2b[0]} /></Show>
    <Show from={W.s3a[0]} to={W.s3a[1]}><S3a a={W.s3a[0]} /></Show>
    <Show from={W.s3b[0]} to={W.s3b[1]}><S3b a={W.s3b[0]} /></Show>
    <Show from={W.s4a[0]} to={W.s4a[1]}><S4a a={W.s4a[0]} /></Show>
    <Show from={W.s4b[0]} to={W.s4b[1]}><S4b a={W.s4b[0]} /></Show>
    <Show from={W.s5[0]} to={W.s5[1] + 1}><S5 a={W.s5[0]} /></Show>
    <Captions lines={CAPS} />
    <Transitions list={TRANS} />
    <Grain />
    <Audio src={staticFile('soundtrack13.wav')} />
  </AbsoluteFill>
);
export {shake};
