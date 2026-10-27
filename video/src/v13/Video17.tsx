import React from 'react';
import {AbsoluteFill, Audio, staticFile} from 'remotion';
import {C, E, FONT, OUT, mix, prog, useT, useTalk} from '../brand';
import {Show, Grain, cardStyle} from '../ui';
import {Captions, CapLine} from '../Captions';
import {Transitions, Tr} from '../Transitions';
import {Riky, RikyProps} from '../Riky';
import {GirlSide, GirlProps, girlGeom} from './Girl';
import {VW, VH, FLOOR, Cam, w2s, World, repH, Tag, Sparkles, KeywordCTA, Handle, StepCard, Burst} from './kit';
import timing from '../voice17_timing.json';
import envR from '../voice17_env_r.json';

export const FPS = 30;
type VT = {slot: string; text: string; t0: number; t1: number; words: number[]};
const VL = timing as VT[];
const v = (s: string) => {
  const x = VL.find((q) => q.slot === s);
  if (!x) throw new Error('slot voce mancante ' + s);
  return x;
};
const st = (s: string) => v(s).t0;
const en = (s: string) => v(s).t1;
const wd = (s: string) => v(s).words;
const ER = envR as number[];

const G = 0.22;
const SL = ['c01', 'c02', 'c03', 'c04', 'c05', 'c06', 'c07', 'c08', 'c09', 'c10', 'c11', 'c12', 'c13', 'c14'];
export const END = Math.min(64, en('c14') + 1.4);
export const DURATION17 = Math.ceil(END * FPS);
export const W: Record<string, [number, number]> = Object.fromEntries(
  SL.map((s, i) => [s, [i === 0 ? 0 : st(s) - G, i === SL.length - 1 ? END : st(SL[i + 1]) - G]]),
) as Record<string, [number, number]>;

const GX = 380;
const RX = 830;
const enter = (t: number, a: number, d = 0.4) => prog(t, a, a + d, E.back);
const gW = (lx: number, ly: number): [number, number] => [GX + lx * 0.95, FLOOR + ly * 0.95];

const Paper: React.FC<{children: React.ReactNode}> = ({children}) => (
  <AbsoluteFill style={{background: '#fff', backgroundImage: 'radial-gradient(rgba(17,17,17,0.10) 2.5px, transparent 3px)', backgroundSize: '54px 54px'}}>{children}</AbsoluteFill>
);

const Clipboard: React.FC<{x: number; y: number}> = ({x, y}) => (
  <g transform={`translate(${x},${y}) rotate(-8)`}>
    <rect x={-70} y={-95} width={140} height={190} rx={14} fill="#fff" stroke={C.ink} strokeWidth={6} />
    <rect x={-30} y={-108} width={60} height={28} rx={8} fill={C.blue} stroke={C.ink} strokeWidth={5} />
    {[0, 1, 2, 3].map((i) => (
      <line key={i} x1={-46} y1={-50 + i * 34} x2={46 - (i % 2) * 22} y2={-50 + i * 34} stroke={C.ink} strokeWidth={6} strokeLinecap="round" opacity={0.5} />
    ))}
  </g>
);

const Coach: React.FC<Partial<RikyProps> & {clip?: boolean}> = ({clip = true, ...p}) => {
  const talk = useTalk(ER);
  return <Riky x={RX} y={FLOOR} scale={0.66} flip mouth={talk} smile={0.8} brow={6} armR={clip ? {hand: [560, 720]} : undefined} front={clip ? <Clipboard x={600} y={700} /> : undefined} {...p} />;
};

const Girl: React.FC<Partial<GirlProps>> = (p) => <GirlSide x={GX} y={FLOOR} scale={0.95} plate={34} {...p} />;

const Gym: React.FC<{a: number; b: number; cam?: Cam; girl: Partial<GirlProps>; coach?: Partial<RikyProps> & {clip?: boolean}; noCoach?: boolean; children?: React.ReactNode; world?: React.ReactNode}> = ({a, b, cam, girl, coach, noCoach, children, world}) => {
  const t = useT();
  const c = cam ?? {z: mix(1.1, 1.18, prog(t, a, b, E.lin)), cx: 560, cy: 1040};
  return (
    <AbsoluteFill>
      <World cam={c}>
        {world}
        <Girl sway={Math.sin(t * 4) * 0.8} {...girl} />
        {!noCoach && <Coach {...coach} />}
      </World>
      {children}
    </AbsoluteFill>
  );
};

