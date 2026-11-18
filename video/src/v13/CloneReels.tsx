/** Reel del Mese 2 con il clone HeyGen di Riccardo: scene animate nello stile delle 4 settimane,
 *  clone in riquadro in basso a sinistra, sottotitoli a destra, transizioni con effetti sonori. */
import React from 'react';
import {AbsoluteFill, Audio, OffthreadVideo, staticFile, useCurrentFrame} from 'remotion';
import {C, E, FONT, OUT, mix, prog, useT} from '../brand';
import {cardStyle, Grain, Show} from '../ui';
import {Transitions, Tr} from '../Transitions';
import {ik2, Pt} from './Girl';
import {Tag, StepCard, Burst, Sparkles, KeywordCTA, Handle} from './kit';
import {Paper, BigSign, RiseChart, LogTable} from './common';
import {ChipList, BigNum, Week, Duo2, Clock, Gym} from './Info';
import c1 from '../clone/c1_schiena.json';
import c2 from '../clone/c2_hip_thrust.json';
import c3 from '../clone/c3_impiegato.json';
import c4 from '../clone/c4_pancia.json';
import c6 from '../clone/c6_cinque_anni.json';
import q1 from '../clone/c1_schiena_cues.json';
import q2 from '../clone/c2_hip_thrust_cues.json';
import q3 from '../clone/c3_impiegato_cues.json';
import q4 from '../clone/c4_pancia_cues.json';
import q6 from '../clone/c6_cinque_anni_cues.json';

type W3 = [number, number, string];
type Data = {dur: number; segs: {t0: number; t1: number; text: string; words: W3[]}[]};
type Cue = {t: number; k: string};
type Sc = React.FC<{a: number; b: number}>;
const norm = (w: string) => w.toLowerCase().replace(/[^a-zàèéìòù0-9]/g, '');

/** parole corrette (errori di trascrizione) e unione di "l" + "'età" */
const FIX: Record<string, string> = {spalli: 'spalle', Li: 'Lì', welfare: ''};
type Seq = [string[], string[]];
const wordsOf = (d: Data, seq: Seq[] = []) => {
  let out: W3[] = [];
  d.segs.forEach((s) =>
    s.words.forEach(([a, b, w]) => {
      const x = FIX[w] ?? w;
      if (x === '') return;
      if (x.startsWith("'") && out.length) {
        out[out.length - 1] = [out[out.length - 1][0], b, out[out.length - 1][2] + x];
        return;
      }
      out.push([a, b, x]);
    }),
  );
  seq.forEach(([from, to]) => {
    for (let i = 0; i + from.length <= out.length; i++) {
      if (from.every((f, j) => out[i + j][2].toLowerCase().replace(/[,.?!]$/, '') === f.toLowerCase())) {
        const t0 = out[i][0];
        const t1 = out[i + from.length - 1][1];
        const punct = (out[i + from.length - 1][2].match(/[,.?!]$/) ?? [''])[0];
        const rep: W3[] = to.map((w, j) => [t0 + ((t1 - t0) * j) / to.length, t0 + ((t1 - t0) * (j + 1)) / to.length, w + (j === to.length - 1 ? punct : '')]);
        out = [...out.slice(0, i), ...rep, ...out.slice(i + from.length)];
      }
    }
  });
  return out;
};
/** tempo d'inizio della frase (prima occorrenza dopo `after`) */
const finder = (W: W3[]) => (phrase: string, after = 0) => {
  const p = phrase.split(' ').map(norm);
  for (let i = 0; i < W.length; i++) {
    if (W[i][0] < after) continue;
    if (p.every((x, j) => W[i + j] && norm(W[i + j][2]).startsWith(x))) return W[i][0];
  }
  return after;
};

