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
import {TimeLapse, ChairLoop, Aging, Stairs, Training, Compare, HoursBar, DeskDay, StandUp, ChairShape, Morning, Car, Quit, Shuffle, Straighten, CrunchDays, Layers, WholeBody, Pillars, Leve, Stand} from './Broll';
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
    <DeskDay a={a} b={b} label="9 ORE SEDUTO">
      <BigSign t0={f1('non è l')} top={420} size={80} bg={C.blue}>NON È L'ETÀ</BigSign>
    </DeskDay>
  ),
  ({a, b}) => (
    <StandUp a={a} b={b}>
      <Tag t0={f1('raddrizzarti', a)} at={[760, 260]} text="RADDRIZZARSI…" bg="#fff" size={46} />
      <Tag t0={f1('collo', a)} at={[760, 370]} text="COLLO RIGIDO" bg={C.red} fg="#fff" size={46} />
      <Tag t0={f1('spalle', a)} at={[760, 480]} text="SPALLE IN AVANTI" bg={C.red} fg="#fff" size={46} />
      <Tag t0={f1('è normale', a)} at={[760, 620]} text="«È NORMALE…»" bg="#fff" size={52} />
    </StandUp>
  ),
  ({a}) => (
    <ChairShape a={a}>
      <BigSign t0={a + 0.05} top={180} size={70}>IL CORPO<br /><span style={{color: C.blue}}>SI ADATTA</span></BigSign>
      <Tag t0={f1('nove ore', a)} at={[760, 620]} text="9 ORE = STESSA FORMA" bg={C.ink} fg="#fff" size={42} />
    </ChairShape>
  ),
  ({a}) => (
    <Morning a={a}>
      <Tag t0={a + 0.3} at={[300, 220]} text="FASTIDIO DELLA SERA" bg="#fff" size={44} />
      <Tag t0={f1('mattino', a)} at={[330, 330]} text="→ DEL MATTINO" bg={C.red} fg="#fff" size={50} />
      <Tag t0={f1('ogni mese', a)} at={[540, 1150]} text="RIPARTIRE COSTA DI PIÙ" bg={C.red} fg="#fff" size={46} />
    </Morning>
  ),
  ({a, b}) => (
    <Training a={a} b={b}>
      <StepCard n="✓" title="La buona notizia" t0={a + 0.05} sub="non servono 2 ore al giorno" />
      <Tag t0={f1('due o tre', a)} at={[330, 1160]} text="2–3 SEDUTE A SETTIMANA" bg={C.blue} fg="#fff" size={42} />
    </Training>
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
    <Leve a={a}>
      <StepCard n="RF" title="Nei miei programmi" t0={a + 0.05} />
      <Tag t0={f2('varianti', a)} at={[300, 1100]} text="VARIANTI SU MISURA" bg={C.blue} fg="#fff" size={40} />
      <Tag t0={f2('carichi', a)} at={[780, 1100]} text="CARICHI SU DI TE" bg={C.ink} fg="#fff" size={40} />
      <Tag t0={f2('perché ogni', a)} at={[540, 1200]} text="OGNI CORPO HA LE SUE LEVE" bg="#fff" size={42} />
    </Leve>
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
    <Stand x={400} y={540} s={0.72} pose={{hunch: 0.5, belly: 0.4, pain: 1, smile: -0.4, handA: [150, 640]}}>
      <Profile a={a} />
      <Tag t0={f3('prime 4')} at={[540, 1160]} text="LE PRIME 4 SETTIMANE" bg={C.blue} fg="#fff" size={54} />
    </Stand>
  ),
  ({a}) => (
    <Paper>
      <Profile a={a - 5} />
      <Stamp t0={a + 0.1} text="CASO TIPO" y={800} color={C.ink} />
      <Tag t0={f3('storia', a)} at={[540, 1050]} text="NON UN CLIENTE REALE" bg="#fff" size={42} />
    </Paper>
  ),
  ({a}) => {
    const t = useT();
    const car = f3('1 ora', a);
    return t < car - 0.1 ? (
      <DeskDay a={a - 0.6} b={car} from={9} to={17} label="8 ORE IN UFFICIO" />
    ) : (
      <Car a={car}>
        <Tag t0={car} at={[540, 220]} text="1 ORA DI MACCHINA" bg={C.ink} fg="#fff" size={52} />
      </Car>
    );
  },
  ({a}) => (
    <Quit a={a}>
      <Tag t0={a + 0.1} at={[540, 200]} text="PROVATA E MOLLATA 3 VOLTE" bg={C.red} fg="#fff" size={44} />
      <BigSign t0={f3('il problema', a)} top={1000} size={52}>IL PROBLEMA <span style={{color: C.blue}}>NON ERA LA VOGLIA</span></BigSign>
    </Quit>
  ),
  ({a}) => (
    <Shuffle a={a}>
      <StepCard n="✕" title="Era il programma" t0={a + 0.05} bad />
      <Tag t0={f3('6 esercizi', a)} at={[540, 960]} text="6 ESERCIZI A CASO" bg={C.red} fg="#fff" size={42} />
      <Tag t0={f3('carichi', a)} at={[540, 1060]} text="CARICHI A SENSAZIONE" bg={C.red} fg="#fff" size={42} />
      <Tag t0={f3('nessun', a)} at={[540, 1160]} text="NESSUN GIORNO DI RISERVA" bg={C.red} fg="#fff" size={42} />
    </Shuffle>
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
  ({a, b}) => (
    <Straighten a={a} b={b}>
      <Tag t0={a + 0.2} at={[540, 200]} text="OBIETTIVO DEL 1° MESE" bg={C.ink} fg="#fff" size={50} />
      <Tag t0={f3('meno rigidità', a)} at={[300, 1120]} text="MENO RIGIDITÀ" bg={C.blue} fg="#fff" size={44} />
      <Tag t0={f3('non saltare', a)} at={[780, 1120]} text="0 SEDUTE SALTATE" bg={C.blue} fg="#fff" size={44} />
    </Straighten>
  ),
  ({a}) => <Cta a={a} word={f3('scrivimi', a)} />,
];

