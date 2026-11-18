/** "B-roll" illustrati per i reel con il clone: l'impiegato (riferimento 03) in vignette animate
 *  — invecchiamento anno per anno, schiena rigida, fiatone sulle scale, sedia e rimandi, allenamento. */
import React from 'react';
import {AbsoluteFill} from 'remotion';
import {C, E, FONT, OUT, mix, prog, useT} from '../brand';
import {ik2, Pt} from './Girl';

/* ------------------------------------------------------------------ palette impiegato */
const SKIN = '#F3D6BE';
const SHIRT = '#8EC3EC';
const SHIRT_D = '#6FA9D6';
const PANTS = '#B5562F';
const PANTS_D = '#8F4022';
const SHOE = '#6B4226';
const HAIR = '#7A4E2D';
const GREY_HAIR = '#B9B6B0';

const lerpCol = (a: string, b: string, p: number) => {
  const h = (s: string) => [1, 3, 5].map((i) => parseInt(s.slice(i, i + 2), 16));
  const A = h(a);
  const B = h(b);
  return '#' + A.map((v, i) => Math.round(mix(v, B[i], p)).toString(16).padStart(2, '0')).join('');
};
const add = (a: Pt, b: Pt, k = 1): Pt => [a[0] + b[0] * k, a[1] + b[1] * k];

