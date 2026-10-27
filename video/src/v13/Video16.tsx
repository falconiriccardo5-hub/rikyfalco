import React from 'react';
import {AbsoluteFill, Audio, staticFile} from 'remotion';
import {C, E, FONT, OUT, mix, prog, useT, useTalk} from '../brand';
import {Show, Grain, cardStyle} from '../ui';
import {Captions, CapLine} from '../Captions';
import {Transitions, Tr} from '../Transitions';
import {Riky} from '../Riky';
import {GirlSide} from './Girl';
import {VW, VH, FLOOR, World, repH, Tag, Sparkles, KeywordCTA, Handle, StepCard, Burst} from './kit';
import timing from '../voice16_timing.json';
import envR from '../voice16_env_r.json';

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
const SL = ['b01', 'b02', 'b03', 'b04', 'b05', 'b06', 'b07', 'b08', 'b09', 'b10', 'b11', 'b12', 'b13', 'b14', 'b15', 'b16'];
export const END = Math.min(64, en('b16') + 1.4);
export const DURATION16 = Math.ceil(END * FPS);
export const W: Record<string, [number, number]> = Object.fromEntries(
  SL.map((s, i) => [s, [i === 0 ? 0 : st(s) - G, i === SL.length - 1 ? END : st(SL[i + 1]) - G]]),
) as Record<string, [number, number]>;

const GX = 430;
const enter = (t: number, a: number, d = 0.4) => prog(t, a, a + d, E.back);

const Paper: React.FC<{children: React.ReactNode}> = ({children}) => (
  <AbsoluteFill style={{background: '#fff', backgroundImage: 'radial-gradient(rgba(17,17,17,0.10) 2.5px, transparent 3px)', backgroundSize: '54px 54px'}}>{children}</AbsoluteFill>
);

const RikyAt: React.FC<{x?: number; y?: number; scale?: number; flip?: boolean; smile?: number; brow?: number; browTilt?: number; arm?: 'up' | 'point' | 'shrug' | null; circle?: boolean}> = ({x = 540, y = 1560, scale = 0.8, flip = false, smile = 0.9, brow = 6, browTilt = 0, arm = null, circle}) => {
  const t = useT();
  const talk = useTalk(ER);
  const wave = Math.sin(t * 10) * 24;
  return (
    <svg width={VW} height={VH} style={{position: 'absolute', left: 0, top: 0}}>
      {circle && <circle cx={x} cy={y - 400 * scale} r={330 * scale / 0.8} fill={C.blue} />}
      <Riky
        x={x}
        y={y}
        scale={scale}
        flip={flip}
        mouth={talk}
        smile={smile}
        brow={brow}
        browTilt={browTilt}
        tilt={arm === 'shrug' ? Math.sin(t * 6) * 4 : Math.sin(t * 3) * 2}
        armR={arm === 'up' ? {hand: [640 + wave, 380]} : arm === 'point' ? {hand: [700, 560]} : arm === 'shrug' ? {hand: [660, 690]} : undefined}
        armL={arm === 'shrug' ? {hand: [160, 690]} : undefined}
      />
    </svg>
  );
};

/* ------------------------------------------------------------------ scene */
const B01: React.FC<{a: number; b: number}> = ({a, b}) => {
  const t = useT();
  const m = Math.min(6, 1 + Math.floor((t - a) / 0.45));
  return (
    <AbsoluteFill>
      <World cam={{z: mix(1.12, 1.2, prog(t, a, b, E.lin)), cx: 520, cy: 1060}}>
        <GirlSide x={GX} y={FLOOR} h={repH(t, a, 2.0)} sway={Math.sin(t * 4)} smile={-0.1} plate={34} />
      </World>
      <div style={{position: 'absolute', right: 60, top: 470, width: 250, ...cardStyle('#fff', 10), overflow: 'hidden', textAlign: 'center', fontFamily: FONT, fontWeight: 900, transform: 'rotate(5deg)'}}>
        <div style={{background: C.ink, color: '#fff', fontSize: 30, padding: '6px 0'}}>MESE</div>
        <div style={{fontSize: 130, color: C.red, lineHeight: 1.1}}>{m}</div>
      </div>
    </AbsoluteFill>
  );
};