/* ------------------------------------------------------------------ 4 · pancia, non solo crunch */
const W4 = wordsOf(c4 as Data);
const f4 = finder(W4);
const S4: Sc[] = [
  ({a}) => (
    <CrunchDays a={a}>
      <BigSign t0={a + 0.1} top={360} size={60} rot={-3}>ADDOMINALI<br /><span style={{color: C.blue}}>OGNI GIORNO</span></BigSign>
      <Burst t0={f4('sempre lì')} x={400} y={600} text="PANCIA UGUALE" color={C.red} size={40} hold={30} />
      <Stamp t0={f4('è la strategia')} text="STRATEGIA" x={540} y={1150} color={C.blue} />
    </CrunchDays>
  ),
  ({a}) => (
    <Layers a={a} fatAt={f4('il grasso', a)}>
      <Tag t0={f4('non si consuma', a)} at={[540, 1130]} text="NON SI CONSUMA IN QUEL PUNTO" bg={C.red} fg="#fff" size={40} />
    </Layers>
  ),
  ({a, b}) => (
    <WholeBody a={a} b={b} lastAt={f4('pancia e fianchi', a)}>
      <Tag t0={a + 0.2} at={[540, 160]} text="DA TUTTO IL CORPO" bg={C.blue} fg="#fff" size={50} />
      <Tag t0={f4('pancia e fianchi', a)} at={[780, 1080]} text="PANCIA E FIANCHI: PER ULTIMI" bg={C.ink} fg="#fff" size={36} />
    </WholeBody>
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
      <Pillars top={300} items={[{txt: 'Piccolo deficit', at: f4('piccolo', a), icon: 'plate'}, {txt: 'Forza total body', at: f4('allenamento di forza', a), icon: 'db'}, {txt: 'Abbastanza proteine', at: f4('proteine', a), icon: 'egg'}, {txt: 'Più passi', at: f4('più passi', a), icon: 'shoe'}]} />
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
  // 0 · hook: gli anni scorrono
  ({a}) => <TimeLapse a={a} askAt={f6('in che forma', a)} />,
  // 1 · scenario 1: sedia e rimandi
  ({a, b}) => (
    <ChairLoop a={a} b={b}>
      <StepCard n="1" title="Continui così" t0={a + 0.05} bad />
      <Tag t0={f6('sedia', a)} at={[300, 1150]} text="STESSA SEDIA" bg="#fff" size={44} />
      <Tag t0={f6('comincio', a)} at={[790, 640]} text="«COMINCIO LUNEDÌ»" bg={C.red} fg="#fff" size={40} />
    </ChairLoop>
  ),
  // 2 · invecchiamento: schiena rigida, jeans stretti
  ({a, b}) => (
    <AbsoluteFill>
      <Aging a={a} b={b} stiffAt={f6('irrigidisce', a)} jeansAt={f6('jeans', a)} />
      <Tag t0={f6('irrigidisce', a)} at={[300, 300]} text="SCHIENA RIGIDA" bg={C.red} fg="#fff" size={46} />
      <Tag t0={f6('jeans', a)} at={[330, 1050]} text="JEANS STRETTI" bg={C.red} fg="#fff" size={46} />
    </AbsoluteFill>
  ),
  // 3 · scale col fiatone
  ({a}) => (
    <Stairs a={a} heavy>
      <Tag t0={f6('scale', a)} at={[260, 170]} text="SCALE PESANTI" bg={C.red} fg="#fff" size={46} />
      <Tag t0={f6('fiatone', a)} at={[790, 420]} text="FIATONE" bg={C.red} fg="#fff" size={56} />
    </Stairs>
  ),
  // 4 · scenario 2: allenamento
  ({a, b}) => (
    <Training a={a} b={b}>
      <StepCard n="2" title="Inizi questa settimana" t0={a + 0.05} />
      <Tag t0={f6('2', a)} at={[300, 300]} text="2–3 VOLTE" bg={C.blue} fg="#fff" size={46} />
      <Tag t0={f6('piano chiaro', a)} at={[330, 400]} text="PIANO CHIARO" bg={C.blue} fg="#fff" size={46} />
      <Tag t0={f6('non cambia', a)} at={[320, 1160]} text="NON TUTTO SUBITO" bg="#fff" size={40} />
    </Training>
  ),
  // 5 · scale leggere
  ({a}) => (
    <Stairs a={a}>
      <Tag t0={a + 0.1} at={[290, 170]} text="OGNI MESE PIÙ FORTE ↑" bg={C.blue} fg="#fff" size={44} />
      <Tag t0={f6('muovi meglio', a)} at={[780, 440]} text="TI MUOVI MEGLIO" bg={C.ink} fg="#fff" size={44} />
    </Stairs>
  ),
  // 6 · confronto + 3 ore su 168
  ({a}) => (
    <AbsoluteFill>
      <Compare a={a} />
      <HoursBar a={f6('sono due', a)} />
    </AbsoluteFill>
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
