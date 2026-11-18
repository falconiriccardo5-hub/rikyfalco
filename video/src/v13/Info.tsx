/** Reel infografici del Mese 2 (senza clone): I-1 muscolo, I-2 schiena, I-3 sonno, I-4 passi.
 *  Stile delle 4 settimane: studio 2D, la ragazza (GirlSide) e Riccardo (Riky), voce di Riccardo. */
import React from 'react';
import {AbsoluteFill} from 'remotion';
import {C, E, FONT, OUT, mix, prog, useT} from '../brand';
import {cardStyle} from '../ui';
import {GirlSide} from './Girl';
import {FLOOR, World, repH, Tag, StepCard, Burst, Sparkles, Headline} from './kit';
import {Paper, RikyAt, BigSign, RiseChart, TrustChips, CtaScene, LogTable, Mirror, enter} from './common';
import {makeTiming, buildCaps, ReelShell, VT, SceneFC} from './reel';
import tM from '../voice_info_m_timing.json';
import tS from '../voice_info_s_timing.json';
import tD from '../voice_info_d_timing.json';
import tP from '../voice_info_p_timing.json';
import eM from '../voice_info_m_env_r.json';
import eS from '../voice_info_s_env_r.json';
import eD from '../voice_info_d_env_r.json';
import eP from '../voice_info_p_env_r.json';

const slots = (k: string) => Array.from({length: 13}, (_, i) => `${k}${String(i + 1).padStart(2, '0')}`);

/* ------------------------------------------------------------------ componenti */
/** elenco di voci che entrano sulle parole */
export const ChipList: React.FC<{items: {txt: string; at: number}[]; top?: number; bad?: boolean; left?: number}> = ({items, top = 520, bad, left = 70}) => {
  const t = useT();
  return (
    <div style={{position: 'absolute', left, right: 70, top, display: 'flex', flexDirection: 'column', gap: 26}}>
      {items.map((c, i) => {
        const p = prog(t, c.at - 0.1, c.at + 0.25, E.back);
        return (
          <div key={i} style={{display: 'flex', alignItems: 'center', gap: 22, transform: `translateX(${(1 - p) * -200}px)`, opacity: p}}>
            <div style={{width: 92, height: 92, borderRadius: 46, flexShrink: 0, background: bad ? C.red : C.blue, border: `${OUT}px solid ${C.ink}`, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: FONT, fontWeight: 900, fontSize: 48}}>{bad ? '✕' : i + 1}</div>
            <div style={{...cardStyle('#fff', 8), padding: '16px 26px', fontFamily: FONT, fontWeight: 900, fontSize: 48, color: C.ink, lineHeight: 1.08}}>{c.txt}</div>
          </div>
        );
      })}
    </div>
  );
};

/** barre verticali con etichette (confronti, cali, crescite) */
export const Bars: React.FC<{a: number; title: string; bars: {label: string; v: number; val?: string; col?: string; at?: number}[]; top?: number; max?: number}> = ({a, title, bars, top = 330, max = 1}) => {
  const t = useT();
  const H = 620;
  return (
    <div style={{position: 'absolute', left: 60, right: 60, top, height: 900, transform: `scale(${enter(t, a)})`, ...cardStyle('#fff', 12)}}>
      <div style={{fontFamily: FONT, fontWeight: 900, fontSize: 46, color: C.ink, padding: '24px 32px', lineHeight: 1.05}}>{title}</div>
      <div style={{position: 'absolute', left: 40, right: 40, bottom: 110, height: H, display: 'flex', alignItems: 'flex-end', justifyContent: 'space-around', borderBottom: `6px solid ${C.ink}`}}>
        {bars.map((b, i) => {
          const p = prog(t, (b.at ?? a + 0.3 + i * 0.25) - 0.05, (b.at ?? a + 0.3 + i * 0.25) + 0.5, E.out);
          const h = (b.v / max) * (H - 90) * p;
          return (
            <div key={i} style={{width: 150, display: 'flex', flexDirection: 'column', alignItems: 'center'}}>
              <div style={{fontFamily: FONT, fontWeight: 900, fontSize: 46, color: b.col ?? C.blue, opacity: p, marginBottom: 10, whiteSpace: 'nowrap'}}>{b.val}</div>
              <div style={{width: 130, height: h, background: b.col ?? C.blue, border: `${OUT}px solid ${C.ink}`, borderBottom: 'none', borderRadius: '18px 18px 0 0'}} />
            </div>
          );
        })}
      </div>
      <div style={{position: 'absolute', left: 40, right: 40, bottom: 30, display: 'flex', justifyContent: 'space-around'}}>
        {bars.map((b, i) => (
          <div key={i} style={{width: 190, textAlign: 'center', fontFamily: FONT, fontWeight: 900, fontSize: 36, color: C.ink}}>{b.label}</div>
        ))}
      </div>
    </div>
  );
};