/* ------------------------------------------------------------------ riquadro del clone */
const PIP = {x: 44, y: 1360, w: 320, h: 400};
const CROP = {x: 230, y: 860, w: 620, h: 775};
const Pip: React.FC<{src: string; W: W3[]; ctaAt: number}> = ({src, W, ctaAt}) => {
  const t = useT();
  const f = useCurrentFrame();
  const inn = prog(t, 0.05, 0.55, E.back);
  const cta = prog(t, ctaAt, ctaAt + 0.6, E.backSoft);
  const k = PIP.w / CROP.w;
  const talk = W.some(([a, b]) => t >= a - 0.05 && t <= b + 0.12);
  return (
    <div style={{position: 'absolute', left: PIP.x, top: PIP.y, width: PIP.w, height: PIP.h, transform: `scale(${mix(0.4, 1, inn) * mix(1, 1.08, cta)})`, transformOrigin: '0% 100%', opacity: Math.min(1, inn * 1.5)}}>
      <div style={{position: 'absolute', inset: -10, borderRadius: 38, background: C.blue, opacity: talk ? 0.35 + 0.15 * Math.sin(f * 0.6) : 0.12, filter: 'blur(10px)'}} />
      <div style={{position: 'absolute', inset: 0, borderRadius: 30, overflow: 'hidden', border: `6px solid ${C.blue}`, background: '#ddd', boxShadow: '0 18px 40px rgba(0,0,0,.45)'}}>
        <OffthreadVideo src={staticFile(src)} muted style={{position: 'absolute', width: 1080 * k, height: 1920 * k, left: -CROP.x * k, top: -CROP.y * k, maxWidth: 'none'}} />
      </div>
      <div style={{position: 'absolute', left: 18, top: -30, padding: '8px 18px', borderRadius: 14, background: C.ink, color: '#fff', fontFamily: FONT, fontWeight: 900, fontSize: 26, letterSpacing: 1, opacity: prog(t, 0.4, 0.7)}}>COACH RIKY</div>
      <div style={{position: 'absolute', right: 16, bottom: 16, display: 'flex', gap: 5, alignItems: 'flex-end', height: 34, padding: '6px 9px', borderRadius: 12, background: 'rgba(17,17,17,.7)'}}>
        {[0, 1, 2, 3].map((i) => (
          <div key={i} style={{width: 6, borderRadius: 3, background: '#fff', height: talk ? 8 + 16 * Math.abs(Math.sin(f * 0.45 + i * 1.3)) : 6}} />
        ))}
      </div>
    </div>
  );
};

/* ------------------------------------------------------------------ sottotitoli a destra del riquadro */
const KEY = /^(schiena|età|corpo|mattino|sedute|settimana|carichi|giornata|programma|studio|online|glutei|gluteo|errore|bacino|costole|mento|piedi|tibia|fretta|leve|varianti|caso|programma|voglia|riserva|scelte|rigidità|addominali|grasso|strategia|crunch|deficit|forza|proteine|passi|piano|controllo|forma|scenario|tempo|agenda|ANALISI)/i;
const chunk = (W: W3[], end: number) => {
  const out: {t0: number; t1: number; w: W3[]}[] = [];
  let cur: W3[] = [];
  W.forEach((w, i) => {
    cur.push(w);
    const nx = W[i + 1];
    const stop = /[.?!]$/.test(w[2]) || (/,$/.test(w[2]) && cur.length >= 3) || cur.length >= 4 || !nx || nx[0] - w[1] > 0.35;
    if (stop) {
      out.push({t0: cur[0][0] - 0.08, t1: 0, w: cur});
      cur = [];
    }
  });
  out.forEach((c, i) => (c.t1 = out[i + 1] ? out[i + 1].t0 - 0.02 : end - 0.1));
  return out;
};
const Subs: React.FC<{W: W3[]; end: number}> = ({W, end}) => {
  const t = useT();
  const CH = React.useMemo(() => chunk(W, end), [W, end]);
  const c = CH.find((x) => t >= x.t0 && t < x.t1);
  if (!c) return null;
  const p = prog(t, c.t0, c.t0 + 0.18, E.back);
  return (
    <div style={{position: 'absolute', left: PIP.x + PIP.w + 34, right: 110, top: PIP.y + 110, transform: `scale(${mix(0.85, 1, p)})`, transformOrigin: 'left center', opacity: Math.min(1, p * 2)}}>
      <div style={{fontFamily: FONT, fontWeight: 900, fontSize: 54, lineHeight: 1.12, color: '#fff', textShadow: '0 4px 0 rgba(0,0,0,.5)', letterSpacing: -0.5}}>
        {c.w.map(([a, , w], i) => {
          const on = t >= a - 0.03;
          const key = KEY.test(w);
          return (
            <span key={i} style={{display: 'inline-block', marginRight: 14, opacity: on ? 1 : 0.35, background: on && key ? C.blue : 'transparent', borderRadius: 10, padding: key ? '0 8px' : 0, transform: `translateY(${on ? 0 : 6}px)`}}>
              {w.replace(/[,.]$/, '')}
            </span>
          );
        })}
      </div>
    </div>
  );
};
const Shade: React.FC = () => <div style={{position: 'absolute', left: 0, right: 0, top: 1290, bottom: 0, background: 'linear-gradient(180deg, rgba(17,17,17,0) 0%, rgba(17,17,17,.6) 30%, rgba(17,17,17,.75) 100%)'}} />;

const TT: Tr['type'][] = ['wipeR', 'iris', 'wipeL', 'stripes', 'wipeU', 'iris', 'wipeR', 'wipeL', 'stripes'];
const TCOL = [C.blue, C.ink, C.red, C.ink, C.blue, C.ink, C.blue, C.ink, C.blue];