const RecBadge: React.FC<{t0: number; text: string}> = ({t0, text}) => {
  const t = useT();
  const p = prog(t, t0, t0 + 0.3, E.back);
  return (
    <div style={{position: 'absolute', left: 60, top: 480, transform: `scale(${p}) rotate(-3deg)`, transformOrigin: '0 50%', display: 'flex', alignItems: 'center', gap: 14, background: C.ink, color: '#fff', fontFamily: FONT, fontWeight: 900, fontSize: 44, padding: '10px 26px', borderRadius: 999, boxShadow: `6px 6px 0 ${C.blue}`}}>
      <span style={{width: 26, height: 26, borderRadius: 13, background: C.red, opacity: Math.sin(t * 8) > 0 ? 1 : 0.3}} />
      {text}
    </div>
  );
};

/* ------------------------------------------------------------------ scene */
const C01: React.FC<{a: number; b: number}> = ({a, b}) => {
  const t = useT();
  return (
    <Gym a={a} b={b} girl={{h: repH(t, a, 2.4), smile: 0.4}} coach={{look: -8}}>
      <RecBadge t0={a + 0.4} text="DIETRO LE QUINTE" />
    </Gym>
  );
};

const C02: React.FC<{a: number; b: number}> = ({a, b}) => {
  const t = useT();
  return (
    <Gym a={a} b={b} cam={{z: 1.25, cx: 560, cy: 1050}} girl={{h: repH(t, a - 2, 2.4), smile: 0.4}}>
      <RecBadge t0={a} text="LIVE · CORREZIONE" />
    </Gym>
  );
};

const C03: React.FC<{a: number; b: number}> = ({a, b}) => {
  const t = useT();
  const w = wd('c03');
  return (
    <Gym a={a} b={b} noCoach cam={{z: mix(1.15, 1.22, prog(t, a, b, E.lin)), cx: 470, cy: 1040}} girl={{h: repH(t, a, 2.4), smile: 0.5}}>
      <div style={{position: 'absolute', right: 50, top: 470, width: 300, ...cardStyle('#fff', 10), overflow: 'hidden', textAlign: 'center', fontFamily: FONT, fontWeight: 900, transform: `rotate(5deg) scale(${enter(t, w[5] - 0.2)})`}}>
        <div style={{background: C.ink, color: '#fff', fontSize: 30, padding: '6px 0'}}>DA SOLA DA</div>
        <div style={{fontSize: 74, color: C.blue, lineHeight: 1.2}}>1 ANNO</div>
      </div>
      <Tag t0={w[9]} at={[250, 520]} text="IMPEGNO" icon="ok" size={42} />
      <Tag t0={w[11]} at={[300, 640]} text="COSTANZA" icon="ok" size={42} rot={2} />
    </Gym>
  );
};

const C04: React.FC<{a: number; b: number}> = ({a, b}) => {
  const t = useT();
  const w = wd('c04');
  const h = repH(t, a, 2.2);
  const r = prog(t, w[5] - 0.2, w[7]);
  return (
    <Gym a={a} b={b} noCoach cam={{z: mix(1.3, 1.38, prog(t, a, b, E.lin)), cx: 420, cy: 1060}} girl={{h, round: 0.55 * r * h, lumbar: r * h * (0.6 + 0.4 * Math.sin(t * 9)), hurt: r * h * 0.7, smile: 0}}>
      <Tag t0={w[7] - 0.1} at={[540, 560]} text="SCHIENA STANCA PRIMA DELLE GAMBE" bg={C.red} fg="#fff" size={36} />
    </Gym>
  );
};

const C05: React.FC<{a: number; b: number}> = ({a, b}) => {
  const t = useT();
  const w = wd('c05');
  return (
    <Gym a={a} b={b} cam={{z: 0.95, cx: 560, cy: 1000}} girl={{h: repH(t, a - 1, 2.4), round: 0.3, smile: 0.4}} coach={{scale: 0.0001}}>
      <div style={{position: 'absolute', left: 0, right: 0, top: 500, display: 'flex', justifyContent: 'center', transform: `scale(${enter(t, w[3] - 0.1)})`}}>
        <div style={{...cardStyle('#fff', 10), padding: '12px 30px', fontFamily: FONT, fontWeight: 900, fontSize: 60, color: C.ink}}>
          SEMBRA OK <span style={{color: C.blue}}>✓</span> <span style={{color: C.red}}>?</span>
        </div>
      </div>
    </Gym>
  );
};

