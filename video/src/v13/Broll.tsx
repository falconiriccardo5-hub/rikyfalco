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
  legK?: number; // proporzione gambe (leve)
  torsoK?: number;
  neck?: number; // 0..1 alone rosso collo/spalle
};

/** l'impiegato visto di profilo, rivolto a destra. Piedi a terra ~ y 880 nelle coordinate locali. */
export const Man: React.FC<ManPose> = ({hip, footA, footB, handA, handB, lean = 0, hunch = 0, belly = 0, gray = 0, pain = 0, sweat = 0, puff = 0, smile = 0.4, phase = 0, kb, legK = 1, torsoK = 1, neck = 0}) => {
  const TH = 200 * legK;
  const SH = 196 * legK;
  const ang = ((lean + hunch * 26) * Math.PI) / 180;
  const u: Pt = [Math.sin(ang), -Math.cos(ang)]; // anca → spalla
  const n: Pt = [Math.cos(ang), Math.sin(ang)]; // avanti
  const torso = (250 - hunch * 18) * torsoK;
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
      {neck > 0 && <circle cx={sh[0] - 10} cy={sh[1] - 10} r={46 + 8 * Math.sin(t * 6)} fill={C.red} opacity={0.45 * neck} style={{filter: 'blur(8px)'}} />}
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

/* ================================================================== b-roll per i reel 1–4 */
const mixPt = (a: Pt, b: Pt, k: number): Pt => [mix(a[0], b[0], k), mix(a[1], b[1], k)];
export const mixPose = (A: ManPose, B: ManPose, k: number): ManPose => ({
  ...B,
  hip: mixPt(A.hip, B.hip, k),
  footA: mixPt(A.footA, B.footA, k),
  footB: mixPt(A.footB, B.footB, k),
  handA: A.handA && B.handA ? mixPt(A.handA, B.handA, k) : k < 0.5 ? A.handA : B.handA,
  handB: A.handB && B.handB ? mixPt(A.handB, B.handB, k) : k < 0.5 ? A.handB : B.handB,
  lean: mix(A.lean ?? 0, B.lean ?? 0, k),
});

const WallClock: React.FC<{x: number; y: number; h: number; r?: number}> = ({x, y, h, r = 70}) => (
  <g transform={`translate(${x},${y})`}>
    <circle r={r} fill="#fff" stroke="#8A5A33" strokeWidth={12} />
    {Array.from({length: 12}).map((_, i) => (
      <line key={i} x1={0} y1={-r + 12} x2={0} y2={-r + 22} stroke={C.ink} strokeWidth={4} transform={`rotate(${i * 30})`} />
    ))}
    <line x1={0} y1={0} x2={0} y2={-r * 0.48} stroke={C.ink} strokeWidth={8} strokeLinecap="round" transform={`rotate(${h * 30})`} />
    <line x1={0} y1={0} x2={0} y2={-r * 0.72} stroke={C.ink} strokeWidth={6} strokeLinecap="round" transform={`rotate(${(h % 1) * 360})`} />
    <circle r={7} fill={C.ink} />
  </g>
);

const Desk: React.FC = () => (
  <g>
    <rect x={360} y={600} width={520} height={26} rx={8} fill="#C9A47A" stroke={C.ink} strokeWidth={OUT} />
    <rect x={820} y={626} width={22} height={370} fill="#A5774D" stroke={C.ink} strokeWidth={OUT - 2} />
    <path d="M 470 598 L 560 470 L 600 470 L 520 598 Z" fill="#5B5F66" stroke={C.ink} strokeWidth={OUT} strokeLinejoin="round" />
    <rect x={430} y={588} width={190} height={14} rx={5} fill="#7A7F87" stroke={C.ink} strokeWidth={4} />
    <rect x={700} y={556} width={46} height={44} rx={6} fill="#fff" stroke={C.ink} strokeWidth={4} />
    <path d="M 746 566 q 18 0 18 14 q 0 12 -18 12" fill="none" stroke={C.ink} strokeWidth={4} />
  </g>
);
const Chair: React.FC<{x?: number}> = ({x = 0}) => (
  <g transform={`translate(${x},0)`}>
    <rect x={60} y={340} width={34} height={330} rx={14} fill="#2B2E33" stroke={C.ink} strokeWidth={OUT} transform="rotate(-6 77 670)" />
    <rect x={70} y={660} width={240} height={34} rx={14} fill="#2B2E33" stroke={C.ink} strokeWidth={OUT} />
    <rect x={180} y={694} width={20} height={200} fill="#5B5F66" stroke={C.ink} strokeWidth={4} />
    <path d="M 90 960 L 290 960" stroke={C.ink} strokeWidth={14} strokeLinecap="round" />
  </g>
);

const Clock24: React.FC<{h: number; x?: number; top?: number; col?: string; label?: string}> = ({h, x = 800, top = 150, col = C.ink, label}) => {
  const hh = Math.floor(h);
  const mm = Math.floor((h - hh) * 60);
  return <Year y={`${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}` as unknown as number} x={x} top={top} col={col} label={label} />;
};

/** giornata alla scrivania: l'orologio corre dalle 9 alle 18, fuori si fa sera, la schiena cede */
export const DeskDay: React.FC<{a: number; b: number; from?: number; to?: number; label?: string; children?: React.ReactNode}> = ({a, b, from = 9, to = 18, label, children}) => {
  const t = useT();
  const p = prog(t, a + 0.2, b - 0.4, E.inOut);
  const h = mix(from, to, p);
  return (
    <AbsoluteFill>
      <SvgFull>
        <Wall window={false} />
        <g transform="translate(560,140)">
          <rect width={300} height={300} rx={16} fill={lerpCol('#CFE6F5', '#F2B27A', Math.max(0, p * 1.4 - 0.4))} stroke={C.ink} strokeWidth={OUT} />
          <circle cx={mix(60, 240, p)} cy={mix(70, 230, p)} r={34} fill="#FFE9A8" stroke={C.ink} strokeWidth={4} />
          <path d="M 0 220 Q 70 186 150 220 T 300 210 L 300 300 L 0 300 Z" fill="#8CC07A" />
          <line x1={150} y1={0} x2={150} y2={300} stroke={C.ink} strokeWidth={OUT} />
          <rect x={-14} y={300} width={328} height={22} rx={8} fill="#C9A47A" stroke={C.ink} strokeWidth={OUT} />
        </g>
        <WallClock x={420} y={200} h={h} />
        <Desk />
        <Chair />
        <g transform="translate(-10,40)">
          <Man {...sitPose(t, {hunch: mix(0.15, 0.95, p), belly: 0.35, smile: mix(0.2, -0.6, p), pain: prog(t, b - 1.6, b - 0.8), neck: prog(t, b - 1.4, b - 0.6), handA: [450 + 8 * Math.sin(t * 20), 525], handB: [480 + 8 * Math.cos(t * 22), 528]})} />
        </g>
      </SvgFull>
      <Clock24 h={h} x={830} top={1110} col={p >= 1 ? C.red : C.ink} label={label} />
      {children}
    </AbsoluteFill>
  );
};

/** si alza dalla sedia e ci mette un attimo a raddrizzarsi */
export const StandUp: React.FC<{a: number; b: number; children?: React.ReactNode}> = ({a, b, children}) => {
  const t = useT();
  const up = prog(t, a + 0.3, a + 1.4, E.inOut);
  const straight = prog(t, a + 1.8, b - 1, E.inOut);
  const sit = sitPose(t, {hunch: 0.9, handA: [300, 640], handB: [330, 650]});
  const stand = standPose(t, {hunch: mix(0.95, 0.25, straight * 0.8), handA: [150, 650], handB: undefined});
  const pose = mixPose(sit, {...stand, hip: [330, stand.hip[1]], footA: [310, 880], footB: [354, 880]}, up);
  return (
    <AbsoluteFill>
      <SvgFull>
        <Wall />
        <Chair />
        <g transform="translate(60,90)">
          <Man {...pose} belly={0.35} pain={0.9 - straight * 0.4} neck={0.9 - straight * 0.4} smile={-0.6} phase={t} hunch={up < 1 ? 0.9 : pose.hunch} />
        </g>
        {/* freccia spalle in avanti */}
        <g transform="translate(560,480)" opacity={prog(t, a + 1.5, a + 1.9)}>
          <path d="M 0 0 L 90 0" stroke={C.red} strokeWidth={14} strokeLinecap="round" />
          <path d="M 70 -22 L 100 0 L 70 22" fill="none" stroke={C.red} strokeWidth={14} strokeLinecap="round" strokeLinejoin="round" />
        </g>
      </SvgFull>
      {children}
    </AbsoluteFill>
  );
};

/** il corpo si adatta: in piedi ma ancora con la "forma della sedia" */
export const ChairShape: React.FC<{a: number; children?: React.ReactNode}> = ({a, children}) => {
  const t = useT();
  const p = prog(t, a + 0.3, a + 1.2, E.out);
  return (
    <AbsoluteFill>
      <SvgFull>
        <Wall />
        {/* sagoma della sedia tratteggiata dietro di lui */}
        <g opacity={p} transform="translate(140,40)">
          <path d="M 70 340 L 50 690 L 310 690" fill="none" stroke={C.blue} strokeWidth={10} strokeDasharray="22 16" strokeLinecap="round" />
        </g>
        <g transform="translate(150,90)">
          <Man {...standPose(t, {hunch: 0.85, belly: 0.35, smile: -0.4, neck: 0.6, pain: 0.6})} />
        </g>
      </SvgFull>
      {children}
    </AbsoluteFill>
  );
};

/** risveglio: sveglia, seduto sul letto con la mano sulla schiena */
export const Morning: React.FC<{a: number; children?: React.ReactNode}> = ({a, children}) => {
  const t = useT();
  const ring = Math.sin(t * 50) * 6 * (t - a < 1.4 ? 1 : 0);
  return (
    <AbsoluteFill>
      <SvgFull>
        <Wall sky={0} />
        {/* letto */}
        <rect x={40} y={700} width={560} height={150} rx={20} fill="#fff" stroke={C.ink} strokeWidth={OUT} />
        <rect x={40} y={660} width={560} height={60} rx={20} fill="#B79BF2" stroke={C.ink} strokeWidth={OUT} />
        <rect x={20} y={520} width={40} height={460} rx={12} fill="#A5774D" stroke={C.ink} strokeWidth={OUT} />
        <rect x={60} y={600} width={150} height={70} rx={30} fill="#fff" stroke={C.ink} strokeWidth={OUT} />
        <rect x={60} y={850} width={20} height={130} fill="#A5774D" stroke={C.ink} strokeWidth={4} />
        <rect x={560} y={850} width={20} height={130} fill="#A5774D" stroke={C.ink} strokeWidth={4} />
        {/* comodino e sveglia */}
        <rect x={830} y={720} width={190} height={260} rx={10} fill="#C9A47A" stroke={C.ink} strokeWidth={OUT} />
        <g transform={`translate(925,650) rotate(${ring})`}>
          <circle r={60} fill="#fff" stroke={C.ink} strokeWidth={OUT} />
          <text y={16} textAnchor="middle" fontFamily="Inter" fontWeight={900} fontSize={40} fill={C.red}>7:00</text>
          <circle cx={-44} cy={-52} r={16} fill={C.red} stroke={C.ink} strokeWidth={4} />
          <circle cx={44} cy={-52} r={16} fill={C.red} stroke={C.ink} strokeWidth={4} />
        </g>
        <g transform="translate(300,40)">
          <Man hip={[200, 650]} footA={[400, 880]} footB={[420, 880]} lean={10} hunch={0.8} belly={0.35} pain={1} neck={0.5} smile={-0.7} handA={[150, 600]} handB={[330, 640]} phase={t} />
        </g>
      </SvgFull>
      {children}
    </AbsoluteFill>
  );
};

/** in macchina nel traffico */
export const Car: React.FC<{a: number; children?: React.ReactNode}> = ({a, children}) => {
  const t = useT();
  const d = t - a;
  return (
    <AbsoluteFill>
      <SvgFull>
        <rect x={0} y={0} width={1080} height={1300} fill="#CFE6F5" />
        <path d={`M ${-200 - (d * 40) % 400} 760 q 200 -120 400 0 t 400 0 t 400 0 t 400 0 t 400 0 L 1600 900 L -200 900 Z`} fill="#8CC07A" />
        <rect x={0} y={880} width={1080} height={420} fill="#4A4D52" />
        {Array.from({length: 8}).map((_, i) => (
          <rect key={i} x={((i * 220 - d * 60) % 1760 + 1760) % 1760 - 200} y={1080} width={120} height={16} fill="#fff" />
        ))}
        {/* auto davanti in coda */}
        <rect x={760} y={760} width={360} height={150} rx={40} fill="#C9C3B8" stroke={C.ink} strokeWidth={OUT} />
        <circle cx={1000} cy={760} r={22} fill={C.red} opacity={0.6 + 0.4 * Math.sin(t * 8)} stroke={C.ink} strokeWidth={4} />
        {/* l'impiegato al volante */}
        <g transform="translate(70,90) scale(0.95)">
          <Man hip={[260, 700]} footA={[480, 880]} footB={[500, 880]} lean={-12} hunch={0.5} belly={0.35} smile={-0.5} handA={[470, 560]} handB={[490, 570]} phase={t} neck={0.4} />
        </g>
        {/* carrozzeria */}
        <path d="M 30 1000 L 30 760 Q 40 700 120 690 L 200 690 L 260 520 Q 280 470 340 470 L 520 470 Q 570 470 600 520 L 680 690 L 720 700 L 720 1000 Z" fill="none" stroke={C.ink} strokeWidth={OUT} />
        <path d="M 30 1000 L 30 760 Q 40 700 120 690 L 720 700 L 720 1000 Z" fill={C.blue} stroke={C.ink} strokeWidth={OUT} />
        <circle cx={500} cy={540} r={60} fill="none" stroke={C.ink} strokeWidth={14} transform="rotate(-20 500 540)" />
        <circle cx={170} cy={1000} r={78} fill="#2B2E33" stroke={C.ink} strokeWidth={OUT} />
        <circle cx={590} cy={1000} r={78} fill="#2B2E33" stroke={C.ink} strokeWidth={OUT} />
        <circle cx={170} cy={1000} r={30} fill={C.steel} />
        <circle cx={590} cy={1000} r={30} fill={C.steel} />
      </SvgFull>
      {children}
    </AbsoluteFill>
  );
};

/** palestra provata e mollata tre volte: settimana 1 ✓ 2 ✓ 3 ✕ */
export const Quit: React.FC<{a: number; children?: React.ReactNode}> = ({a, children}) => {
  const t = useT();
  return (
    <AbsoluteFill style={{background: '#F6F0E6'}}>
      <div style={{position: 'absolute', left: 60, right: 60, top: 300, display: 'flex', flexDirection: 'column', gap: 26}}>
        {[0, 1, 2].map((r) => {
          const r0 = a + 0.2 + r * 0.9;
          return (
            <div key={r} style={{display: 'flex', alignItems: 'center', gap: 18, opacity: prog(t, r0, r0 + 0.2), transform: `translateX(${(1 - prog(t, r0, r0 + 0.3, E.back)) * -80}px)`}}>
              <div style={{width: 250, fontFamily: FONT, fontWeight: 900, fontSize: 38, color: C.ink}}>PALESTRA #{r + 1}</div>
              {['SETT 1', 'SETT 2', 'SETT 3'].map((w, i) => {
                const on = prog(t, r0 + 0.15 + i * 0.2, r0 + 0.35 + i * 0.2, E.back);
                const bad = i === 2;
                return (
                  <div key={i} style={{transform: `scale(${on})`, width: 200, padding: '14px 0', textAlign: 'center', borderRadius: 18, border: `${OUT}px solid ${C.ink}`, background: bad ? C.red : '#fff', color: bad ? '#fff' : C.ink, fontFamily: FONT, fontWeight: 900, fontSize: 34, boxShadow: `6px 6px 0 ${C.ink}`}}>
                    {w} {bad ? '✕' : '✓'}
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
      <SvgFull>
        <g transform="translate(380,520) scale(0.74)">
          <Man {...standPose(t, {hunch: 0.3, belly: 0.4, smile: -0.5})} />
        </g>
      </SvgFull>
      {children}
    </AbsoluteFill>
  );
};

/** esercizi a caso: carte che girano attorno all'impiegato confuso */
export const Shuffle: React.FC<{a: number; children?: React.ReactNode}> = ({a, children}) => {
  const t = useT();
  const cards = ['SQUAT?', 'CRUNCH?', 'PANCA?', 'LEG EXT?', 'CURL?', 'TAPIS?'];
  return (
    <AbsoluteFill>
      <SvgFull>
        <Wall />
        <g transform="translate(330,150)">
          <Man {...standPose(t, {hunch: 0.25, belly: 0.4, smile: -0.3, handB: [330, 310]})} />
        </g>
        {cards.map((c, i) => {
          const ang = (i / cards.length) * Math.PI * 2 + (t - a) * 1.2;
          const p = prog(t, a + 0.1 + i * 0.12, a + 0.4 + i * 0.12, E.back);
          const x = 560 + Math.cos(ang) * 400;
          const y = 560 + Math.sin(ang) * 260;
          return (
            <g key={i} transform={`translate(${x},${y}) rotate(${Math.sin(t * 2 + i) * 12}) scale(${p})`}>
              <rect x={-110} y={-44} width={220} height={88} rx={16} fill={i % 2 ? '#fff' : C.ink} stroke={C.ink} strokeWidth={OUT} />
              <text y={14} textAnchor="middle" fontFamily="Inter" fontWeight={900} fontSize={36} fill={i % 2 ? C.ink : '#fff'}>{c}</text>
            </g>
          );
        })}
        {/* dado */}
        <g transform={`translate(840,880) rotate(${(t - a) * 200})`}>
          <rect x={-50} y={-50} width={100} height={100} rx={18} fill="#fff" stroke={C.ink} strokeWidth={OUT} />
          {[[-22, -22], [22, 22], [0, 0], [22, -22], [-22, 22]].map(([x, y], i) => <circle key={i} cx={x} cy={y} r={9} fill={C.ink} />)}
        </g>
      </SvgFull>
      {children}
    </AbsoluteFill>
  );
};

/** obiettivo del primo mese: da curvo a dritto, calendario senza buchi */
export const Straighten: React.FC<{a: number; b: number; children?: React.ReactNode}> = ({a, b, children}) => {
  const t = useT();
  const p = prog(t, a + 0.3, a + 2.5, E.inOut);
  const days = Math.floor(prog(t, a + 0.5, b - 0.5, E.lin) * 12);
  return (
    <AbsoluteFill>
      <SvgFull>
        <Wall />
        <line x1={420} y1={180} x2={420} y2={1000} stroke={C.blue} strokeWidth={8} strokeDasharray="20 14" opacity={p} />
        <g transform="translate(200,120)">
          <Man {...standPose(t, {hunch: mix(0.85, 0, p), belly: 0.3, smile: mix(-0.5, 1, p), pain: 1 - p})} />
        </g>
        {/* 12 sedute del mese, tutte fatte */}
        <g transform="translate(640,600)">
          <rect x={-20} y={-80} width={400} height={360} rx={18} fill="#fff" stroke={C.ink} strokeWidth={OUT} />
          <text x={180} y={-28} textAnchor="middle" fontFamily="Inter" fontWeight={900} fontSize={34} fill={C.ink}>MESE 1</text>
          {Array.from({length: 12}).map((_, i) => (
            <g key={i} transform={`translate(${20 + (i % 4) * 90},${10 + Math.floor(i / 4) * 80})`}>
              <rect width={66} height={60} rx={12} fill={i < days ? C.blue : '#EEE'} stroke={C.ink} strokeWidth={4} />
              {i < days && <path d="M 16 30 L 29 42 L 50 18" fill="none" stroke="#fff" strokeWidth={8} strokeLinecap="round" strokeLinejoin="round" />}
            </g>
          ))}
        </g>
      </SvgFull>
      {children}
    </AbsoluteFill>
  );
};

/** crunch tutti i giorni, pancia sempre lì: contatore giorni + crunch */
export const CrunchDays: React.FC<{a: number; children?: React.ReactNode}> = ({a, children}) => {
  const t = useT();
  const d = Math.max(0, t - a);
  const day = Math.min(90, 1 + Math.floor(d * 22));
  const up = 0.5 - 0.5 * Math.cos(d * Math.PI * 2.4);
  // crunch: uomo sdraiato (gruppo ruotato) con busto che si solleva
  return (
    <AbsoluteFill>
      <SvgFull>
        <Wall />
        <rect x={140} y={1000} width={800} height={30} rx={12} fill="#2F6F73" stroke={C.ink} strokeWidth={OUT} />
        <g transform={`translate(560,1000)`}>
          {/* gambe piegate (sdraiato su un fianco della vista) */}
          <g transform="translate(-40,0)">
            <Man
              hip={[0, -60]}
              footA={[300, -30]}
              footB={[320, -30]}
              lean={mix(-82, -40, up)}
              hunch={0.4}
              belly={0.8}
              smile={-0.4}
              sweat={0.7}
              handA={undefined}
              handB={undefined}
              phase={t}
            />
          </g>
        </g>
      </SvgFull>
      <div style={{position: 'absolute', right: 70, top: 160, textAlign: 'right'}}>
        <div style={{fontFamily: FONT, fontWeight: 900, fontSize: 40, color: '#fff', background: C.ink, borderRadius: 14, padding: '6px 18px', display: 'inline-block'}}>GIORNO</div>
        <div style={{fontFamily: FONT, fontWeight: 900, fontSize: 150, color: C.ink, lineHeight: 1}}>{day}</div>
      </div>
      {children}
    </AbsoluteFill>
  );
};

/** sezione: pelle / grasso / muscolo — il muscolo cresce, il grasso resta */
export const Layers: React.FC<{a: number; fatAt: number; children?: React.ReactNode}> = ({a, fatAt, children}) => {
  const t = useT();
  const grow = prog(t, a + 0.3, a + 2.2, E.inOut);
  const hl = prog(t, fatAt, fatAt + 0.4, E.back);
  const W0 = 860;
  const X0 = 110;
  const top = 360;
  const fatH = 210;
  const musH = mix(110, 190, grow);
  return (
    <AbsoluteFill style={{background: '#F6F0E6'}}>
      <SvgFull>
        <rect x={X0} y={top} width={W0} height={40} rx={10} fill="#F3D6BE" stroke={C.ink} strokeWidth={OUT} />
        <rect x={X0} y={top + 40} width={W0} height={fatH} fill="#F6D57A" stroke={C.ink} strokeWidth={OUT} />
        {Array.from({length: 22}).map((_, i) => (
          <circle key={i} cx={X0 + 40 + (i % 11) * 78} cy={top + 95 + Math.floor(i / 11) * 90} r={30} fill="#FBE3A0" stroke="#D9B04E" strokeWidth={3} />
        ))}
        <rect x={X0} y={top + 40 + fatH} width={W0} height={musH} fill="#D9645E" stroke={C.ink} strokeWidth={OUT} />
        {Array.from({length: 9}).map((_, i) => (
          <line key={i} x1={X0 + 20} y1={top + 40 + fatH + 14 + i * (musH - 28) / 8} x2={X0 + W0 - 20} y2={top + 40 + fatH + 14 + i * (musH - 28) / 8} stroke="#B84A45" strokeWidth={4} />
        ))}
        {/* evidenza grasso che resta */}
        <rect x={X0 - 14} y={top + 26} width={W0 + 28} height={fatH + 28} rx={18} fill="none" stroke={C.red} strokeWidth={10} strokeDasharray="26 16" opacity={hl} />
      </SvgFull>
      <div style={{position: 'absolute', left: X0, top: top + 40 + fatH + musH + 30, fontFamily: FONT, fontWeight: 900, fontSize: 44, color: C.ink}}>
        MUSCOLO <span style={{color: '#fff', background: C.blue, borderRadius: 10, padding: '2px 12px'}}>↑ {Math.round(mix(0, 30, grow))}%</span>
      </div>
      <div style={{position: 'absolute', left: X0, top: top - 80, fontFamily: FONT, fontWeight: 900, fontSize: 44, color: C.ink, opacity: hl}}>
        GRASSO SOPRA <span style={{color: '#fff', background: C.red, borderRadius: 10, padding: '2px 12px'}}>= UGUALE</span>
      </div>
      {children}
    </AbsoluteFill>
  );
};

/** il grasso si consuma da tutto il corpo, pancia per ultima */
export const WholeBody: React.FC<{a: number; b: number; lastAt: number; children?: React.ReactNode}> = ({a, b, lastAt, children}) => {
  const t = useT();
  const d = t - a;
  const belly = mix(1, 0.75, prog(t, lastAt + 0.5, b, E.inOut));
  const spots: Pt[] = [[270, 330], [330, 560], [250, 700], [280, 860], [330, 1000], [390, 420], [180, 760]];
  return (
    <AbsoluteFill>
      <SvgFull>
        <Wall />
        <g transform="translate(200,140)">
          <Man {...standPose(t, {belly, smile: 0.3})} />
        </g>
        {spots.map((s, i) => {
          const k = ((d * 0.8 + i / spots.length) % 1 + 1) % 1;
          return <circle key={i} cx={s[0] + 200 + k * 140 * (i % 2 ? 1 : -1)} cy={s[1] - k * 160} r={18 * (1 - k) + 4} fill="#F6D57A" stroke={C.ink} strokeWidth={3} opacity={(1 - k) * prog(t, a + 0.2, a + 0.6)} />;
        })}
        {/* pancia evidenziata: ultima */}
        <g opacity={prog(t, lastAt, lastAt + 0.4)}>
          <circle cx={520} cy={640} r={110} fill="none" stroke={C.red} strokeWidth={10} strokeDasharray="22 14" />
        </g>
      </SvgFull>
      {children}
    </AbsoluteFill>
  );
};

/** quattro pilastri: deficit, forza, proteine, passi */
export const Pillars: React.FC<{items: {at: number; txt: string; icon: 'plate' | 'db' | 'egg' | 'shoe'}[]; top?: number}> = ({items, top = 330}) => {
  const t = useT();
  const Icon: React.FC<{k: string}> = ({k}) => (
    <svg width={150} height={150} viewBox="-75 -75 150 150">
      {k === 'plate' && (
        <g>
          <circle r={62} fill="#fff" stroke={C.ink} strokeWidth={OUT} />
          <circle r={40} fill="none" stroke={C.ink} strokeWidth={4} />
          <path d="M -12 -30 a 30 30 0 0 1 40 26" fill="none" stroke={C.blue} strokeWidth={10} strokeLinecap="round" />
          <text y={70} textAnchor="middle" fontFamily="Inter" fontWeight={900} fontSize={22} fill={C.red}>-300 kcal</text>
        </g>
      )}
      {k === 'db' && (
        <g transform="rotate(-20)">
          <rect x={-46} y={-8} width={92} height={16} rx={6} fill={C.steel} stroke={C.ink} strokeWidth={4} />
          <rect x={-66} y={-34} width={24} height={68} rx={8} fill={C.ink} />
          <rect x={42} y={-34} width={24} height={68} rx={8} fill={C.ink} />
        </g>
      )}
      {k === 'egg' && (
        <g>
          <ellipse cx={-18} cy={4} rx={36} ry={46} fill="#fff" stroke={C.ink} strokeWidth={OUT} />
          <circle cx={-18} cy={10} r={18} fill="#F6C343" stroke={C.ink} strokeWidth={3} />
          <path d="M 18 30 Q 40 -40 62 -10 Q 64 20 30 40 Z" fill="#E7A86B" stroke={C.ink} strokeWidth={4} />
        </g>
      )}
      {k === 'shoe' && (
        <g>
          <path d="M -60 20 Q -60 -20 -30 -24 L 0 -10 Q 30 0 56 10 Q 66 30 50 36 L -56 36 Z" fill="#fff" stroke={C.ink} strokeWidth={OUT} strokeLinejoin="round" />
          <path d="M -60 30 L 56 30" stroke={C.blue} strokeWidth={8} />
        </g>
      )}
    </svg>
  );
  return (
    <div style={{position: 'absolute', left: 50, right: 50, top, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 26}}>
      {items.map((c, i) => {
        const p = prog(t, c.at - 0.1, c.at + 0.3, E.back);
        return (
          <div key={i} style={{transform: `scale(${p})`, opacity: Math.min(1, p * 2), background: '#fff', border: `${OUT}px solid ${C.ink}`, borderRadius: 26, boxShadow: `8px 8px 0 ${C.ink}`, padding: '20px 10px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6}}>
            <Icon k={c.icon} />
            <div style={{fontFamily: FONT, fontWeight: 900, fontSize: 36, color: C.ink, textAlign: 'center', lineHeight: 1.1}}>{c.txt}</div>
          </div>
        );
      })}
    </div>
  );
};

/** ogni corpo ha le sue leve: tre proporzioni diverse */
export const Leve: React.FC<{a: number; children?: React.ReactNode}> = ({a, children}) => {
  const t = useT();
  const bodies = [
    {legK: 1.12, torsoK: 0.9, x: 40},
    {legK: 0.9, torsoK: 1.08, x: 360},
    {legK: 1.0, torsoK: 1.0, x: 680},
  ];
  return (
    <AbsoluteFill>
      <SvgFull>
        <Wall window={false} />
        {bodies.map((bd, i) => {
          const p = prog(t, a + 0.2 + i * 0.25, a + 0.6 + i * 0.25, E.back);
          const hipY = 880 - 392 * bd.legK + 6;
          return (
            <g key={i} transform={`translate(${bd.x},${230 + (1 - p) * 80}) scale(0.82)`} opacity={p}>
              <Man hip={[200, hipY]} footA={[180, 880]} footB={[224, 880]} legK={bd.legK} torsoK={bd.torsoK} belly={0.2} gray={0.1} smile={0.6} phase={t} />
              {/* femore evidenziato */}
              <line x1={200} y1={hipY} x2={210} y2={hipY + 200 * bd.legK} stroke={C.blue} strokeWidth={12} strokeLinecap="round" opacity={0.85} />
              <text x={200} y={hipY + 120 * bd.legK} dx={50} fontFamily="Inter" fontWeight={900} fontSize={40} fill={C.blue}>{['LUNGO', 'CORTO', 'MEDIO'][i]}</text>
            </g>
          );
        })}
      </SvgFull>
      {children}
    </AbsoluteFill>
  );
};

/** l'impiegato in piedi nello studio, con parametri liberi */
export const Stand: React.FC<{x?: number; y?: number; s?: number; pose?: Partial<ManPose>; children?: React.ReactNode}> = ({x = 200, y = 140, s = 1, pose = {}, children}) => {
  const t = useT();
  return (
    <AbsoluteFill>
      <SvgFull>
        <Wall />
        <g transform={`translate(${x},${y}) scale(${s})`}>
          <Man {...standPose(t, pose)} />
        </g>
      </SvgFull>
      {children}
    </AbsoluteFill>
  );
};