const CloneShell: React.FC<{data: Data; cues: Cue[]; scenes: Sc[]; src: string; audio: string; W: W3[]}> = ({data, cues, scenes, src, audio, W}) => {
  const END = data.dur;
  const trans: Tr[] = cues.slice(1).map((c, i) => ({t: c.t, type: TT[i % TT.length], color: TCOL[i % TCOL.length]}));
  return (
    <AbsoluteFill style={{background: '#F6F0E6', fontFamily: FONT}}>
      <style>{`
        @font-face{font-family:'Inter';font-weight:900;src:url(${staticFile('fonts/Inter-Black.otf')});}
        @font-face{font-family:'Inter';font-weight:800;src:url(${staticFile('fonts/Inter-ExtraBold.otf')});}
        @font-face{font-family:'Inter';font-weight:700;src:url(${staticFile('fonts/Inter-Bold.otf')});}
      `}</style>
      {cues.map((c, i) => {
        const S = scenes[i];
        const b = cues[i + 1]?.t ?? END + 1;
        return (
          <Show key={i} from={c.t} to={b} punch={i === 0 ? 0 : 0.05}>
            <S a={c.t} b={b} />
          </Show>
        );
      })}
      <Transitions list={trans} />
      <Shade />
      <Pip src={src} W={W} ctaAt={cues[cues.length - 1].t} />
      <Subs W={W} end={END} />
      <Grain />
      <Audio src={staticFile(audio)} />
    </AbsoluteFill>
  );
};

/* ------------------------------------------------------------------ elementi grafici */
/** hip thrust stilizzato: spalle sulla panca, p = altezza del bacino (0..1) */
const HipThrust: React.FC<{p: number; arch?: number; footX?: number; glute?: number; lumbar?: number; guide?: number; top?: number}> = ({p, arch = 0, footX = 770, glute = 0, lumbar = 0, guide = 0, top = 330}) => {
  const sh: Pt = [300, 720];
  const foot: Pt = [footX, 990];
  const hip: Pt = [mix(500, 545, p), mix(930, 705 - arch * 25, p)];
  const knee = ik2(hip, foot, 240, 290, 1);
  const chest: Pt = [mix(sh[0], hip[0], 0.45), mix(sh[1], hip[1], 0.45) - arch * 70 * p];
  return (
    <svg width={1080} height={1100} viewBox="0 0 1080 1100" style={{position: 'absolute', left: 0, top}}>
      {/* pavimento e panca */}
      <rect x={60} y={1000} width={960} height={16} rx={8} fill="#3A3D42" />
      <rect x={110} y={735} width={230} height={70} rx={20} fill="#2F5FA8" stroke={C.ink} strokeWidth={OUT} />
      <rect x={140} y={805} width={22} height={195} fill="#9AA0A8" stroke={C.ink} strokeWidth={OUT - 2} />
      <rect x={290} y={805} width={22} height={195} fill="#9AA0A8" stroke={C.ink} strokeWidth={OUT - 2} />
      {/* aloni */}
      <ellipse cx={hip[0]} cy={hip[1] + 20} rx={95} ry={70} fill={C.blue} opacity={0.35 * glute} />
      <ellipse cx={mix(chest[0], hip[0], 0.55)} cy={mix(chest[1], hip[1], 0.55) + 10} rx={80} ry={50} fill={C.red} opacity={0.45 * lumbar} />
      {/* gambe */}
      <polyline points={`${hip.join(',')} ${knee.join(',')} ${foot.join(',')}`} fill="none" stroke={C.ink} strokeWidth={62} strokeLinecap="round" strokeLinejoin="round" />
      <polyline points={`${hip.join(',')} ${knee.join(',')} ${foot.join(',')}`} fill="none" stroke="#1F1F26" strokeWidth={48} strokeLinecap="round" strokeLinejoin="round" />
      <path d={`M ${foot[0] - 20} ${foot[1] - 10} l 70 0 l 4 22 l -84 0 Z`} fill="#fff" stroke={C.ink} strokeWidth={OUT - 2} />
      {/* busto */}
      <path d={`M ${sh[0]} ${sh[1]} Q ${chest[0]} ${chest[1]} ${hip[0]} ${hip[1]}`} fill="none" stroke={C.ink} strokeWidth={96} strokeLinecap="round" />
      <path d={`M ${sh[0]} ${sh[1]} Q ${chest[0]} ${chest[1]} ${hip[0]} ${hip[1]}`} fill="none" stroke={C.blue} strokeWidth={82} strokeLinecap="round" />
      {/* bilanciere sul bacino */}
      <circle cx={hip[0]} cy={hip[1] - 50} r={62} fill={C.ink} />
      <circle cx={hip[0]} cy={hip[1] - 50} r={44} fill="#5B5F66" />
      <circle cx={hip[0]} cy={hip[1] - 50} r={10} fill="#ccc" />
      {/* testa */}
      <circle cx={sh[0] - 70} cy={sh[1] - 40} r={52} fill="#F8E0C9" stroke={C.ink} strokeWidth={OUT} />
      <path d={`M ${sh[0] - 120} ${sh[1] - 60} q 30 -60 100 -30 q -40 10 -50 40 z`} fill={C.ink} />
      <circle cx={sh[0] - 128} cy={sh[1] - 66} r={16} fill={C.blue} stroke={C.ink} strokeWidth={4} />
      {/* guida tibia verticale */}
      {guide > 0 && <line x1={foot[0]} y1={foot[1]} x2={foot[0]} y2={foot[1] - 330 * guide} stroke={C.blue} strokeWidth={8} strokeDasharray="16 12" />}
    </svg>
  );
};