/** griglia di "studi" che si riempie */
export const StudyGrid: React.FC<{a: number; n?: number; title: string; sub: string; until: number}> = ({a, n = 48, title, sub, until}) => {
  const t = useT();
  const k = Math.floor(prog(t, a + 0.3, until, E.inOut) * n);
  return (
    <div style={{position: 'absolute', left: 60, right: 60, top: 360, transform: `scale(${enter(t, a)})`, ...cardStyle('#fff', 12), padding: '26px 30px 34px'}}>
      <div style={{fontFamily: FONT, fontWeight: 900, fontSize: 56, color: C.blue, lineHeight: 1}}>{title}</div>
      <div style={{fontFamily: FONT, fontWeight: 900, fontSize: 38, color: C.ink, marginTop: 8}}>{sub}</div>
      <div style={{display: 'grid', gridTemplateColumns: 'repeat(8, 1fr)', gap: 14, marginTop: 26}}>
        {Array.from({length: n}).map((_, i) => (
          <div key={i} style={{height: 92, borderRadius: 10, border: `5px solid ${C.ink}`, background: i < k ? (i % 3 ? '#fff' : '#EDE6FB') : 'transparent', opacity: i < k ? 1 : 0.15, padding: 8, display: 'flex', flexDirection: 'column', gap: 6}}>
            {[0, 1, 2].map((q) => (
              <div key={q} style={{height: 6, borderRadius: 3, background: q === 0 ? C.blue : '#CFC8DD', width: `${90 - q * 22}%`}} />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
};

/** grafico a linee: curva che scende e si appiattisce (con fasce opzionali) */
export const Curve: React.FC<{a: number; until: number; title: string; xLabel: string; yLabel: string; ref2?: boolean; bands?: {x0: number; x1: number; label: string; col: string; at: number}[]}> = ({a, until, title, xLabel, yLabel, ref2, bands = []}) => {
  const t = useT();
  const p = prog(t, a + 0.2, until, E.inOut);
  const N = 40;
  const pts = Array.from({length: N}, (_, i) => {
    const x = i / (N - 1);
    return [70 + x * 820, 80 + 380 * (1 - Math.exp(-x * 3.2)) * 0.95] as [number, number];
  });
  const n = Math.max(2, Math.floor(p * N));
  return (
    <div style={{position: 'absolute', left: 60, right: 60, top: 330, height: 760, transform: `scale(${enter(t, a)})`, ...cardStyle('#fff', 12)}}>
      <div style={{fontFamily: FONT, fontWeight: 900, fontSize: 46, color: C.ink, padding: '22px 30px'}}>{title}</div>
      <svg width={960} height={600} style={{position: 'absolute', left: 0, top: 110}}>
        {bands.map((b, i) => {
          const q = prog(t, b.at - 0.1, b.at + 0.3, E.back);
          return (
            <g key={i} opacity={q}>
              <rect x={70 + b.x0 * 820} y={40} width={(b.x1 - b.x0) * 820} height={440} fill={b.col} opacity={0.22} />
              <text x={70 + ((b.x0 + b.x1) / 2) * 820} y={30 + i * 0} textAnchor="middle" fontFamily="Inter" fontWeight={900} fontSize={30} fill={C.ink}>{b.label}</text>
            </g>
          );
        })}
        <line x1={70} y1={480} x2={900} y2={480} stroke={C.ink} strokeWidth={6} />
        <line x1={70} y1={40} x2={70} y2={480} stroke={C.ink} strokeWidth={6} />
        {ref2 && <line x1={70} y1={90} x2={70 + 820 * p} y2={110} stroke="#B7B2C2" strokeWidth={12} strokeLinecap="round" strokeDasharray="4 22" />}
        <polyline points={pts.slice(0, n).map((q) => q.join(',')).join(' ')} stroke={C.blue} strokeWidth={14} fill="none" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx={pts[n - 1][0]} cy={pts[n - 1][1]} r={18} fill="#fff" stroke={C.ink} strokeWidth={6} />
        <text x={480} y={540} textAnchor="middle" fontFamily="Inter" fontWeight={900} fontSize={32} fill={C.ink}>{xLabel}</text>
        <text x={40} y={260} textAnchor="middle" fontFamily="Inter" fontWeight={900} fontSize={32} fill={C.ink} transform="rotate(-90 40 260)">{yLabel}</text>
      </svg>
    </div>
  );
};

/** numero grande che conta */
export const BigNum: React.FC<{a: number; from?: number; to: number; dur?: number; top?: number; label: string; col?: string; fmt?: (n: number) => string; strike?: number}> = ({a, from = 0, to, dur = 1.0, top = 420, label, col = C.blue, fmt = (n) => String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, '.'), strike}) => {
  const t = useT();
  const p = prog(t, a, a + dur, E.out);
  const s = strike ? prog(t, strike, strike + 0.3, E.back) : 0;
  return (
    <div style={{position: 'absolute', left: 0, right: 0, top, display: 'flex', flexDirection: 'column', alignItems: 'center', transform: `scale(${enter(t, a)})`}}>
      <div style={{position: 'relative', ...cardStyle('#fff', 12), padding: '10px 50px', fontFamily: FONT, fontWeight: 900, fontSize: 190, color: col, letterSpacing: -6, lineHeight: 1.05}}>
        {fmt(mix(from, to, p))}
        {strike && <div style={{position: 'absolute', left: 20, right: 20, top: '52%', height: 22, background: C.red, border: `5px solid ${C.ink}`, borderRadius: 11, transform: `scaleX(${s}) rotate(-8deg)`}} />}
      </div>
      <div style={{marginTop: 24, ...cardStyle(C.ink, 6), padding: '8px 28px', fontFamily: FONT, fontWeight: 900, fontSize: 44, color: '#fff'}}>{label}</div>
    </div>
  );
};

/** calendario a settimana con giorni evidenziati */
export const Week: React.FC<{a: number; on: number[]; title: string; top?: number}> = ({a, on, title, top = 420}) => {
  const t = useT();
  const D = ['L', 'M', 'M', 'G', 'V', 'S', 'D'];
  return (
    <div style={{position: 'absolute', left: 60, right: 60, top, transform: `scale(${enter(t, a)})`, ...cardStyle('#fff', 12), padding: '24px 26px 34px'}}>
      <div style={{fontFamily: FONT, fontWeight: 900, fontSize: 50, color: C.ink, marginBottom: 22}}>{title}</div>
      <div style={{display: 'flex', gap: 14}}>
        {D.map((d, i) => {
          const k = on.indexOf(i);
          const p = k >= 0 ? prog(t, a + 0.5 + k * 0.35, a + 0.8 + k * 0.35, E.back) : 0;
          return (
            <div key={i} style={{flex: 1, height: 170, borderRadius: 18, border: `${OUT}px solid ${C.ink}`, background: p > 0.5 ? C.blue : '#fff', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', fontFamily: FONT, fontWeight: 900, color: p > 0.5 ? '#fff' : C.ink}}>
              <div style={{fontSize: 44}}>{d}</div>
              <div style={{fontSize: 52, transform: `scale(${p})`}}>✓</div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

/** due card affiancate (es. 8,5 h vs 5,5 h) */
export const Duo2: React.FC<{a: number; items: {big: string; small: string; col: string; at: number; icon?: string}[]; top?: number}> = ({a, items, top = 470}) => {
  const t = useT();
  return (
    <div style={{position: 'absolute', left: 0, right: 0, top, display: 'flex', justifyContent: 'center', gap: 40}}>
      {items.map((c, i) => (
        <div key={i} style={{width: 440, transform: `scale(${prog(t, c.at - 0.1, c.at + 0.25, E.back)})`, ...cardStyle('#fff', 10), overflow: 'hidden', textAlign: 'center', fontFamily: FONT, fontWeight: 900}}>
          <div style={{background: c.col, color: '#fff', fontSize: 40, padding: '10px 0'}}>{c.small}</div>
          {c.icon && <div style={{fontSize: 110, marginTop: 20}}>{c.icon}</div>}
          <div style={{fontSize: c.big.length > 5 ? 84 : 120, color: C.ink, padding: '10px 0 26px', letterSpacing: -3}}>{c.big}</div>
        </div>
      ))}
    </div>
  );
};

/** cartello "nota medica" */
export const MedNote: React.FC<{a: number; lines: string[]}> = ({a, lines}) => {
  const t = useT();
  return (
    <div style={{position: 'absolute', left: 70, right: 70, top: 380, transform: `scale(${enter(t, a)}) rotate(-1.5deg)`, ...cardStyle('#fff', 12), border: `${OUT + 4}px solid ${C.red}`, padding: '30px 36px 40px'}}>
      <div style={{display: 'flex', alignItems: 'center', gap: 24}}>
        <div style={{width: 120, height: 120, borderRadius: 30, background: C.red, border: `${OUT}px solid ${C.ink}`, color: '#fff', fontFamily: FONT, fontWeight: 900, fontSize: 96, display: 'flex', alignItems: 'center', justifyContent: 'center'}}>+</div>
        <div style={{fontFamily: FONT, fontWeight: 900, fontSize: 64, color: C.red, lineHeight: 1}}>PRIMA<br />IL MEDICO</div>
      </div>
      <div style={{marginTop: 26, display: 'flex', flexDirection: 'column', gap: 14}}>
        {lines.map((l, i) => (
          <div key={i} style={{fontFamily: FONT, fontWeight: 900, fontSize: 46, color: C.ink, opacity: prog(t, a + 0.4 + i * 0.4, a + 0.7 + i * 0.4)}}>• {l}</div>
        ))}
      </div>
    </div>
  );
};

/** orologio */
export const Clock: React.FC<{a: number; hour: number; top?: number; label: string}> = ({a, hour, top = 380, label}) => {
  const t = useT();
  const sp = prog(t, a, a + 1.2, E.inOut);
  const h = mix(hour - 4, hour, sp);
  const ah = ((h % 12) / 12) * 360;
  const am = ((h % 1) * 360 + sp * 1440) % 360;
  return (
    <div style={{position: 'absolute', left: 0, right: 0, top, display: 'flex', flexDirection: 'column', alignItems: 'center', transform: `scale(${enter(t, a)})`}}>
      <svg width={420} height={420} viewBox="-210 -210 420 420">
        <circle r={190} fill="#fff" stroke={C.ink} strokeWidth={OUT + 4} />
        {Array.from({length: 12}).map((_, i) => (
          <line key={i} x1={0} y1={-170} x2={0} y2={-150} stroke={C.ink} strokeWidth={8} transform={`rotate(${i * 30})`} />
        ))}
        <line x1={0} y1={0} x2={0} y2={-95} stroke={C.ink} strokeWidth={16} strokeLinecap="round" transform={`rotate(${ah})`} />
        <line x1={0} y1={0} x2={0} y2={-140} stroke={C.blue} strokeWidth={10} strokeLinecap="round" transform={`rotate(${am})`} />
        <circle r={16} fill={C.ink} />
      </svg>
      <div style={{marginTop: 10, ...cardStyle(C.ink, 6), padding: '6px 26px', fontFamily: FONT, fontWeight: 900, fontSize: 54, color: '#fff'}}>{label}</div>
    </div>
  );
};

/** ragazza in palestra (camera lenta) */
export const Gym: React.FC<{a: number; b: number; girl?: Partial<React.ComponentProps<typeof GirlSide>>; mode?: 'stand' | 'squat' | 'hinge' | 'hurt'; children?: React.ReactNode; cx?: number}> = ({a, b, girl = {}, mode = 'stand', children, cx = 470}) => {
  const t = useT();
  const sq = mode === 'squat' ? repH(t, a, 2.0, 0.03, 0.85) : 0;
  const h = mode === 'hinge' ? repH(t, a, 2.6, 0.04, 0.8) : 0.02;
  return (
    <AbsoluteFill>
      <World cam={{z: mix(1.15, 1.23, prog(t, a, b, E.lin)), cx, cy: 1060}}>
        <GirlSide x={430} y={FLOOR} sq={sq} bar={mode === 'squat'} h={h} noDb={mode !== 'hinge'} backHand={mode === 'hurt' ? 1 : 0} hurt={mode === 'hurt' ? 0.6 : 0} smile={mode === 'hurt' ? -0.2 : 0.5} sway={Math.sin(t * 4)} {...girl} />
      </World>
      {children}
    </AbsoluteFill>
  );
};

/* ------------------------------------------------------------------ I-1 · muscolo */
const mk = (timing: unknown, k: string) => makeTiming(timing as VT[], slots(k));
const TM = mk(tM, 'm');
const ERm = eM as number[];
const SCm: Record<string, SceneFC> = {
  m01: ({a, b}) => (
    <Gym a={a} b={b}>
      <Burst t0={a + 0.2} x={830} y={760} text="30+" color={C.blue} size={90} rot={8} hold={30} />
    </Gym>
  ),
  m02: ({a}) => (
    <Paper>
      <RikyAt env={ERm} circle arm="shrug" brow={10} />
      <BigSign t0={a + 0.05} top={300} size={74}>
        E QUASI NESSUNO<br />
        <span style={{color: C.red}}>SE NE ACCORGE</span>
      </BigSign>
    </Paper>
  ),
  m03: ({a, b}) => (
    <Gym a={a} b={b} girl={{quads: 1, glute: 0.8, brace: 0.6}}>
      <BigSign t0={a + 0.05} top={300} size={110} bg={C.blue}>
        IL MUSCOLO
      </BigSign>
    </Gym>
  ),
  m04: ({a}) => (
    <Paper>
      <Bars a={a} title="MUSCOLO SENZA ALLENAMENTO" max={1} bars={[{label: '30 ANNI', v: 1, val: '100%'}, {label: '40', v: 0.93, val: ''}, {label: '50', v: 0.86, val: ''}, {label: '60', v: 0.78, val: '↓', col: C.red}]} />
    </Paper>
  ),
  m05: ({a}) => <Mirror a={a} eqAt={TM.wd('m05')[5]} labels={['SPECCHIO', 'VITA']} />,
  m06: ({a, b}) => {
    const w = TM.wd('m06');
    return (
      <Gym a={a} b={b} mode="hurt">
        <ChipList bad top={300} items={[{txt: 'Le scale pesano', at: w[0]}, {txt: 'Le borse della spesa', at: w[6]}, {txt: 'Alzarsi da terra', at: w[12]}]} />
      </Gym>
    );
  },
  m07: ({a}) => {
    const w = TM.wd('m07');
    return (
      <Paper>
        <RikyAt env={ERm} circle arm="up" />
        <BigSign t0={w[3] - 0.1} top={260} size={74}>
          IL MUSCOLO RISPONDE<br />
          <span style={{color: C.blue}}>A OGNI ETÀ</span>
        </BigSign>
        <Sparkles t0={w[3]} x={540} y={400} n={12} />
      </Paper>
    );
  },
  m08: ({a}) => (
    <Paper>
      <Week a={a} on={[1, 4]} title="OMS · FORZA ALMENO 2 GIORNI A SETTIMANA" top={420} />
      <Tag t0={TM.wd('m08')[8]} at={[540, 1000]} text="2× A SETTIMANA" bg={C.blue} fg="#fff" size={60} />
    </Paper>
  ),
  m09: ({a, b}) => {
    const w = TM.wd('m09');
    return (
      <Gym a={a} b={b} mode="squat" girl={{quads: 0.8}}>
        <ChipList top={240} items={[{txt: 'SQUAT', at: w[3]}, {txt: 'SPINTE', at: w[4]}, {txt: 'TIRATE', at: w[6]}]} left={480} />
      </Gym>
    );
  },
  m10: ({a}) => (
    <Paper>
      <RiseChart a={a} until={TM.en('m10')} title="CARICO: UN POCO ALLA VOLTA" />
    </Paper>
  ),
  m11: ({a}) => (
    <Paper>
      <StepCard n="✓" title="Misuriamo i progressi" t0={a + 0.05} sub="forza e carichi a ogni controllo" />
      <LogTable a={a} showAt={a + 0.3} beatAt={TM.wd('m11')[6]} />
    </Paper>
  ),
  m12: ({a, b}) => (
    <Gym a={a} b={b} mode="squat" girl={{quads: 1, glute: 0.8, smile: 1}}>
      <Tag t0={a + 0.2} at={[700, 420]} text="IL MUSCOLO CHE LAVORA" bg={C.blue} fg="#fff" size={44} />
      <Sparkles t0={a + 0.3} x={420} y={900} n={10} />
    </Gym>
  ),
  m13: ({a}) => <CtaScene env={ERm} a={a} wordAt={TM.wd('m13')[5]} handleAt={TM.wd('m13')[8] ?? a + 2} />,
};

/* ------------------------------------------------------------------ I-2 · schiena */
const TS = mk(tS, 's');
const ERs = eS as number[];
const SCs: Record<string, SceneFC> = {
  s01: ({a, b}) => (
    <Gym a={a} b={b} mode="hurt" girl={{lumbar: 0.8}}>
      <Burst t0={a + 0.4} x={760} y={620} text="AHI!" color={C.red} size={80} hold={30} />
    </Gym>
  ),
  s02: ({a}) => (
    <Paper>
      <RikyAt env={ERs} circle arm="wag" brow={12} />
      <BigSign t0={a + 0.05} top={300} size={80}>
        LA RICERCA<br />
        <span style={{color: C.blue}}>DICE ALTRO</span>
      </BigSign>
    </Paper>
  ),
  s03: ({a, b}) => {
    const w = TS.wd('s03');
    return (
      <Gym a={a} b={b} mode="hurt">
        <ChipList bad top={300} left={420} items={[{txt: 'DIVANO', at: w[8]}, {txt: 'NIENTE SFORZI', at: w[9]}, {txt: 'ASPETTARE', at: w[11]}]} />
      </Gym>
    );
  },
  s04: ({a}) => (
    <Paper>
      <RiseChart a={a} until={TS.en('s04')} title="FERMI DA MESI: IL DOLORE NON CALA" flat />
    </Paper>
  ),
  s05: ({a, b}) => {
    const w = TS.wd('s05');
    return (
      <Gym a={a} b={b} mode="hurt" girl={{lumbar: 1}}>
        <Tag t0={w[0]} at={[700, 380]} text="MUSCOLI PIÙ DEBOLI" bg={C.red} fg="#fff" size={44} />
        <Tag t0={w[10]} at={[700, 500]} text="PAURA DI MUOVERSI" bg={C.ink} fg="#fff" size={44} />
      </Gym>
    );
  },
  s06: ({a}) => (
    <Paper>
      <StudyGrid a={a} until={TS.en('s06')} title="REVISIONE 2021" sub="centinaia di studi raccolti" />
    </Paper>
  ),
  s07: ({a}) => (
    <Paper>
      <Curve a={a} until={TS.en('s07')} title="DOLORE NEL TEMPO" xLabel="SETTIMANE DI ESERCIZIO" yLabel="DOLORE ↓" ref2 />
      <Tag t0={TS.wd('s07')[6]} at={[540, 1150]} text="ESERCIZIO > NESSUN TRATTAMENTO" bg={C.blue} fg="#fff" size={40} />
    </Paper>
  ),
  s08: ({a}) => (
    <Paper>
      <RikyAt env={ERs} circle arm="up" />
      <BigSign t0={a + 0.05} top={300} size={80}>
        MOVIMENTO<br />
        <span style={{color: C.blue}}>GRADUALE</span>
      </BigSign>
    </Paper>
  ),
  s09: ({a, b}) => {
    const w = TS.wd('s09');
    return (
      <Gym a={a} b={b} mode="hinge" girl={{glute: 0.9, lumbarOk: 0.7, plate: 26}}>
        <ChipList top={240} left={480} items={[{txt: 'GLUTEI', at: w[2]}, {txt: 'SCHIENA', at: w[3]}, {txt: 'ADDOME', at: w[5]}]} />
        <Tag t0={w[7]} at={[540, 1500]} text="CARICHI BASSI ALL'INIZIO" bg={C.blue} fg="#fff" size={42} />
      </Gym>
    );
  },
  s10: ({a}) => (
    <Paper>
      <Bars a={a} title="SI AUMENTA QUANDO IL CORPO RISPONDE" bars={[{label: 'SETT. 1', v: 0.35}, {label: 'SETT. 3', v: 0.5}, {label: 'SETT. 6', v: 0.68}, {label: 'SETT. 9', v: 0.85, val: '↑'}]} />
    </Paper>
  ),
  s11: ({a}) => {
    const w = TS.wd('s11');
    return <MedNote a={a} lines={['dolore forte', 'improvviso', 'che scende lungo la gamba'].slice(0, w.length ? 3 : 3)} />;
  },
  s12: ({a}) => {
    const w = TS.wd('s12');
    return <TrustChips env={ERs} a={a} title={['NEI MIEI PROGRAMMI', 'SEDUTA DOPO SEDUTA']} chips={[{txt: 'Esercizi scelti per te', at: w[4]}, {txt: 'Varianti pronte', at: w[6]}, {txt: 'Progressione graduale', at: w[8]}]} />;
  },
  s13: ({a}) => <CtaScene env={ERs} a={a} wordAt={TS.wd('s13')[6]} handleAt={TS.wd('s13')[8] ?? a + 2} />,
};

/* ------------------------------------------------------------------ I-3 · sonno */
const TD = mk(tD, 'd');
const ERd = eD as number[];
const TwoGirls: React.FC<{a: number; b: number; good?: number; children?: React.ReactNode}> = ({a, b, good = 0, children}) => {
  const t = useT();
  return (
    <AbsoluteFill>
      <World cam={{z: mix(1.22, 1.28, prog(t, a, b, E.lin)), cx: 540, cy: 1110}}>
        <GirlSide x={290} y={FLOOR} scale={0.72} noDb smile={0.4 + good * 0.6} brace={good} sway={Math.sin(t * 4)} />
        <GirlSide x={790} y={FLOOR} scale={0.72} noDb smile={0.4 - good * 0.6} lid={good * 0.5} sway={Math.sin(t * 4 + 1)} />
      </World>
      {children}
    </AbsoluteFill>
  );
};
const SCd: Record<string, SceneFC> = {
  d01: ({a, b}) => {
    const w = TD.wd('d01');
    return (
      <TwoGirls a={a} b={b} good={prog(useT(), w[6], w[9])}>
        <Tag t0={a + 0.1} at={[290, 600]} text="STESSA DIETA" bg="#fff" size={40} />
        <Tag t0={w[2]} at={[790, 600]} text="STESSE CALORIE" bg="#fff" size={40} />
        <Tag t0={w[8]} at={[790, 1250]} text="MENO GRASSO PERSO" bg={C.red} fg="#fff" size={36} />
      </TwoGirls>
    );
  },
  d02: ({a}) => (
    <Paper>
      <RikyAt env={ERd} circle arm="shrug" brow={12} />
      <Burst t0={a + 0.1} x={540} y={420} text="PERCHÉ?" color={C.blue} size={84} hold={30} />
    </Paper>
  ),
  d03: ({a}) => {
    const w = TD.wd('d03');
    return (
      <Paper>
        <Clock a={a} hour={1} label="01:00" top={280} />
        <ChipList top={900} items={[{txt: 'Lavoro', at: w[0]}, {txt: 'Figli', at: w[1]}, {txt: 'Telefono fino a tardi', at: w[2]}]} bad />
      </Paper>
    );
  },
  d04: ({a, b}) => (
    <Gym a={a} b={b} girl={{lid: 0.6, smile: -0.3}}>
      <Tag t0={a + 0.1} at={[700, 300]} text="SOLO STANCHEZZA?" bg={C.ink} fg="#fff" size={50} />
    </Gym>
  ),
  d05: ({a}) => {
    const w = TD.wd('d05');
    return (
      <Paper>
        <StepCard n="1" title="Lo studio" t0={a + 0.05} sub="persone a dieta, stesse calorie" />
        <Duo2 a={a} items={[{big: '8,5 h', small: 'PRIMA', col: C.blue, at: w[8]}, {big: '5,5 h', small: 'POI', col: C.red, at: w[13]}]} />
      </Paper>
    );
  },
  d06: ({a}) => (
    <Paper>
      <Duo2 a={a} top={520} items={[{big: '2', small: 'SETTIMANE · 8,5 h', col: C.blue, at: a + 0.1}, {big: '2', small: 'SETTIMANE · 5,5 h', col: C.red, at: a + 0.4}]} />
    </Paper>
  ),
  d07: ({a}) => {
    const w = TD.wd('d07');
    return (
      <Paper>
        <Bars a={a} title="GRASSO PERSO" bars={[{label: '8,5 h', v: 1, val: '100%', at: a + 0.3}, {label: '5,5 h', v: 0.45, val: '−55%', col: C.red, at: w[5]}]} />
      </Paper>
    );
  },
  d08: ({a}) => {
    const w = TD.wd('d08');
    return (
      <Paper>
        <RikyAt env={ERd} circle arm="point" brow={10} />
        <Tag t0={w[4]} at={[540, 360]} text="PIÙ MUSCOLO PERSO" bg={C.red} fg="#fff" size={56} />
        <Tag t0={w[11]} at={[540, 520]} text="PIÙ FAME" bg={C.ink} fg="#fff" size={56} />
      </Paper>
    );
  },
  d09: ({a}) => (
    <Paper>
      <RikyAt env={ERd} circle arm="up" />
      <BigSign t0={a + 0.05} top={300} size={78}>
        NON SERVE<br />
        <span style={{color: C.blue}}>ESSERE PERFETTI</span>
      </BigSign>
    </Paper>
  ),
  d10: ({a}) => {
    const w = TD.wd('d10');
    return (
      <Paper>
        <ChipList top={360} items={[{txt: 'Orario fisso a letto', at: w[0]}, {txt: "Schermi giù mezz'ora prima", at: w[6]}, {txt: 'Allenamenti non troppo tardi', at: w[12]}]} />
      </Paper>
    );
  },
  d11: ({a}) => {
    const w = TD.wd('d11');
    return <TrustChips env={ERd} a={a} title={['IMPOSTO IL PERCORSO', 'SU TUTTA LA GIORNATA']} chips={[{txt: 'Sonno', at: w[6]}, {txt: 'Passi', at: w[8]}, {txt: 'Allenamento', at: w[10]}]} />;
  },
  d12: ({a, b}) => (
    <Gym a={a} b={b} mode="squat" girl={{smile: 1, quads: 0.6}}>
      <BigSign t0={a + 0.1} top={300} size={64}>
        ANCHE FUORI<br />
        <span style={{color: C.blue}}>DALLA PALESTRA</span>
      </BigSign>
    </Gym>
  ),
  d13: ({a}) => <CtaScene env={ERd} a={a} wordAt={TD.wd('d13')[11] ?? a + 2} handleAt={TD.wd('d13')[13] ?? a + 3} />,
};

/* ------------------------------------------------------------------ I-4 · passi */
const TP = mk(tP, 'p');
const ERp = eP as number[];
const SCp: Record<string, SceneFC> = {
  p01: ({a}) => (
    <Paper>
      <BigNum a={a} to={10000} label="PASSI AL GIORNO" top={620} />
      <Burst t0={TP.wd('p01')[4]} x={880} y={600} text="?" color={C.blue} size={110} hold={30} />
    </Paper>
  ),
  p02: ({a}) => (
    <Paper>
      <RikyAt env={ERp} circle arm="wag" brow={12} />
      <BigSign t0={a + 0.05} top={300} size={74}>
        NON DALLA<br />
        <span style={{color: C.red}}>RICERCA</span>
      </BigSign>
    </Paper>
  ),
  p03: ({a}) => {
    const w = TP.wd('p03');
    return (
      <Paper>
        <Duo2 a={a} top={420} items={[{big: "anni '60", small: 'GIAPPONE', col: C.ink, at: a + 0.1}, {big: 'PUBBLICITÀ', small: 'ORIGINE', col: C.red, at: w[10] ?? a + 2}]} />
      </Paper>
    );
  },
  p04: ({a, b}) => (
    <Gym a={a} b={b} girl={{smile: -0.4}}>
      <BigNum a={a} to={6000} dur={0.7} label="NON SERVE A NIENTE?" top={260} col={C.ink} />
    </Gym>
  ),
  p05: ({a}) => (
    <Paper>
      <StudyGrid a={a} until={TP.en('p05')} title="≈ 47.000 ADULTI" sub="analisi pubblicata nel 2022" />
    </Paper>
  ),
  p06: ({a}) => (
    <Paper>
      <RikyAt env={ERp} circle arm="up" />
      <BigSign t0={a + 0.05} top={300} size={84} bg={C.blue}>
        OGNI PASSO CONTA
      </BigSign>
      <Sparkles t0={a + 0.2} x={540} y={400} n={12} />
    </Paper>
  ),
  p07: ({a}) => (
    <Paper>
      <Curve a={a} until={TP.en('p07')} title="RISCHIO DI MORTALITÀ" xLabel="PASSI AL GIORNO →" yLabel="RISCHIO ↓" />
    </Paper>
  ),
  p08: ({a}) => {
    const w = TP.wd('p08');
    return (
      <Paper>
        <Curve
          a={a - 3}
          until={a}
          title="DOVE SI STABILIZZA"
          xLabel="PASSI AL GIORNO →"
          yLabel="RISCHIO ↓"
          bands={[
            {x0: 0.45, x1: 0.62, label: 'OVER 60: 6–8 MILA', col: C.blue, at: w[3]},
            {x0: 0.62, x1: 0.8, label: 'UNDER 60: 8–10 MILA', col: '#2F6F73', at: w[w.length - 5] ?? a + 2},
          ]}
        />
      </Paper>
    );
  },
  p09: ({a}) => {
    const w = TP.wd('p09');
    return (
      <Paper>
        <BigNum a={a} to={3000} dur={0.6} label="OGGI" top={260} col={C.ink} />
        <BigNum a={w[6] ?? a + 1.5} from={3000} to={10000} dur={0.5} label="SUBITO? NO" top={820} col={C.red} strike={(w[7] ?? a + 2) + 0.2} />
      </Paper>
    );
  },
  p10: ({a}) => (
    <Paper>
      <Bars a={a} title="+1.000 PASSI A SETTIMANA" max={7000} bars={[{label: 'SETT. 1', v: 3000, val: '3.000'}, {label: 'SETT. 2', v: 4000, val: '4.000'}, {label: 'SETT. 3', v: 5000, val: '5.000'}, {label: 'SETT. 4', v: 6000, val: '6.000'}]} />
    </Paper>
  ),
  p11: ({a, b}) => {
    const w = TP.wd('p11');
    return (
      <Gym a={a} b={b} girl={{smile: 0.9}}>
        <ChipList top={240} left={420} items={[{txt: 'Dopo pranzo', at: w[0]}, {txt: 'Scale, non ascensore', at: w[3]}, {txt: 'Telefonate camminando', at: w[7]}]} />
      </Gym>
    );
  },
  p12: ({a}) => {
    const w = TP.wd('p12');
    return <TrustChips env={ERp} a={a} title={['NEI MIEI PERCORSI', 'PASSI + FORZA']} chips={[{txt: 'Obiettivo passi che sale', at: w[5]}, {txt: 'Allenamento di forza', at: w[13] ?? a + 2}, {txt: 'Controlli regolari', at: (w[13] ?? a + 2) + 0.8}]} />;
  },
  p13: ({a}) => <CtaScene env={ERp} a={a} wordAt={TP.wd('p13')[13] ?? a + 2} handleAt={TP.wd('p13')[15] ?? a + 3} />,
};

/* ------------------------------------------------------------------ sottotitoli */
const NUM: Record<string, string> = {
  duemilaventuno: '2021', duemilaventidue: '2022', cinquantacinque: '55', quarantasettemila: '47.000', seimila: '6.000', ottomila: '8.000', diecimila: '10.000', tremila: '3.000', mille: '1.000', sessanta: '60', cinque: '5', otto: '8', due: '2', trent: '30', analisi: 'ANALISI',
};
const disp = (text: string) =>
  text
    .split(' ')
    .map((w) => {
      const m = w.match(/^([^,.?!:]+)([,.?!:]*)$/);
      if (!m) return w;
      const k = m[1].toLowerCase();
      return NUM[k] ? NUM[k] + m[2] : w;
    })
    .join(' ');
const KEYS = /^(muscolo|forza|età|due|settimana|squat|spinte|tirate|carico|controllo|specchio|scale|schiena|ricerca|fermi|deboli|paura|esercizio|graduale|glutei|addome|medico|seduta|dieta|calorie|grasso|cinque|sonno|muscolo|fame|perfetti|palestra|passi|diecimila|seimila|ottomila|tremila|mille|conta|analisi|giornata|mortalità|ogni)$/i;
const autoCaps = (T: ReturnType<typeof makeTiming>, SL: string[], firstColor = C.blue) => {
  const meta: Record<string, number[]> = {};
  const display: Record<string, string> = {};
  SL.forEach((s) => {
    const words = T.v(s).text.split(' ');
    meta[s] = words.map((w, i) => (KEYS.test(w.replace(/[^\p{L}]/gu, '')) ? i : -1)).filter((i) => i >= 0);
    display[s] = disp(T.v(s).text);
  });
  const first = SL[0];
  const big = [{slot: first, hl: meta[first], color: firstColor, size: 84, y: 120, until: SL[1]}];
  delete meta[first];
  return buildCaps(T, big, meta, display);
};

const mkVideo = (T: ReturnType<typeof makeTiming>, k: string, sc: Record<string, SceneFC>, audio: string) => {
  const SL = slots(k);
  const caps = autoCaps(T, SL);
  const V: React.FC = () => <ReelShell T={T} SL={SL} scenes={sc} caps={caps} audio={audio} />;
  return V;
};

export const InfoMuscolo = mkVideo(TM, 'm', SCm, 'soundtrack_info_m.wav');
export const InfoSchiena = mkVideo(TS, 's', SCs, 'soundtrack_info_s.wav');
export const InfoSonno = mkVideo(TD, 'd', SCd, 'soundtrack_info_d.wav');
export const InfoPassi = mkVideo(TP, 'p', SCp, 'soundtrack_info_p.wav');
export const DUR_INFO = {m: TM.DURATION, s: TS.DURATION, d: TD.DURATION, p: TP.DURATION};
export {Headline};