const C06: React.FC<{a: number; b: number}> = ({a, b}) => {
  const t = useT();
  const w = wd('c06');
  const h = repH(t, a, 1.6);
  const n = t > w[13] ? Math.min(3, 1 + Math.floor((t - w[13]) / 0.4)) : 0;
  return (
    <Gym a={a} b={b} noCoach cam={{z: mix(1.4, 1.5, prog(t, a, b, E.lin)), cx: 400, cy: 1010}} girl={{h, round: 0.6 * h, lumbar: 0.6 * h, smile: 0}}>
      <Tag t0={w[10] - 0.1} at={[300, 500]} text="COMPENSO" bg={C.red} fg="#fff" size={52} />
      <div style={{position: 'absolute', left: 0, right: 0, top: 1150, display: 'flex', justifyContent: 'center', gap: 18}}>
        {Array.from({length: n}).map((_, i) => (
          <div key={i} style={{...cardStyle('#fff', 7), padding: '8px 22px', fontFamily: FONT, fontWeight: 900, fontSize: 46, color: C.red}}>×10</div>
        ))}
      </div>
    </Gym>
  );
};

const C07: React.FC<{a: number; b: number}> = ({a, b}) => {
  const t = useT();
  const w = wd('c07');
  const rot = (t - a) * 220;
  return (
    <Paper>
      <div style={{position: 'absolute', left: 540, top: 700, transform: 'translate(-50%,-50%)'}}>
        <svg width={520} height={520} viewBox="-260 -260 520 520" style={{transform: `rotate(${rot}deg)`}}>
          <path d="M 0 -200 A 200 200 0 1 1 -190 -60" fill="none" stroke={C.red} strokeWidth={46} strokeLinecap="round" />
          <path d="M -250 -40 L -190 -100 L -130 -40 Z" fill={C.red} />
        </svg>
        <svg width={520} height={520} viewBox="-260 -260 520 520" style={{position: 'absolute', left: 0, top: 0}}>
          <GirlSide x={0} y={160} scale={0.42} h={repH(t, a, 1.0)} round={0.6} />
        </svg>
      </div>
      <div style={{position: 'absolute', left: 0, right: 0, top: 1060, display: 'flex', justifyContent: 'center', transform: `scale(${enter(t, w[3] - 0.1)}) rotate(-3deg)`}}>
        <div style={{...cardStyle(C.red, 10), padding: '10px 34px', fontFamily: FONT, fontWeight: 900, fontSize: 68, color: '#fff'}}>ABITUDINE</div>
      </div>
    </Paper>
  );
};

const C08: React.FC<{a: number; b: number}> = ({a, b}) => {
  const t = useT();
  const talk = useTalk(ER);
  const pin = enter(t, a);
  return (
    <Paper>
      <svg width={VW} height={VH} style={{position: 'absolute', left: 0, top: 0}}>
        <circle cx={540} cy={1060} r={330 * pin} fill={C.blue} />
        <Riky x={540} y={mix(1800, 1480, pin)} scale={0.86} mouth={talk} smile={1} brow={8} armR={{hand: [560, 720]}} front={<Clipboard x={600} y={700} />} />
      </svg>
      <div style={{position: 'absolute', left: 0, right: 0, top: 220, display: 'flex', justifyContent: 'center', transform: `scale(${pin}) rotate(-3deg)`}}>
        <div style={{...cardStyle('#fff', 12), padding: '14px 40px', fontFamily: FONT, fontWeight: 900, fontSize: 86, color: C.ink}}>
          IL MIO <span style={{color: C.blue}}>METODO</span>
        </div>
      </div>
    </Paper>
  );
};