/** busto dell'impiegato (riferimento 03) */
const Employee: React.FC<{size?: number}> = ({size = 220}) => (
  <svg width={size} height={size} viewBox="0 0 220 220">
    <circle cx={110} cy={110} r={104} fill="#EDE6FB" stroke={C.ink} strokeWidth={OUT} />
    <path d="M 30 210 Q 40 150 110 145 Q 180 150 190 210 Z" fill="#8EC3EC" stroke={C.ink} strokeWidth={OUT} />
    <path d="M 92 146 L 110 170 L 128 146" fill="#fff" stroke={C.ink} strokeWidth={4} />
    <circle cx={110} cy={92} r={44} fill="#F3D6BE" stroke={C.ink} strokeWidth={OUT} />
    <path d="M 66 86 Q 70 40 112 44 Q 156 46 154 88 Q 140 62 112 66 Q 84 66 66 86 Z" fill="#7A4E2D" stroke={C.ink} strokeWidth={4} />
    <rect x={80} y={84} width={24} height={16} rx={5} fill="none" stroke={C.ink} strokeWidth={5} />
    <rect x={116} y={84} width={24} height={16} rx={5} fill="none" stroke={C.ink} strokeWidth={5} />
    <line x1={104} y1={92} x2={116} y2={92} stroke={C.ink} strokeWidth={4} />
    <path d="M 98 116 Q 110 122 122 116" fill="none" stroke={C.ink} strokeWidth={4} strokeLinecap="round" />
  </svg>
);

const Stamp: React.FC<{t0: number; text: string; x?: number; y?: number; color?: string}> = ({t0, text, x = 540, y = 760, color = C.red}) => {
  const t = useT();
  const s = prog(t, t0, t0 + 0.3, E.back);
  if (t < t0) return null;
  return <div style={{position: 'absolute', left: x, top: y, transform: `translate(-50%,-50%) scale(${mix(2.2, 1, s)}) rotate(-10deg)`, opacity: s, border: `12px solid ${color}`, borderRadius: 24, padding: '10px 32px', background: 'rgba(255,255,255,0.95)', fontFamily: FONT, fontWeight: 900, fontSize: 72, color, whiteSpace: 'nowrap'}}>{text}</div>;
};

const Tempo: React.FC<{items: {txt: string; at: number}[]}> = ({items}) => {
  const t = useT();
  return (
    <div style={{position: 'absolute', left: 60, right: 60, top: 300, display: 'flex', justifyContent: 'center', gap: 22}}>
      {items.map((c, i) => {
        const p = prog(t, c.at - 0.1, c.at + 0.25, E.back);
        return (
          <div key={i} style={{transform: `scale(${p})`, ...cardStyle(i === 1 ? C.ink : C.blue, 8), padding: '14px 24px', fontFamily: FONT, fontWeight: 900, fontSize: 44, color: '#fff', textAlign: 'center'}}>{c.txt}</div>
        );
      })}
    </div>
  );
};

const Cta: React.FC<{a: number; word: number}> = ({word}) => (
  <Paper>
    <KeywordCTA t0={word - 0.1} word="ANALISI" />
    <Handle t0={word + 0.6} top={700} />
    <Sparkles t0={word} x={540} y={420} n={14} />
  </Paper>
);

