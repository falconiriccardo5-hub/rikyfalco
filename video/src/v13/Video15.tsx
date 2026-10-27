import React from 'react';
import {AbsoluteFill, Audio, staticFile} from 'remotion';
import {C, E, FONT, OUT, mix, prog, useT, useTalk} from '../brand';
import {Show, Grain, cardStyle} from '../ui';
import {Captions, CapLine} from '../Captions';
import {Transitions, Tr} from '../Transitions';
import {Riky} from '../Riky';
import {GirlSide} from './Girl';
import {VW, VH, Tag, Sparkles, KeywordCTA, Handle, StepCard} from './kit';
import timing from '../voice15_timing.json';
import envR from '../voice15_env_r.json';

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
const SL = ['a01', 'a02', 'a03', 'a04', 'a05', 'a06', 'a07', 'a08', 'a09', 'a10', 'a11', 'a12', 'a13', 'a14', 'a15'];
export const END = Math.min(64, en('a15') + 1.4);
export const DURATION15 = Math.ceil(END * FPS);
export const W: Record<string, [number, number]> = Object.fromEntries(
  SL.map((s, i) => [s, [i === 0 ? 0 : st(s) - G, i === SL.length - 1 ? END : st(SL[i + 1]) - G]]),
) as Record<string, [number, number]>;

/* ------------------------------------------------------------------ elementi */
const Paper: React.FC<{children: React.ReactNode}> = ({children}) => (
  <AbsoluteFill style={{background: '#fff', backgroundImage: 'radial-gradient(rgba(17,17,17,0.10) 2.5px, transparent 3px)', backgroundSize: '54px 54px'}}>{children}</AbsoluteFill>
);

const DAYS = [
  {d: 'LUNEDÌ', m: 'PETTO', ex: ['Panca piana', 'Panca inclinata', 'Croci manubri', 'Chest press', 'Pec deck', 'Dip']},
  {d: 'MARTEDÌ', m: 'SCHIENA', ex: ['Lat machine', 'Pulley', 'Rematore', 'Pull-over', 'Hyperextension', 'Stacco']},
  {d: 'MERCOLEDÌ', m: 'GAMBE', ex: ['Squat', 'Leg press', 'Leg extension', 'Leg curl', 'Affondi', 'Polpacci']},
  {d: 'GIOVEDÌ', m: 'SPALLE + BRACCIA', ex: ['Lento avanti', 'Alzate laterali', 'Curl bilanciere', 'French press', 'Curl martello', 'Push down']},
];
const ROW_H = 212;
const SHEET_W = 920;