/** arto spesso con contorno */
const Limb: React.FC<{pts: Pt[]; w: number; col: string}> = ({pts, w, col}) => {
  const d = 'M ' + pts.map((p) => `${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(' L ');
  return (
    <g>
      <path d={d} fill="none" stroke={C.ink} strokeWidth={w + OUT * 2} strokeLinecap="round" strokeLinejoin="round" />
      <path d={d} fill="none" stroke={col} strokeWidth={w} strokeLinecap="round" strokeLinejoin="round" />
    </g>
  );
};

export type ManPose = {
  hip: Pt; // posizione del bacino (coordinate locali)
  footA: Pt; // caviglia gamba dietro
  footB: Pt; // caviglia gamba davanti
  handA?: Pt; // mano dietro (default: braccio lungo il fianco)
  handB?: Pt;
  lean?: number; // inclinazione del busto in gradi (avanti = +)
  hunch?: number; // 0..1 schiena curva / testa in avanti
  belly?: number; // 0..1
  gray?: number; // 0..1 capelli grigi
  pain?: number; // 0..1 alone rosso lombare
  sweat?: number; // 0..1 gocce
  puff?: number; // 0..1 nuvolette di fiatone
  smile?: number; // -1..1
  phase?: number; // per animare sudore/fiato
  kb?: boolean; // kettlebell al petto
};

/** l'impiegato visto di profilo, rivolto a destra. Piedi a terra ~ y 880 nelle coordinate locali. */
export const Man: React.FC<ManPose> = ({hip, footA, footB, handA, handB, lean = 0, hunch = 0, belly = 0, gray = 0, pain = 0, sweat = 0, puff = 0, smile = 0.4, phase = 0, kb}) => {
  const TH = 200;
  const SH = 196;
  const ang = ((lean + hunch * 26) * Math.PI) / 180;
  const u: Pt = [Math.sin(ang), -Math.cos(ang)]; // anca → spalla
  const n: Pt = [Math.cos(ang), Math.sin(ang)]; // avanti
  const torso = 250 - hunch * 18;
  const sh = add(hip, u, torso);
  const mid = add(hip, u, torso * 0.55);
  // schiena e pancia
  const backTop = add(sh, n, -48);
  const backBot = add(hip, n, -52);
  const hump = add(add(mid, n, -58 - hunch * 46), u, hunch * 40);
  const frontTop = add(sh, n, 46);
  const frontBot = add(hip, n, 50 + belly * 30);
  const bellyC = add(add(hip, u, torso * 0.3), n, 62 + belly * 92);
  // testa
  const neckDir: Pt = [Math.sin(ang + hunch * 0.9), -Math.cos(ang + hunch * 0.9)];
  const head = add(add(sh, neckDir, 80), n, 6 + hunch * 34);
  const hairCol = lerpCol(HAIR, GREY_HAIR, gray);
  // gambe
  const kA = ik2(hip, footA, TH, SH, 1);
  const kB = ik2(add(hip, n, 8), footB, TH, SH, 1);
  // braccia
  const shA = add(sh, n, -10);
  const shB = add(sh, n, 10);
  const hA = handA ?? add(add(shA, u, -230), n, -10);
  const hB = handB ?? add(add(shB, u, -228), n, 18);
  const eA = ik2(shA, hA, 120, 120, -1);
  const eB = ik2(shB, hB, 120, 120, -1);
  const sleeve = (s: Pt, e: Pt): Pt => add(s, [e[0] - s[0], e[1] - s[1]], 0.8);
  const Shoe: React.FC<{f: Pt}> = ({f}) => (
    <path d={`M ${f[0] - 26} ${f[1] - 14} Q ${f[0] - 30} ${f[1] + 22} ${f[0]} ${f[1] + 22} L ${f[0] + 62} ${f[1] + 22} Q ${f[0] + 70} ${f[1] + 4} ${f[0] + 40} ${f[1] - 6} Z`} fill={SHOE} stroke={C.ink} strokeWidth={OUT} strokeLinejoin="round" />
  );
  const t = phase;
  return (
    <g>
      {/* gamba e braccio dietro */}
      <Limb pts={[hip, kA, footA]} w={64} col={PANTS_D} />
      <Shoe f={footA} />
      <Limb pts={[shA, sleeve(shA, eA)]} w={50} col={SHIRT_D} />
      <Limb pts={[sleeve(shA, eA), eA, hA]} w={36} col={SKIN} />
      {/* busto */}
      <path
        d={`M ${backBot[0]} ${backBot[1]} Q ${hump[0]} ${hump[1]} ${backTop[0]} ${backTop[1]} Q ${sh[0]} ${sh[1] - 14} ${frontTop[0]} ${frontTop[1]} Q ${bellyC[0]} ${bellyC[1]} ${frontBot[0]} ${frontBot[1]} Z`}
        fill={SHIRT}
        stroke={C.ink}
        strokeWidth={OUT}
        strokeLinejoin="round"
      />
      {/* bottoni */}
      {[0.25, 0.5, 0.75].map((k, i) => {
        const p = add(add(hip, u, torso * (1 - k)), n, 40 + belly * (k > 0.4 ? 70 : 30));
        return <circle key={i} cx={p[0]} cy={p[1]} r={5} fill="#fff" stroke={C.ink} strokeWidth={2.5} />;
      })}
      {/* cintura */}
      <path d={`M ${add(hip, n, -54)[0]} ${add(hip, n, -54)[1]} L ${add(hip, n, 54 + belly * 30)[0]} ${add(hip, n, 54 + belly * 30)[1]}`} stroke={C.ink} strokeWidth={18} strokeLinecap="round" />
      <rect x={add(hip, n, 30 + belly * 24)[0] - 9} y={add(hip, n, 30)[1] - 11} width={18} height={22} rx={3} fill="#D8B45C" stroke={C.ink} strokeWidth={3} />
      {/* alone lombare */}
      {pain > 0 && (
        <circle cx={add(add(hip, u, 70), n, -40)[0]} cy={add(add(hip, u, 70), n, -40)[1]} r={50 + 10 * Math.sin(t * 6)} fill={C.red} opacity={0.45 * pain} style={{filter: 'blur(8px)'}} />
      )}
      {/* gamba davanti */}
      <Limb pts={[add(hip, n, 8), kB, footB]} w={66} col={PANTS} />
      <Shoe f={footB} />
      {/* testa */}
      <g>
        <rect x={sh[0] - 15} y={sh[1] - 40} width={30} height={44} fill={SKIN} stroke={C.ink} strokeWidth={OUT} transform={`rotate(${((ang + hunch * 0.9) * 180) / Math.PI} ${sh[0]} ${sh[1]})`} />
        <circle cx={head[0]} cy={head[1]} r={60} fill={SKIN} stroke={C.ink} strokeWidth={OUT} />
        {/* orecchio */}
        <ellipse cx={head[0] - 14} cy={head[1] + 6} rx={11} ry={15} fill={SKIN} stroke={C.ink} strokeWidth={4} />
        {/* capelli */}
        <path d={`M ${head[0] - 62} ${head[1] - 2} Q ${head[0] - 66} ${head[1] - 70} ${head[0] + 4} ${head[1] - 68} Q ${head[0] + 66} ${head[1] - 64} ${head[0] + 58} ${head[1] - 18} Q ${head[0] + 30} ${head[1] - 40} ${head[0] - 2} ${head[1] - 34} Q ${head[0] - 30} ${head[1] - 30} ${head[0] - 34} ${head[1] - 4} Z`} fill={hairCol} stroke={C.ink} strokeWidth={4} strokeLinejoin="round" />
        {/* occhiali */}
        <rect x={head[0] + 22} y={head[1] - 14} width={34} height={22} rx={6} fill="rgba(255,255,255,.35)" stroke={C.ink} strokeWidth={5} />
        <line x1={head[0] + 2} y1={head[1] - 6} x2={head[0] + 22} y2={head[1] - 4} stroke={C.ink} strokeWidth={4} />
        <circle cx={head[0] + 42} cy={head[1] - 2} r={4.5} fill={C.ink} />
        {/* naso e bocca */}
        <path d={`M ${head[0] + 58} ${head[1] + 2} Q ${head[0] + 70} ${head[1] + 14} ${head[0] + 58} ${head[1] + 18}`} fill={SKIN} stroke={C.ink} strokeWidth={4} strokeLinecap="round" />
        {puff > 0.3 ? (
          <ellipse cx={head[0] + 44} cy={head[1] + 34} rx={8} ry={10 + 3 * Math.sin(t * 10)} fill={C.ink} />
        ) : (
          <path d={`M ${head[0] + 30} ${head[1] + 34} Q ${head[0] + 42} ${head[1] + 34 + smile * 10} ${head[0] + 54} ${head[1] + 30}`} fill="none" stroke={C.ink} strokeWidth={4} strokeLinecap="round" />
        )}
        {/* rughe */}
        {gray > 0.5 && <path d={`M ${head[0] + 50} ${head[1] - 24} l 10 -2 M ${head[0] + 50} ${head[1] - 32} l 8 -2`} stroke={C.ink} strokeWidth={3} opacity={(gray - 0.5) * 2} strokeLinecap="round" />}
      </g>
      {/* braccio davanti */}
      <Limb pts={[shB, sleeve(shB, eB)]} w={52} col={SHIRT} />
      <Limb pts={[sleeve(shB, eB), eB, hB]} w={36} col={SKIN} />
      {/* orologio */}
      <circle cx={mix(eB[0], hB[0], 0.8)} cy={mix(eB[1], hB[1], 0.8)} r={10} fill="#fff" stroke={C.ink} strokeWidth={4} />
      {kb && (
        <g transform={`translate(${hB[0]},${hB[1] + 30})`}>
          <path d="M -28 -40 Q -28 -70 0 -70 Q 28 -70 28 -40" fill="none" stroke={C.ink} strokeWidth={14} />
          <circle r={46} fill="#E3B23C" stroke={C.ink} strokeWidth={OUT} />
        </g>
      )}
      {/* sudore */}
      {sweat > 0 &&
        [0, 1, 2].map((i) => {
          const k = ((t * 0.9 + i / 3) % 1 + 1) % 1;
          return (
            <path
              key={i}
              d="M 0 -14 Q 10 0 0 8 Q -10 0 0 -14 Z"
              transform={`translate(${head[0] - 20 + i * 34},${head[1] - 50 + k * 70}) scale(${1.3 * sweat})`}
              fill="#7CC7F0"
              stroke={C.ink}
              strokeWidth={2.5}
              opacity={1 - k}
            />
          );
        })}
      {/* fiatone */}
      {puff > 0 &&
        [0, 1].map((i) => {
          const k = ((t * 1.6 + i / 2) % 1 + 1) % 1;
          return <circle key={i} cx={head[0] + 80 + k * 70} cy={head[1] + 34 - k * 20} r={10 + k * 22} fill="#fff" stroke={C.ink} strokeWidth={3} opacity={puff * (1 - k)} />;
        })}
    </g>
  );
};

/* ------------------------------------------------------------------ pose */
const FY = 880;
export const standPose = (t: number, extra: Partial<ManPose> = {}): ManPose => ({
  hip: [200, 500 + 3 * Math.sin(t * 2.4) + (extra.hunch ?? 0) * 24],
  footA: [180, FY],
  footB: [224, FY],
  phase: t,
  ...extra,
});
export const squatPose = (t: number, sq: number, extra: Partial<ManPose> = {}): ManPose => {
  const hip: Pt = [200 - 110 * sq, 500 + 210 * sq];
  return {hip, footA: [180, FY], footB: [210, FY], lean: 38 * sq, kb: true, handA: [hip[0] + 150 + 30 * sq, hip[1] - 150 + 40 * sq], handB: [hip[0] + 150 + 30 * sq, hip[1] - 150 + 40 * sq], phase: t, ...extra};
};
export const sitPose = (t: number, extra: Partial<ManPose> = {}): ManPose => ({
  hip: [170, 640],
  footA: [380, FY],
  footB: [400, FY],
  lean: 12,
  handA: [440, 520],
  handB: [470, 525],
  phase: t,
  ...extra,
});

/* ------------------------------------------------------------------ scene di sfondo */
const Wall: React.FC<{w?: number; floor?: number; window?: boolean; sky?: number}> = ({w = 1080, floor = 1000, window = true, sky = 0}) => (
  <g>
    <rect x={0} y={0} width={w} height={floor} fill="#F6F0E6" />
    {window && (
      <g transform="translate(70,180)">
        <rect width={280} height={320} rx={16} fill={lerpCol('#CFE6F5', '#26304A', sky)} stroke={C.ink} strokeWidth={OUT} />
        <path d="M 0 224 Q 70 186 140 224 T 280 214 L 280 320 L 0 320 Z" fill={lerpCol('#8CC07A', '#3D5640', sky)} />
        <line x1={140} y1={0} x2={140} y2={320} stroke={C.ink} strokeWidth={OUT} />
        <line x1={0} y1={160} x2={280} y2={160} stroke={C.ink} strokeWidth={OUT} />
        <rect x={-14} y={320} width={308} height={22} rx={8} fill="#C9A47A" stroke={C.ink} strokeWidth={OUT} />
      </g>
    )}
    <rect x={0} y={floor - 90} width={w} height={90} fill="#B98A5E" />
    <rect x={0} y={floor - 96} width={w} height={8} fill={C.ink} />
    <rect x={0} y={floor} width={w} height={600} fill="#3A3D42" />
    <rect x={0} y={floor - 4} width={w} height={8} fill={C.ink} />
  </g>
);

const Year: React.FC<{y: number; x?: number; top?: number; col?: string; label?: string}> = ({y, x = 760, top = 230, col = C.ink, label}) => (
  <div style={{position: 'absolute', left: x, top, transform: 'translateX(-50%)', textAlign: 'center'}}>
    <div style={{fontFamily: FONT, fontWeight: 900, fontSize: 132, color: col, letterSpacing: -4, lineHeight: 1, background: '#fff', border: `${OUT}px solid ${C.ink}`, borderRadius: 26, padding: '6px 26px', boxShadow: `8px 8px 0 ${C.ink}`}}>{y}</div>
    {label && <div style={{marginTop: 14, display: 'inline-block', fontFamily: FONT, fontWeight: 900, fontSize: 36, color: '#fff', background: col, borderRadius: 12, padding: '6px 16px'}}>{label}</div>}
  </div>
);

const SvgFull: React.FC<{children: React.ReactNode}> = ({children}) => (
  <svg width={1080} height={1920} viewBox="0 0 1080 1920" style={{position: 'absolute', left: 0, top: 0}}>
    {children}
  </svg>
);

/** 1 · time-lapse: gli anni scorrono, giorno e notte dalla finestra, l'uomo resta fermo */
export const TimeLapse: React.FC<{a: number; askAt: number}> = ({a, askAt}) => {
  const t = useT();
  const p = prog(t, a + 0.4, a + 3.4, E.inOut);
  const yr = Math.round(mix(2026, 2031, p));
  const sky = p > 0 && p < 1 ? 0.5 + 0.5 * Math.sin((t - a) * 14) : 0;
  const ask = prog(t, askAt, askAt + 0.5, E.back);
  return (
    <AbsoluteFill>
      <SvgFull>
        <Wall sky={sky} />
        {/* orologio che gira */}
        <g transform="translate(560,300)">
          <circle r={80} fill="#fff" stroke="#8A5A33" strokeWidth={14} />
          <line x1={0} y1={0} x2={0} y2={-50} stroke={C.ink} strokeWidth={8} strokeLinecap="round" transform={`rotate(${(t - a) * 720 * (p < 1 ? 1 : 0.02)})`} />
          <line x1={0} y1={0} x2={34} y2={0} stroke={C.ink} strokeWidth={8} strokeLinecap="round" transform={`rotate(${(t - a) * 60})`} />
          <circle r={8} fill={C.ink} />
        </g>
        <g transform="translate(300,330) scale(1.05)">
          <Man {...standPose(t, {hunch: 0.15 + 0.1 * p, belly: 0.25, smile: 0})} />
        </g>
        {/* due futuri possibili */}
        {ask > 0 && (
          <>
            <g transform="translate(-20,620) scale(0.62)" opacity={0.85 * ask}>
              <Man {...standPose(t, {hunch: 1, belly: 1, gray: 1, smile: -0.6, pain: 0.8})} />
            </g>
            <g transform="translate(760,620) scale(0.62)" opacity={0.85 * ask}>
              <Man {...standPose(t, {belly: 0, gray: 0.6, smile: 1})} />
            </g>
            <text x={540} y={1180} textAnchor="middle" fontFamily="Inter" fontWeight={900} fontSize={200} fill={C.blue} stroke={C.ink} strokeWidth={6} transform={`translate(540,1110) scale(${ask}) translate(-540,-1110)`}>?</text>
          </>
        )}
      </SvgFull>
      <Year y={yr} x={800} top={170} col={p >= 1 ? C.blue : C.ink} />
    </AbsoluteFill>
  );
};

/** 2a · sulla stessa sedia, stessi rimandi: calendario con "comincio lunedì" barrato più volte */
export const ChairLoop: React.FC<{a: number; b: number; children?: React.ReactNode}> = ({a, b, children}) => {
  const t = useT();
  const d = t - a;
  const strikes = Math.min(4, Math.floor(Math.max(0, d - 0.6) / 0.55));
  return (
    <AbsoluteFill>
      <SvgFull>
        <Wall window={false} />
        {/* calendario a muro */}
        <g transform="translate(600,150)">
          <rect width={380} height={420} rx={18} fill="#fff" stroke={C.ink} strokeWidth={OUT} />
          <rect width={380} height={80} rx={18} fill={C.ink} />
          <text x={190} y={56} textAnchor="middle" fontFamily="Inter" fontWeight={900} fontSize={40} fill="#fff">LUNEDÌ</text>
          {[0, 1, 2, 3].map((i) => (
            <g key={i} transform={`translate(30,${110 + i * 74})`}>
              <text x={0} y={44} fontFamily="Inter" fontWeight={800} fontSize={40} fill={C.ink}>comincio</text>
              {strikes > i && <line x1={-8} y1={30} x2={200} y2={30} stroke={C.red} strokeWidth={9} strokeLinecap="round" />}
              {strikes > i && <text x={230} y={46} fontFamily="Inter" fontWeight={900} fontSize={44} fill={C.red}>✗</text>}
            </g>
          ))}
        </g>
        {/* scrivania */}
        <rect x={360} y={600} width={520} height={26} rx={8} fill="#C9A47A" stroke={C.ink} strokeWidth={OUT} />
        <rect x={820} y={626} width={22} height={370} fill="#A5774D" stroke={C.ink} strokeWidth={OUT - 2} />
        {/* laptop */}
        <path d="M 470 598 L 560 470 L 600 470 L 520 598 Z" fill="#5B5F66" stroke={C.ink} strokeWidth={OUT} strokeLinejoin="round" />
        <rect x={430} y={588} width={190} height={14} rx={5} fill="#7A7F87" stroke={C.ink} strokeWidth={4} />
        {/* sedia */}
        <rect x={60} y={340} width={34} height={330} rx={14} fill="#2B2E33" stroke={C.ink} strokeWidth={OUT} transform="rotate(-6 77 670)" />
        <rect x={70} y={660} width={240} height={34} rx={14} fill="#2B2E33" stroke={C.ink} strokeWidth={OUT} />
        <rect x={180} y={694} width={20} height={200} fill="#5B5F66" stroke={C.ink} strokeWidth={4} />
        <path d="M 90 960 L 290 960" stroke={C.ink} strokeWidth={14} strokeLinecap="round" />
        <g transform="translate(-10,40)">
          <Man {...sitPose(t, {hunch: mix(0.3, 0.8, prog(t, a, b, E.lin)), belly: 0.4, smile: -0.3, handA: [450 + 8 * Math.sin(t * 20), 525], handB: [480 + 8 * Math.cos(t * 22), 528]})} />
        </g>
      </SvgFull>
      {children}
    </AbsoluteFill>
  );
};

/** 2b · invecchiamento anno per anno: schiena che si curva, pancia, capelli grigi */
export const Aging: React.FC<{a: number; b: number; stiffAt: number; jeansAt: number}> = ({a, b, stiffAt, jeansAt}) => {
  const t = useT();
  const p = prog(t, a + 0.2, b - 0.3, E.inOut);
  const yr = Math.round(mix(2026, 2031, p));
  const pain = prog(t, stiffAt, stiffAt + 0.5);
  const jeans = prog(t, jeansAt, jeansAt + 0.4, E.back);
  const pose = standPose(t, {hunch: p, belly: mix(0.15, 1, p), gray: p, pain, smile: mix(0.2, -0.7, p)});
  // scricchiolii vicino alla schiena
  const cracks = pain > 0 ? Math.floor((t * 3) % 2) : -1;
  return (
    <AbsoluteFill>
      <SvgFull>
        <Wall />
        {/* fantasma di com'era nel 2026 */}
        <g transform="translate(270,330) scale(1.1)" opacity={0.18 * p}>
          <Man {...standPose(t, {belly: 0.15, smile: 0.2})} />
        </g>
        <g transform="translate(270,330) scale(1.1)">
          <Man {...pose} />
        </g>
        {cracks >= 0 && (
          <g transform="translate(330,780)" stroke={C.red} strokeWidth={8} strokeLinecap="round" fill="none">
            <path d={cracks ? 'M 0 0 l -30 -20 l 10 -14 l -26 -16' : 'M -10 30 l -34 6 l 8 16 l -30 10'} />
          </g>
        )}
        {/* bottone dei jeans che tira */}
        {jeans > 0 && (
          <g transform={`translate(830,1020) scale(${jeans * 0.9})`}>
            <circle r={150} fill="#fff" stroke={C.ink} strokeWidth={OUT} />
            <rect x={-110} y={-40} width={220} height={150} fill="#4C6A9A" stroke={C.ink} strokeWidth={4} />
            <path d={`M -110 -40 L ${-20 - 10 * Math.sin(t * 9)} -40 M ${20 + 10 * Math.sin(t * 9)} -40 L 110 -40`} stroke={C.ink} strokeWidth={6} />
            <rect x={-110} y={-70} width={220} height={34} fill="#3A5585" stroke={C.ink} strokeWidth={4} />
            <circle cx={0} cy={-54} r={20 + 2 * Math.sin(t * 18)} fill="#D8B45C" stroke={C.ink} strokeWidth={4} />
            <path d="M -50 -54 L -26 -54 M 26 -54 L 50 -54" stroke={C.red} strokeWidth={7} strokeLinecap="round" />
          </g>
        )}
      </SvgFull>
      <Year y={yr} x={800} top={150} col={p >= 1 ? C.red : C.ink} label={p >= 1 ? '+5 ANNI' : undefined} />
    </AbsoluteFill>
  );
};

/** 2c / 3 · scale: pesanti (fiatone, lento) oppure leggere (scenario 2) */
export const Stairs: React.FC<{a: number; heavy?: boolean; rate?: number; children?: React.ReactNode}> = ({a, heavy, rate = heavy ? 0.55 : 1.5, children}) => {
  const t = useT();
  const SW = 150;
  const SHt = 95;
  const c = Math.max(0, t - a) * rate + 1;
  const n = Math.floor(c);
  const f = c - n;
  const fe = E.inOut(f);
  const stepTop = (i: number): Pt => [i * SW + SW * 0.5, -i * SHt];
  const swingFrom = stepTop(n - 1);
  const swingTo = stepTop(n + 1);
  const swing: Pt = [mix(swingFrom[0], swingTo[0], fe), mix(swingFrom[1], swingTo[1], fe) - Math.sin(f * Math.PI) * 90];
  const plant = stepTop(n);
  const feet: [Pt, Pt] = n % 2 ? [plant, swing] : [swing, plant];
  const hipW: Pt = [(c - 0.15) * SW + SW * 0.5, -(c - 0.1) * SHt - 360 + (heavy ? 10 * Math.sin(f * Math.PI) : 0)];
  const scr: Pt = [440, 560];
  const off: Pt = [scr[0] - hipW[0], scr[1] - hipW[1]];
  const L = (p: Pt): Pt => [p[0] + off[0], p[1] + off[1]];
  const k0 = n - 6;
  return (
    <AbsoluteFill>
      <SvgFull>
        <rect x={0} y={0} width={1080} height={1300} fill="#F6F0E6" />
        {/* corrimano */}
        <line x1={L(stepTop(k0))[0]} y1={L(stepTop(k0))[1] - 300} x2={L(stepTop(n + 8))[0]} y2={L(stepTop(n + 8))[1] - 300} stroke="#8A5A33" strokeWidth={16} strokeLinecap="round" />
        {Array.from({length: 16}).map((_, j) => {
          const i = k0 + j;
          const p = L([i * SW, -i * SHt]);
          return (
            <g key={i}>
              <line x1={p[0] + SW * 0.5} y1={p[1]} x2={p[0] + SW * 0.5} y2={p[1] - 300} stroke="#8A5A33" strokeWidth={6} />
              <path d={`M ${p[0]} ${p[1]} L ${p[0] + SW} ${p[1]} L ${p[0] + SW} ${p[1] + 2000} L ${p[0]} ${p[1] + 2000} Z`} fill="#C9C3B8" stroke={C.ink} strokeWidth={OUT} />
              <rect x={p[0]} y={p[1]} width={SW} height={16} fill="#A79F92" stroke={C.ink} strokeWidth={4} />
            </g>
          );
        })}
        <g transform={`translate(${off[0]},${off[1]})`}>
          <Man
            hip={hipW}
            footA={[feet[0][0] - 20, feet[0][1] - 24]}
            footB={[feet[1][0] - 20, feet[1][1] - 24]}
            lean={heavy ? 16 : 8}
            hunch={heavy ? 0.85 : 0}
            belly={heavy ? 1 : 0.1}
            gray={heavy ? 1 : 0.5}
            sweat={heavy ? 1 : 0}
            puff={heavy ? 1 : 0}
            smile={heavy ? -0.6 : 1}
            phase={t}
            handB={heavy ? [hipW[0] + 140, hipW[1] - 30] : undefined}
          />
        </g>
      </SvgFull>
      {heavy && <Heart t0={a + 0.3} />}
      {children}
    </AbsoluteFill>
  );
};

/** cuore che batte veloce + tracciato */
const Heart: React.FC<{t0: number}> = ({t0}) => {
  const t = useT();
  const p = prog(t, t0, t0 + 0.4, E.back);
  const beat = 1 + 0.16 * Math.max(0, Math.sin(t * 16));
  const pts = Array.from({length: 40}).map((_, i) => {
    const x = i * 9;
    const ph = (i + t * 30) % 10;
    const y = ph < 1 ? -40 : ph < 2 ? 30 : 0;
    return `${x},${y}`;
  });
  return (
    <div style={{position: 'absolute', left: 640, top: 150, transform: `scale(${p})`, transformOrigin: 'left top', background: '#fff', border: `${OUT}px solid ${C.ink}`, borderRadius: 24, boxShadow: `8px 8px 0 ${C.ink}`, padding: '14px 20px', display: 'flex', alignItems: 'center', gap: 14}}>
      <svg width={70} height={64} viewBox="-35 -32 70 64">
        <path d="M 0 26 C -40 0 -34 -30 -14 -28 C -4 -27 0 -18 0 -14 C 0 -18 4 -27 14 -28 C 34 -30 40 0 0 26 Z" fill={C.red} stroke={C.ink} strokeWidth={4} transform={`scale(${beat})`} />
      </svg>
      <svg width={200} height={90} viewBox="0 -45 360 90">
        <polyline points={pts.join(' ')} fill="none" stroke={C.red} strokeWidth={6} strokeLinejoin="round" />
      </svg>
    </div>
  );
};

/** 3 · allenamento: goblet squat in studio + mesi che scorrono + barra forza */
export const Training: React.FC<{a: number; b: number; children?: React.ReactNode}> = ({a, b, children}) => {
  const t = useT();
  const cyc = (t - a) / 1.6;
  const sq = 0.5 - 0.5 * Math.cos(Math.max(0, cyc) * Math.PI * 2);
  const months = prog(t, a + 0.5, b - 0.2, E.lin);
  const m = Math.min(12, 1 + Math.floor(months * 12));
  return (
    <AbsoluteFill>
      <SvgFull>
        <Wall />
        <rect x={120} y={1000} width={620} height={24} rx={10} fill="#2F6F73" stroke={C.ink} strokeWidth={OUT} />
        <g transform="translate(250,140) scale(1.0)">
          <Man {...squatPose(t, sq * 0.9, {belly: mix(0.4, 0.05, months), gray: 0.2, smile: 0.8, hunch: 0})} />
        </g>
        {/* barra forza */}
        <g transform="translate(860,320)">
          <rect x={-46} y={0} width={92} height={560} rx={20} fill="#fff" stroke={C.ink} strokeWidth={OUT} />
          <rect x={-34} y={548 - 536 * mix(0.15, 1, months)} width={68} height={536 * mix(0.15, 1, months)} rx={14} fill={C.blue} />
          <text x={0} y={620} textAnchor="middle" fontFamily="Inter" fontWeight={900} fontSize={36} fill={C.ink}>FORZA</text>
        </g>
      </SvgFull>
      <div style={{position: 'absolute', left: 860, top: 200, transform: 'translateX(-50%)', fontFamily: FONT, fontWeight: 900, fontSize: 44, color: '#fff', background: C.ink, borderRadius: 14, padding: '6px 18px', whiteSpace: 'nowrap'}}>MESE {m}</div>
      {children}
    </AbsoluteFill>
  );
};

/** 4 · confronto 2031: scenario 1 vs scenario 2 */
export const Compare: React.FC<{a: number}> = ({a}) => {
  const t = useT();
  const l = prog(t, a + 0.1, a + 0.5, E.back);
  const r = prog(t, a + 0.4, a + 0.8, E.back);
  return (
    <AbsoluteFill>
      <SvgFull>
        <rect x={0} y={0} width={540} height={1300} fill="#EFE3DA" />
        <rect x={540} y={0} width={540} height={1300} fill="#E6EFE0" />
        <rect x={0} y={860} width={1080} height={440} fill="#3A3D42" />
        <line x1={540} y1={0} x2={540} y2={1300} stroke={C.ink} strokeWidth={OUT} />
        <g transform={`translate(120,${240 + (1 - l) * 60}) scale(0.75)`} opacity={l}>
          <Man {...standPose(t, {hunch: 1, belly: 1, gray: 1, pain: 0.8, sweat: 0.8, puff: 0.6, smile: -0.7})} />
        </g>
        <g transform={`translate(660,${240 + (1 - r) * 60}) scale(0.75)`} opacity={r}>
          <Man {...standPose(t, {belly: 0, gray: 0.6, smile: 1})} />
        </g>
      </SvgFull>
      <div style={{position: 'absolute', left: 0, width: 540, top: 120, textAlign: 'center', opacity: l}}>
        <div style={{fontFamily: FONT, fontWeight: 900, fontSize: 40, color: '#fff', background: C.red, display: 'inline-block', borderRadius: 14, padding: '8px 18px', border: `${OUT}px solid ${C.ink}`}}>SCENARIO 1</div>
        <div style={{fontFamily: FONT, fontWeight: 900, fontSize: 88, color: C.ink, marginTop: 8}}>2031</div>
      </div>
      <div style={{position: 'absolute', left: 540, width: 540, top: 120, textAlign: 'center', opacity: r}}>
        <div style={{fontFamily: FONT, fontWeight: 900, fontSize: 40, color: '#fff', background: C.blue, display: 'inline-block', borderRadius: 14, padding: '8px 18px', border: `${OUT}px solid ${C.ink}`}}>SCENARIO 2</div>
        <div style={{fontFamily: FONT, fontWeight: 900, fontSize: 88, color: C.ink, marginTop: 8}}>2031</div>
      </div>
    </AbsoluteFill>
  );
};

/** 168 ore della settimana, 3 evidenziate */
export const HoursBar: React.FC<{a: number; top?: number}> = ({a, top = 1010}) => {
  const t = useT();
  const p = prog(t, a, a + 0.8, E.out);
  const hi = prog(t, a + 0.7, a + 1.1, E.back);
  return (
    <div style={{position: 'absolute', left: 60, right: 60, top, opacity: Math.min(1, p * 2)}}>
      <div style={{display: 'flex', flexWrap: 'wrap', gap: 4, width: 960}}>
        {Array.from({length: 168}).map((_, i) => {
          const on = i >= 165;
          const show = i / 168 < p;
          return <div key={i} style={{width: 22, height: 22, borderRadius: 5, background: on ? C.blue : '#D9D4CB', border: on ? `3px solid ${C.ink}` : 'none', transform: `scale(${show ? (on ? mix(1, 1.35, hi) : 1) : 0})`}} />;
        })}
      </div>
      <div style={{marginTop: 16, fontFamily: FONT, fontWeight: 900, fontSize: 46, color: C.ink, textAlign: 'center'}}><span style={{background: '#fff', border: `${OUT}px solid ${C.ink}`, borderRadius: 14, padding: '4px 18px'}}>
        <span style={{color: C.blue}}>3 ore</span> su 168 a settimana</span>
      </div>
    </div>
  );
};