/* ------------------------------------------------------------------ 1 · schiena dopo nove ore seduto */
const W1 = wordsOf(c1 as Data, [[['lavoro', 'in'], ['Lavori']], [['alla', 'schiena'], ['la', 'schiena']]]);
const f1 = finder(W1);
const S1: Sc[] = [
  ({a, b}) => (
    <Gym a={a} b={b} mode="hurt" girl={{lumbar: 0.8}}>
      <Burst t0={a + 0.3} x={800} y={520} text="9 ORE" color={C.ink} size={70} hold={30} />
      <BigSign t0={f1('non è l')} top={250} size={88} bg={C.blue}>NON È L'ETÀ</BigSign>
    </Gym>
  ),
  ({a, b}) => (
    <Gym a={a} b={b} mode="hurt">
      <Tag t0={f1('collo', a)} at={[740, 330]} text="COLLO RIGIDO" bg={C.red} fg="#fff" size={46} />
      <Tag t0={f1('spalle', a)} at={[740, 450]} text="SPALLE IN AVANTI" bg={C.red} fg="#fff" size={46} />
      <Tag t0={f1('è normale', a)} at={[540, 230]} text="«È NORMALE…»" bg="#fff" size={52} />
    </Gym>
  ),
  ({a}) => (
    <Paper>
      <BigSign t0={a + 0.05} top={220} size={74}>IL CORPO<br /><span style={{color: C.blue}}>SI ADATTA</span></BigSign>
      <Clock a={f1('nove ore', a)} hour={6} label="9 ORE SEDUTO" top={560} />
    </Paper>
  ),
  ({a}) => (
    <Paper>
      <Duo2 a={a} top={380} items={[{big: 'SERA', small: 'OGGI IL FASTIDIO', col: C.ink, at: a + 0.2}, {big: 'MATTINO', small: 'DOMANI?', col: C.red, at: f1('mattino', a)}]} />
      <Tag t0={f1('ogni mese', a)} at={[540, 1000]} text="RIPARTIRE COSTA DI PIÙ" bg={C.red} fg="#fff" size={48} />
    </Paper>
  ),
  ({a}) => (
    <Paper>
      <StepCard n="✓" title="La buona notizia" t0={a + 0.05} sub="non servono 2 ore al giorno" />
      <Week a={a + 0.3} on={[1, 3, 5]} title="2–3 SEDUTE A SETTIMANA" top={430} />
    </Paper>
  ),
  ({a, b}) => (
    <Gym a={a} b={b} mode="hinge" girl={{glute: 0.8, lumbarOk: 0.7, plate: 26}}>
      <ChipList top={240} left={480} items={[{txt: 'SCHIENA', at: f1('schiena', a)}, {txt: 'SPALLE', at: f1('spalle', a)}, {txt: 'GAMBE', at: f1('gambe', a)}]} />
      <Tag t0={f1('carichi', a)} at={[540, 1150]} text="CARICHI CHE SALGONO ↑" bg={C.blue} fg="#fff" size={44} />
    </Gym>
  ),
  ({a}) => (
    <Paper>
      <StepCard n="RF" title="Come lavoro" t0={a + 0.05} />
      <ChipList top={330} items={[{txt: 'Come passi la giornata', at: f1('come passi', a)}, {txt: 'Il tempo che hai davvero', at: f1('quanto tempo', a)}, {txt: 'Programma sulla tua settimana', at: f1('costruisco', a)}]} />
      <Tag t0={f1('online', a)} at={[540, 1120]} text="ONLINE O IN STUDIO" bg={C.ink} fg="#fff" size={50} />
    </Paper>
  ),
  ({a}) => <Cta a={a} word={f1('scrivimi', a)} />,
];

/* ------------------------------------------------------------------ 2 · hip thrust */
const W2 = wordsOf(c2 as Data, [[['in', 'archi'], ['inarchi']], [['pub', 'verso', "l'unbellico"], ['pube', 'verso', "l'ombelico"]], [['ai', 'quadricipiti'], ['i', 'quadricipiti']]]);
const f2 = finder(W2);
const HT: React.FC<{a: number; mode: 'bad' | 'good'; footX?: number; guide?: number; children?: React.ReactNode}> = ({a, mode, footX, guide, children}) => {
  const t = useT();
  const p = 0.5 - 0.5 * Math.cos(((t - a) / 2.2) * Math.PI * 2);
  return (
    <Paper>
      <HipThrust p={p} arch={mode === 'bad' ? 1 : 0} glute={mode === 'good' ? p : 0.15} lumbar={mode === 'bad' ? p : 0} footX={footX} guide={guide} top={150} />
      {children}
    </Paper>
  );
};
const S2: Sc[] = [
  ({a}) => (
    <HT a={a} mode="bad">
      <Tag t0={a + 0.4} at={[330, 280]} text="SCHIENA ✓" bg={C.red} fg="#fff" size={50} />
      <Tag t0={f2('quasi niente')} at={[760, 280]} text="GLUTEI ?" bg="#fff" size={50} />
    </HT>
  ),
  ({a}) => (
    <HT a={a} mode="bad">
      <Burst t0={a + 0.1} x={540} y={300} text="ERRORE!" color={C.red} size={70} hold={30} />
    </HT>
  ),
  ({a}) => (
    <HT a={a} mode="bad">
      <Tag t0={f2('inarchi', a)} at={[540, 260]} text="INARCHI LA SCHIENA" bg={C.red} fg="#fff" size={50} />
      <Tag t0={f2('costole', a)} at={[540, 380]} text="COSTOLE APERTE" bg={C.ink} fg="#fff" size={46} />
      <Tag t0={f2('gluteo resta', a)} at={[540, 500]} text="GLUTEO A METÀ" bg="#fff" size={46} />
    </HT>
  ),
  ({a}) => (
    <HT a={a} mode="good">
      <Tag t0={a + 0.1} at={[300, 260]} text="MENTO AL PETTO" bg={C.blue} fg="#fff" size={42} icon="ok" />
      <Tag t0={f2('costole giù', a)} at={[780, 260]} text="COSTOLE GIÙ" bg={C.blue} fg="#fff" size={42} icon="ok" />
      <Tag t0={f2('chiudi', a)} at={[540, 380]} text="CHIUDI IL BACINO" bg={C.blue} fg="#fff" size={46} icon="ok" />
      <Sparkles t0={f2('accende', a)} x={560} y={1050} n={12} />
    </HT>
  ),
  ({a}) => {
    const t = useT();
    const tf = f2('troppo lontani', a);
    const tv = f2('troppo vicini', a);
    const tok = f2('in alto la tibia', a);
    const fx = t < tv ? (t < tf ? 770 : 900) : t < tok ? 690 : 770;
    return (
      <HT a={a} mode="good" footX={fx} guide={prog(t, tok, tok + 0.5)}>
        <StepCard n="2" title="I piedi" t0={a + 0.05} />
        <Tag t0={tf} t1={tv} at={[540, 300]} text="TROPPO LONTANI → FEMORALI" bg={C.red} fg="#fff" size={40} />
        <Tag t0={tv} t1={tok} at={[540, 300]} text="TROPPO VICINI → QUADRICIPITI" bg={C.red} fg="#fff" size={40} />
        <Tag t0={tok} at={[540, 300]} text="TIBIA VERTICALE" bg={C.blue} fg="#fff" size={50} icon="ok" />
      </HT>
    );
  },
  ({a}) => (
    <HT a={a} mode="good">
      <StepCard n="3" title="Niente fretta" t0={a + 0.05} />
      <Tempo items={[{txt: '1" SU', at: f2('sali', a)}, {txt: '1" STOP', at: f2('fermati', a)}, {txt: '2" GIÙ', at: f2('scendi', a)}]} />
    </HT>
  ),
  ({a}) => (
    <Paper>
      <StepCard n="RF" title="Nei miei programmi" t0={a + 0.05} />
      <ChipList top={330} items={[{txt: 'Varianti su misura', at: f2('varianti', a)}, {txt: 'Carichi su come ti muovi', at: f2('carichi', a)}, {txt: 'Ogni corpo ha le sue leve', at: f2('perché ogni', a)}]} />
    </Paper>
  ),
  ({a}) => <Cta a={a} word={f2('scrivimi', a)} />,
];