const C09: React.FC<{a: number; b: number}> = ({a, b}) => {
  const t = useT();
  const w = wd('c09');
  return (
    <Gym a={a} b={b} girl={{h: repH(t, a, 2.2), round: 0.45, smile: 0.3}} coach={{smile: 0, mouth: 0, brow: 4, look: -10}}>
      <StepCard n="1" title="Osservo una serie intera" t0={a + 0.05} sub="senza interrompere" />
      <Burst t0={w[6]} x={830} y={600} text="🤐" color={C.blue} size={70} hold={2} />
    </Gym>
  );
};

const C10: React.FC<{a: number; b: number}> = ({a, b}) => {
  const t = useT();
  const w = wd('c10');
  const h = t > w[6] ? repH(t, w[6] - 0.3, 2.4) : 0.05;
  const g = girlGeom(h, 0, 0);
  const hip = gW(g.hip[0] - 50, g.hip[1]);
  const doorOn = prog(t, w[12] - 0.3, w[12] + 0.1);
  const hinge = GX - 330;
  const edge = Math.max(hinge + 30, hip[0]);
  const bub = enter(t, w[5] - 0.1);
  return (
    <Gym
      a={a}
      b={b}
      cam={{z: 1.15, cx: 520, cy: 1040}}
      girl={{h, smile: 0.6, glute: prog(t, w[9], w[9] + 0.4) * 0.6}}
      coach={{look: -10, brow: 10}}
      world={
        doorOn > 0 ? (
          <g opacity={doorOn}>
            <rect x={hinge} y={FLOOR - 560} width={edge - hinge} height={560} fill="#C9A87C" stroke={C.ink} strokeWidth={OUT} />
            <circle cx={edge - 24} cy={FLOOR - 280} r={12} fill={C.ink} />
            <rect x={hinge - 16} y={FLOOR - 580} width={16} height={580} fill={C.ink} />
          </g>
        ) : null
      }
    >
      {/* fumetto */}
      <div style={{position: 'absolute', left: 60, right: 60, top: 150, transform: `scale(${bub})`, transformOrigin: '80% 100%'}}>
        <div style={{...cardStyle('#fff', 10), padding: '22px 30px', fontFamily: FONT, fontWeight: 900, fontSize: 50, color: C.ink, lineHeight: 1.12, position: 'relative'}}>
          “Spingi i <span style={{color: C.blue}}>fianchi indietro</span>, come per chiudere una porta”
        </div>
      </div>
      <Tag t0={w[12]} at={[w2s(hip, {z: 1.15, cx: 520, cy: 1040})[0] - 40, 1180]} text="CHIUDI LA PORTA" bg={C.blue} fg="#fff" size={42} />
    </Gym>
  );
};

const Phone: React.FC<{label: string; good: boolean; t: number; a: number}> = ({label, good, t, a}) => {
  const h = repH(t, a, 2.2);
  return (
    <div style={{width: 460, height: 860, border: `14px solid ${C.ink}`, borderRadius: 54, background: '#F3EFFD', position: 'relative', overflow: 'hidden', boxShadow: `10px 10px 0 ${good ? C.blue : C.red}`}}>
      <div style={{position: 'absolute', left: 20, top: 18, background: good ? C.blue : C.red, color: '#fff', fontFamily: FONT, fontWeight: 900, fontSize: 38, padding: '6px 18px', borderRadius: 14, zIndex: 2}}>{label}</div>
      <svg width={432} height={832} viewBox="0 0 432 832">
        <rect x={0} y={640} width={432} height={200} fill="#2A2D33" />
        <GirlSide x={230} y={650} scale={0.62} h={h} round={good ? 0 : 0.6 * h} lumbar={good ? 0 : 0.7 * h} glute={good ? 0.8 * h : 0} lumbarOk={good ? 0.6 : 0} smile={good ? 0.8 : 0} />
      </svg>
    </div>
  );
};

const C11: React.FC<{a: number; b: number}> = ({a, b}) => {
  const t = useT();
  const w = wd('c11');
  const p1 = enter(t, a);
  const p2 = enter(t, w[3] - 0.1);
  return (
    <Paper>
      <div style={{position: 'absolute', left: 0, right: 0, top: 200, display: 'flex', justifyContent: 'center', gap: 40}}>
        <div style={{transform: `scale(${p1}) rotate(-2deg)`}}><Phone label="PRIMA" good={false} t={t} a={a} /></div>
        <div style={{transform: `scale(${p2}) rotate(2deg)`}}><Phone label="DOPO" good t={t} a={a} /></div>
      </div>
      <Tag t0={w[5]} at={[540, 1150]} text="CONFRONTO SUL VIDEO" bg="#fff" size={46} />
    </Paper>
  );
};