/** la scheda "tipica": 4 giorni, 6 esercizi, nessun carico */
const OldSheet: React.FC<{hl?: number; dim?: boolean; flicker?: number}> = ({hl = -1, dim, flicker = 0}) => (
  <div style={{width: SHEET_W, background: '#fff', border: `${OUT}px solid ${C.ink}`, borderRadius: 26, boxShadow: `12px 12px 0 ${C.ink}`, overflow: 'hidden', fontFamily: FONT}}>
    <div style={{background: C.ink, color: '#fff', padding: '16px 26px', display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
      <span style={{fontWeight: 900, fontSize: 40}}>SCHEDA</span>
      <span style={{fontWeight: 800, fontSize: 28, opacity: 0.8}}>esempio tipico</span>
    </div>
    {DAYS.map((d, i) => (
      <div key={i} style={{height: ROW_H, borderTop: i ? `4px solid ${C.ink}` : 'none', padding: '14px 24px', background: i === hl ? '#FDEBEC' : '#fff', opacity: dim && i !== hl ? 0.45 : 1}}>
        <div style={{display: 'flex', alignItems: 'center', gap: 14}}>
          <span style={{background: C.ink, color: '#fff', fontWeight: 900, fontSize: 30, padding: '4px 14px', borderRadius: 10}}>{d.d}</span>
          <span style={{fontWeight: 900, fontSize: 34, color: C.ink}}>{d.m}</span>
        </div>
        <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', columnGap: 26, rowGap: 4, marginTop: 10}}>
          {d.ex.map((e, j) => {
            const alt = flicker > 0 && (Math.floor(flicker * 6) + j + i) % 3 === 0;
            return (
              <div key={j} style={{display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: 27, color: C.ink}}>
                <span style={{color: alt ? C.red : C.ink}}>{alt ? DAYS[(i + 1) % 4].ex[(j + 2) % 6] : e}</span>
                <span style={{opacity: 0.6}}>4×12 · kg —</span>
              </div>
            );
          })}
        </div>
      </div>
    ))}
  </div>
);

/** cerchio a penna rossa che si disegna */
const PenCircle: React.FC<{p: number; x: number; y: number; w: number; h: number; color?: string}> = ({p, x, y, w, h, color = C.red}) => {
  if (p <= 0) return null;
  const L = Math.PI * (w + h) * 1.15;
  return (
    <svg width={VW} height={VH} style={{position: 'absolute', left: 0, top: 0, pointerEvents: 'none'}}>
      <path
        d={`M ${x + w * 0.1} ${y - h * 0.42} C ${x + w * 0.62} ${y - h * 0.62}, ${x + w * 0.62} ${y + h * 0.6}, ${x} ${y + h * 0.55} C ${x - w * 0.66} ${y + h * 0.5}, ${x - w * 0.6} ${y - h * 0.6}, ${x + w * 0.16} ${y - h * 0.5}`}
        stroke={color}
        strokeWidth={10}
        fill="none"
        strokeLinecap="round"
        strokeDasharray={L}
        strokeDashoffset={L * (1 - p)}
      />
    </svg>
  );
};

const PenNote: React.FC<{t0: number; x: number; y: number; text: string; color?: string; size?: number; rot?: number}> = ({t0, x, y, text, color = C.red, size = 56, rot = -6}) => {
  const t = useT();
  if (t < t0) return null;
  const p = prog(t, t0, t0 + 0.3, E.back);
  return (
    <div style={{position: 'absolute', left: x, top: y, transform: `translate(-50%,-50%) rotate(${rot}deg) scale(${p})`, fontFamily: FONT, fontWeight: 900, fontStyle: 'italic', fontSize: size, color, whiteSpace: 'nowrap', WebkitTextStroke: '10px #fff', paintOrder: 'stroke fill'}}>{text}</div>
  );
};

const RikyCorner: React.FC<{t: number; x?: number; y?: number; scale?: number; flip?: boolean; pen?: boolean; smile?: number; brow?: number}> = ({t, x = 860, y = 1560, scale = 0.62, flip = true, pen, smile = 0.8, brow = 6}) => {
  const talk = useTalk(ER);
  return (
    <svg width={VW} height={VH} style={{position: 'absolute', left: 0, top: 0}}>
      <Riky
        x={x}
        y={y}
        scale={scale}
        flip={flip}
        mouth={talk}
        smile={smile}
        brow={brow}
        tilt={Math.sin(t * 3) * 2}
        armR={pen ? {hand: [640 + Math.sin(t * 7) * 12, 470]} : undefined}
        front={
          pen ? (
            <g transform={`translate(${650 + Math.sin(t * 7) * 12},${450}) rotate(-35)`}>
              <rect x={-10} y={-90} width={20} height={110} rx={8} fill={C.red} stroke={C.ink} strokeWidth={5} />
              <path d="M -10 20 L 0 44 L 10 20 Z" fill="#fff" stroke={C.ink} strokeWidth={5} strokeLinejoin="round" />
            </g>
          ) : undefined
        }
      />
    </svg>
  );
};

const enter = (t: number, a: number, d = 0.4) => prog(t, a, a + d, E.back);

/* ------------------------------------------------------------------ scene */
const SheetScene: React.FC<{a: number; b: number; z?: [number, number]; focus?: number; hl?: number; dim?: boolean; flicker?: number; children?: React.ReactNode; pen?: boolean; rot?: number; dy?: number}> = ({a, b, z = [0.95, 1.0], focus = 0, hl, dim, flicker, children, pen, rot = -2, dy = 0}) => {
  const t = useT();
  const p = enter(t, a);
  const zz = mix(z[0], z[1], prog(t, a, b, E.lin));
  // focus: 0 = scheda intera, >0 sposta verso la riga i (1-based)
  const fy = focus ? -(90 + (focus - 1) * ROW_H + ROW_H / 2 - 470) : 0;
  return (
    <Paper>
      <div style={{position: 'absolute', left: (VW - SHEET_W) / 2, top: 300 + dy, transform: `translateY(${(1 - p) * 300 + fy * zz}px) scale(${zz}) rotate(${rot}deg)`, transformOrigin: '50% 0'}}>
        <OldSheet hl={hl} dim={dim} flicker={flicker} />
      </div>
      <RikyCorner t={t} pen={pen} />
      {children}
    </Paper>
  );
};

const A01: React.FC<{a: number; b: number}> = ({a, b}) => <SheetScene a={a} b={b} z={[0.86, 0.9]} rot={-4} dy={130} />;

const A02: React.FC<{a: number; b: number}> = ({a, b}) => {
  const t = useT();
  const w = wd('a02');
  const p = prog(t, w[3] - 0.1, w[3] + 0.3, E.back);
  return (
    <SheetScene a={a - 1} b={b} z={[0.9, 0.92]} rot={-4} pen dy={130}>
      <div style={{position: 'absolute', left: 80, top: 1180, transform: `scale(${p}) rotate(-6deg)`, ...cardStyle(C.blue, 10), padding: '12px 30px', fontFamily: FONT, fontWeight: 900, fontSize: 64, color: '#fff'}}>⏱ 60 SECONDI</div>
    </SheetScene>
  );
};

const A03: React.FC<{a: number; b: number}> = ({a, b}) => {
  const t = useT();
  const w = wd('a03');
  const hl = t < w[2] ? 0 : t < w[4] ? 1 : t < w[6] ? 2 : 3;
  const six = prog(t, w[9] - 0.1, w[9] + 0.3, E.back);
  return (
    <SheetScene a={a - 1} b={b} z={[1.0, 1.04]} hl={hl} rot={-2}>
      {six > 0 && (
        <div style={{position: 'absolute', right: 50, top: 210, transform: `scale(${six}) rotate(6deg)`, ...cardStyle(C.red, 10), padding: '10px 26px', fontFamily: FONT, fontWeight: 900, fontSize: 58, color: '#fff'}}>6 ESERCIZI AL GIORNO</div>
      )}
    </SheetScene>
  );
};

const A04: React.FC<{a: number; b: number}> = ({a, b}) => {
  const t = useT();
  const w = wd('a04');
  const months = ['MESE 1', 'MESE 2', 'MESE 3'];
  return (
    <Paper>
      <div style={{position: 'absolute', left: 0, right: 0, top: 260, display: 'flex', justifyContent: 'center', gap: 26}}>
        {months.map((m, i) => {
          const p = prog(t, w[3] + i * 0.25 - 0.2, w[3] + i * 0.25 + 0.1, E.back);
          return (
            <div key={i} style={{width: 300, height: 760, transform: `scale(${p})`, ...cardStyle('#fff', 10), overflow: 'hidden', position: 'relative'}}>
              <div style={{background: C.ink, color: '#fff', textAlign: 'center', fontFamily: FONT, fontWeight: 900, fontSize: 40, padding: '8px 0'}}>{m}</div>
              <svg width={300} height={700} viewBox="0 0 300 700" style={{position: 'absolute', top: 60, left: 0}}>
                <GirlSide x={150} y={650} scale={0.7} h={0} noDb smile={i === 2 ? -0.4 : 0} hurt={i === 2 ? 0.3 : 0} />
              </svg>
            </div>
          );
        })}
      </div>
      {['=', '='].map((s, i) => {
        const p = prog(t, w[8] - 0.1 + i * 0.12, w[8] + 0.2 + i * 0.12, E.back);
        return (
          <div key={i} style={{position: 'absolute', left: 540 + (i ? 163 : -163), top: 640, transform: `translate(-50%,-50%) scale(${p})`, width: 90, height: 90, borderRadius: 45, background: C.red, border: `${OUT}px solid ${C.ink}`, color: '#fff', fontFamily: FONT, fontWeight: 900, fontSize: 64, display: 'flex', alignItems: 'center', justifyContent: 'center'}}>{s}</div>
        );
      })}
      <Tag t0={w[10] - 0.1} at={[540, 1110]} text="SEMPRE UGUALE" bg={C.red} fg="#fff" size={56} />
    </Paper>
  );
};

const A05: React.FC<{a: number; b: number}> = ({a, b}) => {
  const t = useT();
  const w = wd('a05');
  const c = prog(t, w[4], w[5] + 0.3, E.inOut);
  return (
    <SheetScene a={a - 1} b={b} z={[1.0, 1.0]} hl={0} dim rot={0}>
      <PenCircle p={c} x={290} y={410} w={400} h={92} />
      <PenNote t0={w[8]} x={700} y={250} text="1 volta a settimana!" size={54} />
    </SheetScene>
  );
};

const A06: React.FC<{a: number; b: number}> = ({a, b}) => {
  const t = useT();
  const w = wd('a06');
  const strike = prog(t, w[2], w[4], E.inOut);
  const flick = t > w[8] ? (t - w[8]) * 2 : 0;
  return (
    <SheetScene a={a - 1} b={b} z={[1.1, 1.14]} rot={0} flicker={flick}>
      <svg width={VW} height={VH} style={{position: 'absolute', left: 0, top: 0}}>
        {[0, 1, 2].map((i) => (
          <line key={i} x1={760} y1={470 + i * 38} x2={760 + 150 * strike} y2={470 + i * 38} stroke={C.red} strokeWidth={8} strokeLinecap="round" />
        ))}
      </svg>
      <PenNote t0={w[3]} x={860} y={380} text="kg?" size={74} rot={-10} />
      <PenNote t0={w[8]} x={540} y={250} text="cambiata ogni 2 settimane!" size={50} rot={-4} />
    </SheetScene>
  );
};

const A07: React.FC<{a: number; b: number}> = ({a, b}) => {
  const t = useT();
  const w = wd('a07');
  const p = enter(t, a);
  const q = prog(t, w[3], w[3] + 0.4, E.back);
  const pts = [0, 1, 2, 3, 4, 5].map((i) => [80 + i * 140, 360 + Math.sin(i * 2.1) * 60] as [number, number]);
  return (
    <Paper>
      <div style={{position: 'absolute', left: 60, right: 60, top: 300, height: 640, transform: `scale(${p})`, ...cardStyle('#fff', 12)}}>
        <div style={{fontFamily: FONT, fontWeight: 900, fontSize: 46, color: C.ink, padding: '20px 30px'}}>I TUOI PROGRESSI</div>
        <svg width={960} height={520} style={{position: 'absolute', left: 0, top: 100}}>
          <line x1={60} y1={460} x2={900} y2={460} stroke={C.ink} strokeWidth={6} />
          <line x1={60} y1={40} x2={60} y2={460} stroke={C.ink} strokeWidth={6} />
          {pts.map((pp, i) => (
            <text key={i} x={pp[0] + 40} y={pp[1]} fontFamily="Inter" fontWeight={900} fontSize={70} fill={C.red} opacity={prog(t, a + 0.2 + i * 0.12, a + 0.4 + i * 0.12)}>?</text>
          ))}
        </svg>
      </div>
      <div style={{position: 'absolute', left: 0, right: 0, top: 1010, display: 'flex', justifyContent: 'center', transform: `scale(${q}) rotate(-3deg)`}}>
        <div style={{...cardStyle(C.red, 10), padding: '10px 32px', fontFamily: FONT, fontWeight: 900, fontSize: 60, color: '#fff'}}>STAI MIGLIORANDO?</div>
      </div>
      <RikyCorner t={t} smile={-0.2} brow={14} />
    </Paper>
  );
};

const A08: React.FC<{a: number; b: number}> = ({a, b}) => {
  const t = useT();
  const w = wd('a08');
  const days = ['L', 'M', 'M', 'G', 'V', 'S', 'D'];
  const pick = [0, 2, 4];
  const p = enter(t, a);
  return (
    <Paper>
      <StepCard n="?" title="Quanti giorni hai davvero?" t0={a + 0.05} sub="la prima cosa che controllo" />
      <div style={{position: 'absolute', left: 50, right: 50, top: 520, display: 'flex', justifyContent: 'space-between', transform: `scale(${p})`}}>
        {days.map((d, i) => {
          const on = pick.includes(i) && t > w[6] + pick.indexOf(i) * 0.25;
          return (
            <div key={i} style={{width: 128, height: 160, ...cardStyle(on ? C.blue : '#fff', 8), display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', fontFamily: FONT, fontWeight: 900, fontSize: 64, color: on ? '#fff' : C.ink, transform: on ? 'translateY(-14px)' : 'none'}}>
              {d}
              <span style={{fontSize: 34, marginTop: 4}}>{on ? '✓' : ' '}</span>
            </div>
          );
        })}
      </div>
      <Tag t0={w[9]} at={[540, 860]} text="ES. 3 GIORNI × 45–60 MIN" bg="#fff" size={46} />
      <RikyCorner t={t} />
    </Paper>
  );
};

const A09: React.FC<{a: number; b: number}> = ({a, b}) => {
  const t = useT();
  const w = wd('a09');
  const p = prog(t, w[2] - 0.1, w[2] + 0.35, E.back);
  return (
    <Paper>
      <svg width={VW} height={VH} style={{position: 'absolute', left: 0, top: 0}}>
        <circle cx={540} cy={1180} r={340 * enter(t, a)} fill={C.blue} />
        <Riky x={540} y={mix(1900, 1600, enter(t, a))} scale={0.86} mouth={useTalk(ER)} smile={1} brow={8} armR={{hand: [640, 380]}} />
      </svg>
      <div style={{position: 'absolute', left: 0, right: 0, top: 220, display: 'flex', justifyContent: 'center', transform: `scale(${p}) rotate(-3deg)`}}>
        <div style={{...cardStyle('#fff', 12), padding: '14px 40px', fontFamily: FONT, fontWeight: 900, fontSize: 104, color: C.ink, letterSpacing: -2}}>
          <span style={{color: C.blue}}>3</span> MODIFICHE
        </div>
      </div>
    </Paper>
  );
};

const NewPlan: React.FC<{a: number; b: number}> = ({a, b}) => {
  const t = useT();
  const w = wd('a10');
  const week = [
    {d: 'LUN', s: 'A'},
    {d: 'MER', s: 'B'},
    {d: 'VEN', s: 'A'},
  ];
  const muscles = ['Gambe', 'Petto', 'Schiena', 'Spalle', 'Core'];
  return (
    <Paper>
      <StepCard n="1" title="Ogni muscolo 2 volte a settimana" t0={a + 0.05} sub="sedute complete, non un muscolo al giorno" />
      <div style={{position: 'absolute', left: 50, right: 50, top: 440, display: 'flex', gap: 22}}>
        {week.map((d, i) => {
          const p = prog(t, w[1] + i * 0.2, w[1] + i * 0.2 + 0.3, E.back);
          return (
            <div key={i} style={{flex: 1, transform: `scale(${p})`, ...cardStyle('#fff', 10), overflow: 'hidden'}}>
              <div style={{background: C.blue, color: '#fff', fontFamily: FONT, fontWeight: 900, fontSize: 44, padding: '10px 18px', display: 'flex', justifyContent: 'space-between'}}>
                <span>{d.d}</span>
                <span style={{background: '#fff', color: C.ink, borderRadius: 10, padding: '0 14px'}}>{d.s}</span>
              </div>
              <div style={{padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 10}}>
                {muscles.map((m, j) => (
                  <div key={j} style={{fontFamily: FONT, fontWeight: 900, fontSize: 32, color: C.ink, display: 'flex', alignItems: 'center', gap: 10, opacity: prog(t, w[4] + j * 0.08, w[4] + j * 0.08 + 0.2)}}>
                    <span style={{width: 26, height: 26, borderRadius: 8, background: C.blue, border: `4px solid ${C.ink}`}} />
                    {m}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
      <Tag t0={w[5]} at={[400, 1010]} text="OGNI MUSCOLO 2–3× ✓" bg={C.blue} fg="#fff" size={50} />
      <RikyCorner t={t} x={940} scale={0.46} />
    </Paper>
  );
};

const Basics: React.FC<{a: number; b: number}> = ({a, b}) => {
  const t = useT();
  const w = wd('a11');
  const ex = ['Squat', 'Panca con manubri', 'Rematore', 'Stacco rumeno', 'Lento avanti'];
  return (
    <Paper>
      <StepCard n="2" title="Pochi esercizi fondamentali" t0={a + 0.05} sub="sempre gli stessi per 4–6 settimane" />
      <div style={{position: 'absolute', left: 70, right: 70, top: 440, display: 'flex', flexDirection: 'column', gap: 18}}>
        {ex.map((e, i) => {
          const p = prog(t, w[1] + i * 0.15, w[1] + i * 0.15 + 0.3, E.back);
          return (
            <div key={i} style={{transform: `translateX(${(1 - p) * -400}px)`, opacity: p, ...cardStyle('#fff', 8), padding: '18px 26px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontFamily: FONT, fontWeight: 900, fontSize: 46, color: C.ink}}>
              {e}
              <span style={{fontSize: 40, opacity: prog(t, w[5], w[5] + 0.3)}}>🔒</span>
            </div>
          );
        })}
      </div>
      <Tag t0={w[5]} at={[460, 1110]} text="STESSI ESERCIZI = PROGRESSI MISURABILI" bg={C.blue} fg="#fff" size={32} />
      <RikyCorner t={t} x={980} scale={0.4} />
    </Paper>
  );
};

const LogTable: React.FC<{a: number; b: number}> = ({a, b}) => {
  const t = useT();
  const w = wd('a12');
  const rows = [
    ['Squat', '40 kg × 8', '42,5 kg × 8'],
    ['Panca manubri', '20 kg × 8', '20 kg × 9'],
    ['Rematore', '18 kg × 10', '20 kg × 10'],
  ];
  const beat = prog(t, w[8], w[9] + 0.3);
  return (
    <Paper>
      <StepCard n="3" title="Carichi e ripetizioni da battere" t0={a + 0.05} sub="scritti accanto a ogni esercizio" />
      <div style={{position: 'absolute', left: 50, right: 50, top: 440, transform: `scale(${enter(t, a)})`, ...cardStyle('#fff', 12), overflow: 'hidden', fontFamily: FONT}}>
        <div style={{display: 'grid', gridTemplateColumns: '1.2fr 1fr 1fr', background: C.ink, color: '#fff', fontWeight: 900, fontSize: 32, padding: '14px 20px'}}>
          <span>ESERCIZIO</span>
          <span>SETT. 1</span>
          <span>SETT. 2</span>
        </div>
        {rows.map((r, i) => {
          const p = prog(t, w[5] + i * 0.2, w[5] + i * 0.2 + 0.3);
          return (
            <div key={i} style={{display: 'grid', gridTemplateColumns: '1.2fr 1fr 1fr', padding: '22px 20px', borderTop: `4px solid ${C.ink}`, fontWeight: 900, fontSize: 36, color: C.ink, alignItems: 'center'}}>
              <span>{r[0]}</span>
              <span style={{opacity: p}}>{r[1]}</span>
              <span style={{opacity: beat, color: C.blue}}>{r[2]} ↑</span>
            </div>
          );
        })}
      </div>
      <RikyCorner t={t} x={900} scale={0.5} pen />
    </Paper>
  );
};

const Chart: React.FC<{a: number; b: number}> = ({a, b}) => {
  const t = useT();
  const w = wd('a13');
  const pts = [0, 1, 2, 3, 4, 5].map((i) => [100 + i * 150, 430 - i * 62 - (i % 2) * 14] as [number, number]);
  const p = prog(t, a + 0.2, w[7] + 0.2, E.inOut);
  const n = Math.max(1, Math.floor(p * pts.length));
  return (
    <Paper>
      <div style={{position: 'absolute', left: 60, right: 60, top: 300, height: 640, transform: `scale(${enter(t, a)})`, ...cardStyle('#fff', 12)}}>
        <div style={{fontFamily: FONT, fontWeight: 900, fontSize: 46, color: C.ink, padding: '20px 30px'}}>OGNI SEDUTA TI DICE COME VA</div>
        <svg width={960} height={520} style={{position: 'absolute', left: 0, top: 100}}>
          <line x1={60} y1={460} x2={900} y2={460} stroke={C.ink} strokeWidth={6} />
          <line x1={60} y1={40} x2={60} y2={460} stroke={C.ink} strokeWidth={6} />
          <polyline points={pts.slice(0, n).map((q) => q.join(',')).join(' ')} stroke={C.blue} strokeWidth={14} fill="none" strokeLinecap="round" strokeLinejoin="round" />
          {pts.slice(0, n).map((q, i) => (
            <circle key={i} cx={q[0]} cy={q[1]} r={18} fill="#fff" stroke={C.ink} strokeWidth={6} />
          ))}
        </svg>
      </div>
      <Tag t0={w[7] - 0.1} at={[540, 1040]} text="STAI PROGREDENDO ✓" bg={C.blue} fg="#fff" size={54} />
      <Sparkles t0={w[7]} x={800} y={460} n={10} />
      <RikyCorner t={t} />
    </Paper>
  );
};

const Trust: React.FC<{a: number; b: number}> = ({a, b}) => {
  const t = useT();
  const w = wd('a14');
  const stamp = prog(t, w[6] - 0.1, w[6] + 0.25, E.back);
  return (
    <SheetScene a={a - 1} b={b} z={[0.82, 0.86]} rot={-3}>
      <div style={{position: 'absolute', left: 540, top: 820, transform: `translate(-50%,-50%) scale(${mix(2.2, 1, stamp)}) rotate(-12deg)`, opacity: stamp, border: `12px solid ${C.blue}`, borderRadius: 26, padding: '12px 36px', background: 'rgba(255,255,255,0.92)', fontFamily: FONT, fontWeight: 900, fontSize: 88, color: C.blue, textAlign: 'center', lineHeight: 1}}>
        ANALISI
        <div style={{fontSize: 52}}>GRATUITA</div>
      </div>
      <Tag t0={w[14] - 0.1} at={[330, 1260]} text="TI DICO COSA CAMBIARE" bg="#fff" size={40} />
    </SheetScene>
  );
};

const Cta: React.FC<{a: number}> = ({a}) => {
  const t = useT();
  const w = wd('a15');
  const pin = enter(t, a);
  const wave = Math.sin(t * 10) * 26;
  return (
    <Paper>
      <svg width={VW} height={VH} style={{position: 'absolute', left: 0, top: 0}}>
        <circle cx={540} cy={1330} r={330 * pin} fill={C.blue} />
        <Riky x={540} y={mix(1900, 1720, pin)} scale={0.86} mouth={useTalk(ER)} smile={1} brow={8} armR={{hand: [650 + wave, 380]}} tilt={Math.sin(t * 3) * 2} />
      </svg>
      <KeywordCTA t0={w[5] - 0.1} word="ANALISI" />
      <Handle t0={w[8]} top={720} />
      <Sparkles t0={w[6]} x={540} y={400} n={14} />
    </Paper>
  );
};

/* ------------------------------------------------------------------ sottotitoli */
const buildCaps = (): CapLine[] => {
  const big: CapLine[] = [];
  const x1 = v('a01');
  const x2 = v('a02');
  big.push({t0: x1.words[0] - 0.05, t1: W.a02[0] - 0.02, text: x1.text, big: true, size: 84, y: 90, hl: [3, 6, 7, 8], color: C.blue, times: x1.words, dark: false});
  big.push({t0: x2.words[0] - 0.05, t1: W.a03[0] - 0.02, text: x2.text, big: true, size: 100, y: 90, hl: [2, 5], color: C.blue, times: x2.words, slam: 2});
  const meta: Record<string, number[]> = {
    a03: [1, 3, 5, 9],
    a04: [4, 10],
    a05: [4, 8, 9, 10],
    a06: [3, 8],
    a07: [6],
    a08: [6, 7],
    a09: [2, 3],
    a10: [4, 5],
    a11: [1, 3, 5],
    a12: [5, 7, 9],
    a13: [7],
    a14: [6, 7],
    a15: [6],
  };
  const DISPLAY: Record<string, string> = {a15: 'Vuoi che guardi la tua? Scrivimi ANALISI in DM.'};
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

const TT: Tr['type'][] = ['iris', 'wipeR', 'wipeU', 'stripes', 'wipeL', 'iris', 'wipeR', 'stripes', 'wipeU', 'wipeL', 'wipeR', 'iris', 'wipeU', 'stripes'];
const TC = [C.blue, C.ink, C.red, C.ink, C.red, C.blue, C.ink, C.blue, C.blue, C.ink, C.blue, C.ink, C.blue, C.ink];
export const TRANS: Tr[] = SL.slice(1).map((s, i) => ({t: W[s][0], type: TT[i], color: TC[i]}));

const SCENES: Record<string, React.FC<{a: number; b: number}>> = {
  a01: A01, a02: A02, a03: A03, a04: A04, a05: A05, a06: A06, a07: A07, a08: A08, a09: A09, a10: NewPlan, a11: Basics, a12: LogTable, a13: Chart, a14: Trust,
};

export const Video15: React.FC = () => (
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
    <Show from={W.a15[0]} to={W.a15[1] + 1}><Cta a={W.a15[0]} /></Show>
    <Captions lines={CAPS} />
    <Transitions list={TRANS} />
    <Grain />
    <Audio src={staticFile('soundtrack15.wav')} />
  </AbsoluteFill>
);
export {VW, VH};