/* ------------------------------------------------------------------ 3 · impiegato, caso tipo */
const W3d = wordsOf(c3 as Data, [[['ma', 'al', 'di'], ['mal', 'di']]]);
const f3 = finder(W3d);
const Profile: React.FC<{a: number}> = ({a}) => {
  const t = useT();
  const items = [
    {txt: 'IMPIEGATO', at: a + 0.1},
    {txt: '42 ANNI', at: f3('42')},
    {txt: 'MAL DI SCHIENA DA 3 ANNI', at: f3('mal')},
  ];
  return (
    <div style={{position: 'absolute', left: 60, right: 60, top: 260, ...cardStyle('#fff', 12), padding: 30, display: 'flex', gap: 30, alignItems: 'center', transform: `scale(${prog(t, a, a + 0.4, E.back)})`}}>
      <Employee size={240} />
      <div style={{display: 'flex', flexDirection: 'column', gap: 12}}>
        {items.map((c, i) => (
          <div key={i} style={{fontFamily: FONT, fontWeight: 900, fontSize: i === 2 ? 40 : 54, color: i === 2 ? C.red : C.ink, opacity: prog(t, c.at - 0.1, c.at + 0.2), lineHeight: 1.05}}>{c.txt}</div>
        ))}
      </div>
    </div>
  );
};
const S3: Sc[] = [
  ({a}) => (
    <Paper>
      <Profile a={a} />
      <Tag t0={f3('prime 4')} at={[540, 760]} text="LE PRIME 4 SETTIMANE" bg={C.blue} fg="#fff" size={54} />
    </Paper>
  ),
  ({a}) => (
    <Paper>
      <Profile a={a - 5} />
      <Stamp t0={a + 0.1} text="CASO TIPO" y={800} color={C.ink} />
      <Tag t0={f3('storia', a)} at={[540, 1050]} text="NON UN CLIENTE REALE" bg="#fff" size={42} />
    </Paper>
  ),
  ({a}) => (
    <Paper>
      <ChipList bad top={300} items={[{txt: '8 ore in ufficio', at: a + 0.1}, {txt: "1 ora di macchina", at: f3('1 ora', a)}, {txt: 'Palestra mollata 3 volte', at: f3('palestra', a)}]} />
      <BigSign t0={f3('il problema', a)} top={880} size={58}>IL PROBLEMA<br /><span style={{color: C.blue}}>NON ERA LA VOGLIA</span></BigSign>
    </Paper>
  ),
  ({a}) => (
    <Paper>
      <StepCard n="✕" title="Era il programma" t0={a + 0.05} bad />
      <ChipList bad top={330} items={[{txt: '6 esercizi a caso', at: f3('6 esercizi', a)}, {txt: 'Carichi a sensazione', at: f3('carichi', a)}, {txt: 'Nessun giorno di riserva', at: f3('nessun', a)}]} />
    </Paper>
  ),
  ({a}) => (
    <Paper>
      <StepCard n="1" title="Due sedute fisse" t0={f3('1', a) + 0.3} sub="40 minuti + 1 di riserva" />
      <BigSign t0={a + 0.05} top={300} size={70}>3 SCELTE</BigSign>
      <Week a={f3('due sedute', a)} on={[1, 4, 5]} title="MAR · VEN + SAB DI RISERVA" top={560} />
    </Paper>
  ),
  ({a, b}) => (
    <Gym a={a} b={b} mode="hinge" girl={{glute: 0.7, brace: 0.6, plate: 22}}>
      <StepCard n="2" title="Schiena, glutei, addome" t0={a + 0.05} sub="focus su mobilità e respiro" />
      <Tag t0={f3('mobilità', a)} at={[740, 520]} text="MOBILITÀ" bg={C.blue} fg="#fff" size={44} />
      <Tag t0={f3('respiro', a)} at={[740, 630]} text="RESPIRO" bg={C.blue} fg="#fff" size={44} />
    </Gym>
  ),
  ({a}) => (
    <Paper>
      <StepCard n="3" title="Segniamo tutto" t0={a + 0.05} sub="carichi e sensazioni a ogni seduta" />
      <LogTable a={a} showAt={f3('carichi', a)} beatAt={f3('così sappiamo', a)} />
    </Paper>
  ),
  ({a}) => (
    <Paper>
      <Duo2 a={a} top={380} items={[{big: '↓', small: 'RIGIDITÀ', col: C.blue, at: f3('meno rigidità', a)}, {big: '0', small: 'SEDUTE SALTATE', col: C.blue, at: f3('non saltare', a)}]} />
      <Tag t0={a + 0.2} at={[540, 280]} text="OBIETTIVO DEL 1° MESE" bg={C.ink} fg="#fff" size={50} />
    </Paper>
  ),
  ({a}) => <Cta a={a} word={f3('scrivimi', a)} />,
];