const C12: React.FC<{a: number; b: number}> = ({a, b}) => {
  const t = useT();
  const w = wd('c12');
  const h = repH(t, a, 2.3);
  const g = girlGeom(0.9, 0, 0);
  const cam = {z: mix(1.2, 1.28, prog(t, a, b, E.lin)), cx: 470, cy: 1050};
  const gl = w2s(gW(g.hip[0] - 40, g.hip[1] + 20), cam);
  return (
    <Gym a={a} b={b} noCoach cam={cam} girl={{h, glute: prog(t, w[6] - 0.1, w[6] + 0.3) * (0.7 + 0.3 * Math.sin(t * 6)), lumbarOk: prog(t, w[12], w[12] + 0.4) * 0.8, smile: 1}}>
      <Tag t0={w[0]} at={[760, 480]} text="STESSO PESO" size={44} />
      <Tag t0={w[6]} at={[gl[0] - 120, gl[1] + 240]} text="GLUTEI + FEMORALI" bg={C.blue} fg="#fff" size={42} />
      <Tag t0={w[13]} at={[330, 600]} text="SCHIENA TRANQUILLA" icon="ok" size={40} />
      <Sparkles t0={w[14]} x={540} y={800} n={10} />
    </Gym>
  );
};

const C13: React.FC<{a: number; b: number}> = ({a, b}) => {
  const t = useT();
  const w = wd('c13');
  const talk = useTalk(ER);
  const pin = enter(t, a);
  const chips = [
    {txt: '1 correzione alla volta', at: w[1]},
    {txt: 'Verificata sul video', at: w[4]},
    {txt: 'Per ogni cliente', at: w[11]},
  ];
  return (
    <Paper>
      <svg width={VW} height={VH} style={{position: 'absolute', left: 0, top: 0}}>
        <circle cx={300} cy={1100} r={250 * pin} fill={C.blue} />
        <Riky x={300} y={mix(1700, 1470, pin)} scale={0.72} flip={false} mouth={talk} smile={0.9} brow={6} armR={{hand: [700, 560 + Math.sin(t * 4) * 20]}} />
      </svg>
      <div style={{position: 'absolute', left: 60, right: 60, top: 150, fontFamily: FONT, fontWeight: 900, fontSize: 60, color: C.ink, letterSpacing: -1}}>COSÌ SEGUO</div>
      <div style={{position: 'absolute', left: 60, right: 60, top: 230, fontFamily: FONT, fontWeight: 900, fontSize: 60, color: C.blue, letterSpacing: -1}}>OGNI CLIENTE</div>
      <div style={{position: 'absolute', left: 400, right: 50, top: 420, display: 'flex', flexDirection: 'column', gap: 24}}>
        {chips.map((c, i) => {
          const p = prog(t, c.at - 0.1, c.at + 0.25, E.back);
          return (
            <div key={i} style={{transform: `translateX(${(1 - p) * 300}px)`, opacity: p, ...cardStyle(i === 1 ? C.blue : '#fff', 8), padding: '16px 22px', fontFamily: FONT, fontWeight: 900, fontSize: 38, color: i === 1 ? '#fff' : C.ink}}>✓ {c.txt}</div>
          );
        })}
      </div>
    </Paper>
  );
};

const Cta: React.FC<{a: number}> = ({a}) => {
  const t = useT();
  const w = wd('c14');
  const talk = useTalk(ER);
  const pin = enter(t, a);
  const wave = Math.sin(t * 10) * 26;
  return (
    <Paper>
      <svg width={VW} height={VH} style={{position: 'absolute', left: 0, top: 0}}>
        <circle cx={540} cy={1170} r={320 * pin} fill={C.blue} />
        <Riky x={540} y={mix(1800, 1560, pin)} scale={0.8} mouth={talk} smile={1} brow={8} armR={{hand: [650 + wave, 380]}} tilt={Math.sin(t * 3) * 2} />
      </svg>
      <KeywordCTA t0={w[6] - 0.1} word="ANALISI" />
      <Handle t0={w[9]} top={720} />
      <Sparkles t0={w[7]} x={540} y={400} n={14} />
    </Paper>
  );
};