const FiveDots: React.FC<{a: number; b: number}> = ({a, b}) => {
  const t = useT();
  const w = wd('b02');
  const p = enter(t, a);
  return (
    <Paper>
      <RikyAt circle arm="point" y={1560} />
      <div style={{position: 'absolute', left: 0, right: 0, top: 260, display: 'flex', flexDirection: 'column', alignItems: 'center', transform: `scale(${p})`}}>
        <div style={{fontFamily: FONT, fontWeight: 900, fontSize: 330, lineHeight: 0.9, color: C.blue, WebkitTextStroke: `14px ${C.ink}`, paintOrder: 'stroke fill', textShadow: `14px 14px 0 ${C.ink}`}}>5</div>
        <div style={{fontFamily: FONT, fontWeight: 900, fontSize: 92, color: C.ink, letterSpacing: -2}}>SEGNALI</div>
        <div style={{display: 'flex', gap: 22, marginTop: 20}}>
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} style={{width: 54, height: 54, borderRadius: 27, background: t > w[2] + i * 0.12 ? C.red : '#fff', border: `${OUT}px solid ${C.ink}`}} />
          ))}
        </div>
      </div>
    </Paper>
  );
};

const B03: React.FC<{a: number; b: number}> = ({a, b}) => {
  const t = useT();
  const w = wd('b03');
  const days = ['L', 'M', 'M', 'G', 'V', 'S', 'D'];
  const on = [0, 2, 4];
  return (
    <AbsoluteFill>
      <World cam={{z: mix(1.12, 1.2, prog(t, a, b, E.lin)), cx: 520, cy: 1060}}>
        <GirlSide x={GX} y={FLOOR} sq={repH(t, a + 0.1, 1.6, 0.03, 0.85)} bar sway={Math.sin(t * 4)} smile={0.3} />
        {t > w[7] && [0, 1, 2].map((i) => {
          const d = ((t - w[7]) * 1.4 + i * 0.33) % 1;
          return <path key={i} transform={`translate(${GX + 120 + i * 40},${FLOOR - 700 + d * 120})`} d="M 0 -18 C 10 -4 14 4 0 14 C -14 4 -10 -4 0 -18 Z" fill={C.blueL} stroke={C.ink} strokeWidth={4} opacity={1 - d} />;
        })}
      </World>
      <div style={{position: 'absolute', left: 50, right: 50, top: 190, display: 'flex', justifyContent: 'space-between'}}>
        {days.map((d, i) => {
          const ok = on.includes(i) && t > w[1] + on.indexOf(i) * 0.25;
          return (
            <div key={i} style={{width: 120, height: 130, ...cardStyle(ok ? C.blue : '#fff', 7), display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', fontFamily: FONT, fontWeight: 900, fontSize: 54, color: ok ? '#fff' : C.ink}}>
              {d}
              <span style={{fontSize: 30}}>{ok ? '✓' : ' '}</span>
            </div>
          );
        })}
      </div>
      <Tag t0={w[8]} at={[760, 1180]} text="TUTTE LE SERIE ✓" size={42} />
    </AbsoluteFill>
  );
};

const Mirror: React.FC<{a: number; b: number}> = ({a, b}) => {
  const t = useT();
  const w = wd('b04');
  const p = enter(t, a);
  const eq = prog(t, w[4] - 0.1, w[4] + 0.25, E.back);
  return (
    <Paper>
      <div style={{position: 'absolute', left: 0, right: 0, top: 220, display: 'flex', justifyContent: 'center', gap: 120, transform: `scale(${p})`}}>
        {['PRIMA', 'OGGI'].map((lbl, i) => (
          <div key={i} style={{width: 360, height: 900, borderRadius: 180, border: `14px solid ${C.ink}`, background: '#EEE9FB', position: 'relative', overflow: 'hidden', boxShadow: `12px 12px 0 ${C.blue}`}}>
            <svg width={332} height={872} viewBox="0 0 332 872">
              <GirlSide x={166} y={800} scale={0.82} h={0} noDb smile={i ? -0.3 : 0.2} hurt={i ? 0.3 : 0} />
            </svg>
            <div style={{position: 'absolute', left: 0, right: 0, top: 40, textAlign: 'center', fontFamily: FONT, fontWeight: 900, fontSize: 44, color: C.ink}}>{lbl}</div>
          </div>
        ))}
      </div>
      <div style={{position: 'absolute', left: 540, top: 670, transform: `translate(-50%,-50%) scale(${eq})`, width: 120, height: 120, borderRadius: 60, background: C.red, border: `${OUT}px solid ${C.ink}`, color: '#fff', fontFamily: FONT, fontWeight: 900, fontSize: 86, display: 'flex', alignItems: 'center', justifyContent: 'center'}}>=</div>
    </Paper>
  );
};

const NotThis: React.FC<{a: number; b: number}> = ({a, b}) => {
  const w = wd('b05');
  return (
    <Paper>
      <RikyAt circle arm="shrug" smile={0.2} brow={14} browTilt={-4} />
      <Tag t0={w[1] - 0.05} at={[300, 330]} text="PIGRIZIA" icon="no" size={62} rot={-5} />
      <Tag t0={w[4]} at={[760, 500]} text="GENETICA" icon="no" size={62} rot={4} />
    </Paper>
  );
};

const Plateau: React.FC<{a: number; b: number}> = ({a, b}) => {
  const t = useT();
  const w = wd('b06');
  const p = prog(t, a + 0.2, w[10], E.inOut);
  const pts: [number, number][] = [];
  for (let i = 0; i <= 40; i++) {
    const x = i / 40;
    pts.push([80 + x * 820, 440 - 360 * (1 - Math.exp(-x * 5))]);
  }
  const n = Math.max(2, Math.floor(p * pts.length));
  return (
    <Paper>
      <div style={{position: 'absolute', left: 60, right: 60, top: 280, height: 640, transform: `scale(${enter(t, a)})`, ...cardStyle('#fff', 12)}}>
        <div style={{fontFamily: FONT, fontWeight: 900, fontSize: 44, color: C.ink, padding: '20px 30px'}}>STESSO STIMOLO = CORPO FERMO</div>
        <svg width={960} height={520} style={{position: 'absolute', left: 0, top: 100}}>
          <line x1={60} y1={460} x2={920} y2={460} stroke={C.ink} strokeWidth={6} />
          <line x1={60} y1={40} x2={60} y2={460} stroke={C.ink} strokeWidth={6} />
          <polyline points={pts.slice(0, n).map((q) => q.join(',')).join(' ')} stroke={C.blue} strokeWidth={14} fill="none" strokeLinecap="round" strokeLinejoin="round" />
          {p > 0.6 && <rect x={560} y={50} width={350} height={70} rx={14} fill="none" stroke={C.red} strokeWidth={8} strokeDasharray="16 10" />}
        </svg>
      </div>
      <Tag t0={w[10] - 0.1} at={[700, 1010]} text="SI ADATTA E SI FERMA" bg={C.red} fg="#fff" size={46} />
    </Paper>
  );
};

const Maintain: React.FC<{a: number; b: number}> = ({a, b}) => {
  const t = useT();
  const w = wd('b07');
  const s = prog(t, w[7] - 0.1, w[7] + 0.25, E.back);
  return (
    <Paper>
      <RikyAt circle arm="point" smile={0.4} brow={10} />
      <div style={{position: 'absolute', left: 0, right: 0, top: 300, display: 'flex', justifyContent: 'center'}}>
        <div style={{transform: `scale(${mix(2.2, 1, s)}) rotate(-8deg)`, opacity: s, border: `14px solid ${C.red}`, borderRadius: 26, padding: '16px 40px', background: 'rgba(255,255,255,0.95)', fontFamily: FONT, fontWeight: 900, fontSize: 92, color: C.red, letterSpacing: 2}}>MANTENIMENTO</div>
      </div>
    </Paper>
  );
};

const SIGNALS = [
  {slot: 'b09', title: 'Stessi pesi da più di un mese', icon: 'kg'},
  {slot: 'b10', title: 'Tante ripetizioni in canna', icon: 'reps'},
  {slot: 'b11', title: 'Non scrivi carichi e ripetizioni', icon: 'note'},
  {slot: 'b12', title: 'Cambi scheda senza criterio', icon: 'cards'},
  {slot: 'b13', title: 'Dormi poco e recuperi male', icon: 'moon'},
];

const SignalIcon: React.FC<{k: string; t: number; a: number}> = ({k, t, a}) => {
  const d = t - a;
  if (k === 'kg')
    return (
      <div style={{display: 'flex', gap: 16, justifyContent: 'center'}}>
        {['SETT 1', 'SETT 2', 'SETT 3', 'SETT 4', 'SETT 5'].map((s, i) => (
          <div key={i} style={{width: 160, ...cardStyle('#fff', 7), overflow: 'hidden', textAlign: 'center', fontFamily: FONT, fontWeight: 900, opacity: prog(t, a + 0.3 + i * 0.18, a + 0.5 + i * 0.18), transform: `translateY(${(1 - prog(t, a + 0.3 + i * 0.18, a + 0.5 + i * 0.18)) * 40}px)`}}>
            <div style={{background: C.ink, color: '#fff', fontSize: 24, padding: '4px 0'}}>{s}</div>
            <div style={{fontSize: 56, color: C.red, padding: '10px 0'}}>8 kg</div>
          </div>
        ))}
      </div>
    );
  if (k === 'reps') {
    const done = Math.min(6, Math.floor(d * 5));
    return (
      <div style={{display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20}}>
        <div style={{display: 'flex', gap: 12}}>
          {Array.from({length: 14}).map((_, i) => (
            <div key={i} style={{width: 52, height: 120, borderRadius: 14, border: `${OUT}px solid ${C.ink}`, background: i < done ? C.blue : i < 8 ? '#fff' : '#F7F5FF', opacity: i < 8 ? 1 : 0.6}} />
          ))}
        </div>
        <div style={{fontFamily: FONT, fontWeight: 900, fontSize: 46, color: C.ink}}>
          Ti fermi a 8… <span style={{color: C.red}}>ma ne avevi ancora 6</span>
        </div>
      </div>
    );
  }
  if (k === 'note')
    return (
      <div style={{width: 560, height: 420, margin: '0 auto', ...cardStyle('#fff', 10), padding: '26px 30px', position: 'relative'}}>
        <div style={{fontFamily: FONT, fontWeight: 900, fontSize: 40, color: C.ink}}>DIARIO ALLENAMENTO</div>
        {[0, 1, 2, 3].map((i) => (
          <div key={i} style={{marginTop: 30, borderBottom: '4px dashed rgba(17,17,17,0.25)', height: 34, fontFamily: FONT, fontWeight: 900, fontSize: 40, color: C.red, opacity: prog(t, a + 0.3 + i * 0.2, a + 0.5 + i * 0.2)}}>?</div>
        ))}
      </div>
    );
  if (k === 'cards')
    return (
      <div style={{position: 'relative', height: 460, width: 900, margin: '0 auto'}}>
        {[0, 1, 2, 3].map((i) => {
          const p = prog(t, a + 0.2 + i * 0.3, a + 0.5 + i * 0.3, E.back);
          return (
            <div key={i} style={{position: 'absolute', left: 120 + i * 150, top: 40 + (i % 2) * 40, width: 320, height: 380, ...cardStyle('#fff', 8), transform: `rotate(${(i - 1.5) * 9}deg) scale(${p})`, padding: '20px 22px', fontFamily: FONT, fontWeight: 900, color: C.ink}}>
              <div style={{fontSize: 34, background: i === 3 ? C.red : C.ink, color: '#fff', borderRadius: 10, padding: '4px 12px', display: 'inline-block'}}>SCHEDA {i + 1}</div>
              {[0, 1, 2, 3, 4].map((j) => (
                <div key={j} style={{height: 18, borderRadius: 9, background: '#E6E1F5', marginTop: 26, width: `${60 + ((i + j) % 3) * 15}%`}} />
              ))}
            </div>
          );
        })}
      </div>
    );
  return (
    <div style={{display: 'flex', justifyContent: 'center', gap: 40, alignItems: 'center'}}>
      <svg width={300} height={300} viewBox="0 0 300 300">
        <circle cx={150} cy={150} r={140} fill={C.ink} />
        <path d="M 190 60 A 100 100 0 1 0 220 200 A 80 80 0 1 1 190 60 Z" fill="#FFE9A8" stroke={C.ink} strokeWidth={6} />
        <text x={150} y={268} textAnchor="middle" fontFamily="Inter" fontWeight={900} fontSize={34} fill="#fff">zZz</text>
      </svg>
      <div style={{...cardStyle('#fff', 10), padding: '20px 30px', fontFamily: FONT, fontWeight: 900, textAlign: 'center'}}>
        <div style={{fontSize: 120, color: C.red, lineHeight: 1}}>5 h</div>
        <div style={{fontSize: 34, color: C.ink}}>di sonno</div>
        <div style={{width: 220, height: 60, border: `${OUT}px solid ${C.ink}`, borderRadius: 14, marginTop: 16, padding: 6}}>
          <div style={{width: `${mix(60, 18, Math.min(1, d / 1.5))}%`, height: '100%', background: C.red, borderRadius: 6}} />
        </div>
      </div>
    </div>
  );
};

const Signal: React.FC<{a: number; b: number; i: number}> = ({a, b, i}) => {
  const t = useT();
  const s = SIGNALS[i];
  return (
    <Paper>
      <div style={{position: 'absolute', left: 54, right: 54, top: 120, display: 'flex', alignItems: 'center', gap: 20}}>
        {[0, 1, 2, 3, 4].map((k) => (
          <div key={k} style={{flex: 1, height: 22, borderRadius: 11, border: `4px solid ${C.ink}`, background: k < i ? C.red : k === i ? (Math.sin(t * 8) > 0 ? C.red : '#fff') : '#fff'}} />
        ))}
      </div>
      <StepCard n={i + 1} title={s.title} t0={a + 0.05} bad top={190} />
      <div style={{position: 'absolute', left: 0, right: 0, top: 520}}>
        <SignalIcon k={s.icon} t={t} a={a} />
      </div>
      <RikyAt x={930} y={1560} scale={0.42} flip smile={0.2} brow={10} />
    </Paper>
  );
};

const Checklist: React.FC<{a: number; b: number}> = ({a, b}) => {
  const t = useT();
  const w = wd('b14');
  const marks = [0, 2];
  return (
    <Paper>
      <div style={{position: 'absolute', left: 60, right: 60, top: 150, fontFamily: FONT, fontWeight: 900, fontSize: 64, color: C.ink, letterSpacing: -1}}>NE RICONOSCI <span style={{color: C.red}}>ALMENO 2?</span></div>
      <div style={{position: 'absolute', left: 60, right: 60, top: 330, display: 'flex', flexDirection: 'column', gap: 16}}>
        {SIGNALS.map((s, i) => {
          const on = marks.includes(i) && t > w[3] + marks.indexOf(i) * 0.3;
          return (
            <div key={i} style={{display: 'flex', alignItems: 'center', gap: 20, ...cardStyle('#fff', 7), padding: '16px 22px'}}>
              <div style={{width: 58, height: 58, borderRadius: 14, border: `${OUT - 1}px solid ${C.ink}`, background: on ? C.red : '#fff', color: '#fff', fontFamily: FONT, fontWeight: 900, fontSize: 38, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0}}>{on ? '✓' : ''}</div>
              <div style={{fontFamily: FONT, fontWeight: 900, fontSize: 38, color: C.ink}}>{s.title}</div>
            </div>
          );
        })}
      </div>
      <Tag t0={w[7] - 0.1} at={[540, 1110]} text="SERVE UNA PROGRESSIONE CHIARA" bg={C.blue} fg="#fff" size={40} />
    </Paper>
  );
};

const Trust: React.FC<{a: number; b: number}> = ({a, b}) => {
  const t = useT();
  const w = wd('b15');
  const chips = [
    {txt: 'DATI', at: w[7]},
    {txt: 'PROGRESSIONE', at: w[8]},
    {txt: 'CONTROLLI REGOLARI', at: w[10]},
  ];
  return (
    <Paper>
      <RikyAt circle x={540} y={1560} arm="up" />
      <div style={{position: 'absolute', left: 60, right: 60, top: 140, fontFamily: FONT, fontWeight: 900, fontSize: 60, color: C.ink, letterSpacing: -1}}>NEI MIEI PERCORSI</div>
      <div style={{position: 'absolute', left: 60, right: 60, top: 240, fontFamily: FONT, fontWeight: 900, fontSize: 60, color: C.blue, letterSpacing: -1}}>PARTO DA QUI</div>
      <div style={{position: 'absolute', left: 60, right: 60, top: 400, display: 'flex', flexDirection: 'column', gap: 20, alignItems: 'flex-start'}}>
        {chips.map((c, i) => {
          const p = prog(t, c.at - 0.1, c.at + 0.2, E.back);
          return (
            <div key={i} style={{transform: `scale(${p})`, transformOrigin: '0 50%', ...cardStyle(i === 1 ? C.blue : '#fff', 8), padding: '12px 30px', fontFamily: FONT, fontWeight: 900, fontSize: 52, color: i === 1 ? '#fff' : C.ink}}>✓ {c.txt}</div>
          );
        })}
      </div>
    </Paper>
  );
};

const Cta: React.FC<{a: number}> = ({a}) => {
  const t = useT();
  const w = wd('b16');
  return (
    <Paper>
      <RikyAt circle arm="up" />
      <KeywordCTA t0={w[4] - 0.1} word="ANALISI" />
      <Handle t0={w[6]} top={720} />
      <Sparkles t0={w[5]} x={540} y={400} n={14} />
      {t < w[4] && <Burst t0={a + 0.1} x={540} y={420} text="QUANTI?" color={C.blue} size={80} hold={5} />}
    </Paper>
  );
};

/* ------------------------------------------------------------------ sottotitoli */
const buildCaps = (): CapLine[] => {
  const big: CapLine[] = [];
  const x1 = v('b01');
  big.push({t0: x1.words[0] - 0.05, t1: W.b02[0] - 0.02, text: x1.text, big: true, size: 86, y: 110, hl: [8, 10], color: C.red, times: x1.words, slam: 8});
  const x5 = v('b05');
  const meta: Record<string, number[]> = {
    b02: [2, 3],
    b03: [3, 4, 8, 10],
    b04: [3, 5],
    b05: [2, 6],
    b06: [6, 7, 10, 12],
    b07: [7, 9],
    b08: [2, 3],
    b09: [3, 7, 8],
    b10: [4, 7, 8],
    b11: [3, 4, 6],
    b12: [2, 7, 8],
    b13: [1, 2, 5],
    b14: [3, 4, 9],
    b15: [7, 8, 10, 11],
    b16: [5],
  };
  void x5;
  const DISPLAY: Record<string, string> = {b16: 'Quanti segnali hai riconosciuto? Scrivimi ANALISI in privato.'};
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

const TT: Tr['type'][] = ['iris', 'wipeR', 'wipeL', 'stripes', 'wipeU', 'iris', 'wipeR', 'wipeL', 'wipeR', 'wipeL', 'wipeR', 'wipeL', 'stripes', 'wipeU', 'iris'];
const TC = [C.blue, C.ink, C.blue, C.red, C.ink, C.red, C.blue, C.red, C.ink, C.red, C.ink, C.red, C.blue, C.ink, C.blue];
export const TRANS: Tr[] = SL.slice(1).map((s, i) => ({t: W[s][0], type: TT[i], color: TC[i]}));

const SCENES: Record<string, React.FC<{a: number; b: number}>> = {
  b01: B01,
  b02: FiveDots,
  b03: B03,
  b04: Mirror,
  b05: NotThis,
  b06: Plateau,
  b07: Maintain,
  b08: ({a, b}) => <FiveDots a={a} b={b} />,
  b09: ({a, b}) => <Signal a={a} b={b} i={0} />,
  b10: ({a, b}) => <Signal a={a} b={b} i={1} />,
  b11: ({a, b}) => <Signal a={a} b={b} i={2} />,
  b12: ({a, b}) => <Signal a={a} b={b} i={3} />,
  b13: ({a, b}) => <Signal a={a} b={b} i={4} />,
  b14: Checklist,
  b15: Trust,
};

export const Video16: React.FC = () => (
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
    <Show from={W.b16[0]} to={W.b16[1] + 1}><Cta a={W.b16[0]} /></Show>
    <Captions lines={CAPS} />
    <Transitions list={TRANS} />
    <Grain />
    <Audio src={staticFile('soundtrack16.wav')} />
  </AbsoluteFill>
);
export {VW, VH};