/* ------------------------------------------------------------------ 4 · pancia, non solo crunch */
const W4 = wordsOf(c4 as Data);
const f4 = finder(W4);
const S4: Sc[] = [
  ({a}) => (
    <Paper>
      <BigSign t0={a + 0.1} top={300} size={80}>ADDOMINALI<br /><span style={{color: C.blue}}>OGNI GIORNO</span></BigSign>
      <Burst t0={f4('sempre lì')} x={540} y={900} text="PANCIA UGUALE" color={C.red} size={56} hold={30} />
      <Stamp t0={f4('è la strategia')} text="STRATEGIA" y={1120} color={C.blue} />
    </Paper>
  ),
  ({a, b}) => (
    <Gym a={a} b={b} girl={{brace: 1}}>
      <Tag t0={a + 0.2} at={[740, 330]} text="MUSCOLO ✓" bg={C.blue} fg="#fff" size={50} />
      <Tag t0={f4('il grasso', a)} at={[740, 450]} text="GRASSO SOPRA ✕" bg={C.red} fg="#fff" size={46} />
    </Gym>
  ),
  ({a, b}) => (
    <Gym a={a} b={b} girl={{brace: 0.5, glute: 0.5, quads: 0.5}}>
      <Tag t0={a + 0.2} at={[700, 320]} text="DA TUTTO IL CORPO" bg={C.blue} fg="#fff" size={48} />
      <Tag t0={f4('pancia e fianchi', a)} at={[700, 440]} text="PANCIA E FIANCHI: PER ULTIMI" bg={C.ink} fg="#fff" size={38} />
    </Gym>
  ),
  ({a}) => (
    <Paper>
      <BigNum a={a} to={100} dur={1.2} label="CRUNCH LA SERA" top={300} col={C.ink} />
      <Stamp t0={f4('pancia uguale', a)} text="PANCIA UGUALE" y={900} />
    </Paper>
  ),
  ({a}) => (
    <Paper>
      <StepCard n="✓" title="Cosa funziona" t0={a + 0.05} sub="meno spettacolare, ma funziona" />
      <ChipList top={330} items={[{txt: 'Piccolo deficit calorico', at: f4('piccolo', a)}, {txt: 'Forza per tutto il corpo', at: f4('allenamento di forza', a)}, {txt: 'Abbastanza proteine', at: f4('proteine', a)}, {txt: 'Più passi ogni giorno', at: f4('più passi', a)}]} />
    </Paper>
  ),
  ({a}) => (
    <Paper>
      <BigSign t0={a + 0.05} top={360} size={76}>UN PEZZO,<br /><span style={{color: C.blue}}>NON IL PIANO</span></BigSign>
    </Paper>
  ),
  ({a}) => (
    <Paper>
      <StepCard n="RF" title="Il tuo piano" t0={a + 0.05} sub="costruito sulla tua giornata" />
      <RiseChart a={a} until={f4('controllo', a) + 0.5} title="AGGIUSTATO A OGNI CONTROLLO" />
    </Paper>
  ),
  ({a}) => <Cta a={a} word={f4('scrivimi', a)} />,
];