/* ------------------------------------------------------------------ sottotitoli */
const buildCaps = (): CapLine[] => {
  const big: CapLine[] = [];
  const x1 = v('c01');
  const x2 = v('c02');
  big.push({t0: x1.words[0] - 0.05, t1: W.c02[0] - 0.02, text: x1.text, big: true, size: 80, y: 110, hl: [6, 10, 12], color: C.blue, times: x1.words});
  big.push({t0: x2.words[0] - 0.05, t1: W.c03[0] - 0.02, text: x2.text, big: true, size: 100, y: 120, hl: [1, 3, 4], color: C.blue, times: x2.words, slam: 1});
  const x5 = v('c05');
  big.push({t0: x5.words[0] - 0.05, t1: W.c06[0] - 0.02, text: x5.text, big: true, size: 96, y: 150, hl: [3, 4], color: C.blue, times: x5.words});
  const meta: Record<string, number[]> = {
    c03: [7, 9, 11],
    c04: [5, 7, 10],
    c06: [7, 10, 13],
    c07: [3, 4],
    c08: [2, 3],
    c09: [2, 6, 8],
    c10: [5, 8, 9, 14],
    c11: [3, 5],
    c12: [0, 6, 9, 14],
    c13: [1, 4, 6],
    c14: [7],
  };
  const DISPLAY: Record<string, string> = {c14: 'Vuoi una correzione sul tuo esercizio? Scrivimi ANALISI in privato.'};
  const small = Object.entries(meta)
    .map(([slot, hl]) => {
      const x = v(slot);
      return {t0: x.words[0] - 0.15, t1: x.t1 + 0.35, text: DISPLAY[slot] ?? x.text, hl, times: x.words, bottom: 300, wrapAt: 20, fs: 54, bg: '#fff'} as CapLine;
    })
    .sort((p, q) => p.t0 - q.t0);
  small.forEach((l, i) => {
    const nx = small[i + 1];
    if (nx) l.t1 = Math.min(l.t1, nx.t0 - 0.03);
    l.t1 = Math.min(l.t1, END - 0.05);
  });
  return [...big, ...small];
};
const CAPS = buildCaps();

const TT: Tr['type'][] = ['stripes', 'wipeR', 'iris', 'wipeL', 'wipeU', 'stripes', 'iris', 'wipeR', 'wipeL', 'wipeU', 'iris', 'wipeR', 'stripes'];
const TC = [C.ink, C.blue, C.red, C.ink, C.red, C.ink, C.blue, C.ink, C.blue, C.ink, C.blue, C.ink, C.blue];
export const TRANS: Tr[] = SL.slice(1).map((s, i) => ({t: W[s][0], type: TT[i], color: TC[i]}));

const SCENES: Record<string, React.FC<{a: number; b: number}>> = {c01: C01, c02: C02, c03: C03, c04: C04, c05: C05, c06: C06, c07: C07, c08: C08, c09: C09, c10: C10, c11: C11, c12: C12, c13: C13};

export const Video17: React.FC = () => (
  <AbsoluteFill style={{background: '#fff', fontFamily: FONT}}>
    <style>{`
      @font-face{font-family:'Inter';font-weight:900;src:url(${staticFile('fonts/Inter-Black.otf')});}
      @font-face{font-family:'Inter';font-weight:800;src:url(${staticFile('fonts/Inter-ExtraBold.otf')});}
      @font-face{font-family:'Inter';font-weight:700;src:url(${staticFile('fonts/Inter-Bold.otf')});}
    `}</style>
    {SL.slice(0, -1).map((s, i) => {
      const Sc = SCENES[s];
      return (
        <Show key={s} from={W[s][0]} to={W[s][1]} punch={i === 0 ? 0 : 0.05}>
          <Sc a={W[s][0]} b={W[s][1]} />
        </Show>
      );
    })}
    <Show from={W.c14[0]} to={W.c14[1] + 1}><Cta a={W.c14[0]} /></Show>
    <Captions lines={CAPS} />
    <Transitions list={TRANS} />
    <Grain />
    <Audio src={staticFile('soundtrack17.wav')} />
  </AbsoluteFill>
);
export {VW, VH};