/* ------------------------------------------------------------------ 6 · tra cinque anni */
const W6 = wordsOf(c6 as Data);
const f6 = finder(W6);
const S6: Sc[] = [
  ({a}) => (
    <Paper>
      <BigNum a={a + 0.3} from={2026} to={2031} dur={1.5} label="IN CHE FORMA?" top={380} fmt={(n) => String(Math.round(n))} />
    </Paper>
  ),
  ({a, b}) => (
    <Gym a={a} b={b} mode="hurt" girl={{lumbar: 0.6}}>
      <StepCard n="1" title="Continui così" t0={a + 0.05} bad />
      <Tag t0={f6('comincio', a)} at={[740, 330]} text="«COMINCIO LUNEDÌ»" bg="#fff" size={44} />
      <Tag t0={f6('la schiena', a)} at={[740, 440]} text="SCHIENA RIGIDA" bg={C.red} fg="#fff" size={44} />
      <Tag t0={f6('i jeans', a)} at={[740, 550]} text="JEANS STRETTI" bg={C.red} fg="#fff" size={44} />
      <Tag t0={f6('fiatone', a)} at={[740, 660]} text="FIATONE" bg={C.red} fg="#fff" size={44} />
    </Gym>
  ),
  ({a, b}) => (
    <Gym a={a} b={b} mode="squat" girl={{quads: 0.9, smile: 1}}>
      <StepCard n="2" title="Inizi questa settimana" t0={a + 0.05} />
      <Tag t0={f6('2', a)} at={[760, 360]} text="2–3 VOLTE" bg={C.blue} fg="#fff" size={46} />
      <Tag t0={f6('piano chiaro', a)} at={[760, 470]} text="PIANO CHIARO" bg={C.blue} fg="#fff" size={46} />
      <Tag t0={f6('più forte', a)} at={[760, 580]} text="OGNI MESE PIÙ FORTE ↑" bg={C.ink} fg="#fff" size={40} />
    </Gym>
  ),
  ({a}) => (
    <Paper>
      <BigSign t0={a + 0.05} top={260} size={60}>NON È IL TEMPO<br />CHE HAI</BigSign>
      <BigNum a={f6('sono due', a)} to={3} dur={0.4} label="ORE A SETTIMANA USATE BENE" top={620} fmt={(n) => `2–${Math.round(n)}`} />
    </Paper>
  ),
  ({a}) => (
    <Paper>
      <Burst t0={a + 0.1} x={540} y={300} text="NON HO TEMPO" color={C.red} size={54} hold={1.6} />
      <Week a={f6('per questo', a)} on={[1, 4, 6]} title="SULLA TUA AGENDA + RISERVA" top={500} />
      <Tag t0={f6('sai già', a)} at={[540, 1000]} text="SALTA UNA SEDUTA? SAI DOVE SPOSTARLA" bg={C.blue} fg="#fff" size={34} />
    </Paper>
  ),
  ({a}) => (
    <Paper>
      <ChipList top={300} items={[{txt: 'Valutazione iniziale', at: a + 0.1}, {txt: 'Esercizi scelti per te', at: f6('esercizi', a)}, {txt: 'Controlli regolari', at: f6('controlli', a)}]} />
      <Tag t0={f6('online', a)} at={[540, 1000]} text="ONLINE O IN STUDIO" bg={C.ink} fg="#fff" size={50} />
    </Paper>
  ),
  ({a}) => (
    <Paper>
      <Stamp t0={a + 0.1} text="SCENARIO 2" y={1080} color={C.blue} />
      <KeywordCTA t0={f6('scrivimi', a) - 0.1} word="ANALISI" />
      <Handle t0={f6('scrivimi', a) + 0.6} top={700} />
    </Paper>
  ),
];

/* ------------------------------------------------------------------ composizioni */
const mk = (d: unknown, q: unknown, S: Sc[], W: W3[], id: string) => {
  const V: React.FC = () => <CloneShell data={d as Data} cues={q as Cue[]} scenes={S} src={`clone/${id}.mp4`} audio={`clone/${id}_mix.wav`} W={W} />;
  return V;
};
export const Clone1 = mk(c1, q1, S1, W1, 'c1_schiena');
export const Clone2 = mk(c2, q2, S2, W2, 'c2_hip_thrust');
export const Clone3 = mk(c3, q3, S3, W3d, 'c3_impiegato');
export const Clone4 = mk(c4, q4, S4, W4, 'c4_pancia');
export const Clone6 = mk(c6, q6, S6, W6, 'c6_cinque_anni');
export const CLONE_DUR = {c1: Math.ceil((c1 as Data).dur * 30), c2: Math.ceil((c2 as Data).dur * 30), c3: Math.ceil((c3 as Data).dur * 30), c4: Math.ceil((c4 as Data).dur * 30), c6: Math.ceil((c6 as Data).dur * 30)};
