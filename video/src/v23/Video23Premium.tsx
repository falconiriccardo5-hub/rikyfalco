/** Video 23 — versione «premium»: fondo scuro cinematografico, titoli serif, didascalia in alto con parola chiave,
 *  illustrazioni a linea sottile e personaggi con proporzioni realistiche (solo per questo video). */
import React from 'react';
import {AbsoluteFill, Audio, staticFile, useCurrentFrame} from 'remotion';
import {E, FONT, mix, prog, rnd, useT} from '../brand';
import timing from '../voice23_timing.json';
import {Person, Pose, Limb, pt} from './Person';

const FontFaces: React.FC = () => (
  <style>{`@font-face{font-family:'Inter';font-weight:900;src:url(${staticFile('fonts/Inter-Black.otf')});}
@font-face{font-family:'Inter';font-weight:800;src:url(${staticFile('fonts/Inter-ExtraBold.otf')});}
@font-face{font-family:'Inter';font-weight:700;src:url(${staticFile('fonts/Inter-Bold.otf')});}
@font-face{font-family:'Inter';font-weight:600;src:url(${staticFile('fonts/Inter-Bold.otf')});}
@font-face{font-family:Playfair;src:url(${staticFile('fonts/Playfair-600.woff2')}) format('woff2');font-weight:600;font-style:normal}
@font-face{font-family:Playfair;src:url(${staticFile('fonts/Playfair-400i.woff2')}) format('woff2');font-weight:400;font-style:italic}`}</style>
);
const SERIF = "Playfair, Georgia, 'Times New Roman', serif";

type Seg = {id: string; scene: string; text: string; t0: number; t1: number; words: [number, number, string][]};
const T = timing as unknown as Seg[];
const seg = (id: string) => T.find((s) => s.id === id)!;
const wt = (id: string, n: number) => seg(id).words[Math.min(n, seg(id).words.length - 1)][0];
export const END23P = seg('a9').t1 + 1.6;
export const DURATION23P = Math.ceil(END23P * 30);

const W: Record<string, [number, number]> = {
  hook: [0, seg('a2').t0 - 0.15],
  futuro: [seg('a2').t0 - 0.15, seg('a3').t0 - 0.15],
  ossa: [seg('a3').t0 - 0.15, seg('a4').t0 - 0.15],
  ossa2: [seg('a4').t0 - 0.15, seg('a5').t0 - 0.15],
  cervello: [seg('a5').t0 - 0.15, seg('a6').t0 - 0.15],
  umore: [seg('a6').t0 - 0.15, seg('a7').t0 - 0.15],
  pratica: [seg('a7').t0 - 0.15, seg('a8').t0 - 0.15],
  fiducia: [seg('a8').t0 - 0.15, seg('a9').t0 - 0.15],
  cta: [seg('a9').t0 - 0.15, END23P + 1],
};

/* ------------------------------------------------------------------ palette */
const BG = '#0C0A10';
const INK = '#F3EFE8';
const MUTED = 'rgba(243,239,232,.55)';
const LINE = 'rgba(243,239,232,.22)';
const VIO = '#7B4BE0';
const VIO2 = '#B49BFF';
const RED = '#E5484D';
const smooth = (x: number) => x * x * (3 - 2 * x);
const clamp = (x: number, a = 0, b = 1) => Math.max(a, Math.min(b, x));
const lerpLimb = (a: Limb, b: Limb, p: number): Limb => [mix(a[0], b[0], p), mix(a[1], b[1], p)];
const cyc = (t: number, period: number) => (1 - Math.cos((t / period) * Math.PI * 2)) / 2;

/* ------------------------------------------------------------------ struttura */
const Scene: React.FC<{id: string; children: (lt: number, dur: number) => React.ReactNode; zoom?: number}> = ({id, children, zoom = 0.05}) => {
  const t = useT();
  const [a, b] = W[id];
  if (t < a - 0.05 || t > b + 0.45) return null;
  const lt = t - a;
  const dur = b - a;
  const op = Math.min(prog(t, a - 0.05, a + 0.4, E.inOut), 1 - prog(t, b, b + 0.45, E.inOut));
  const sc = 1 + zoom * (lt / dur);
  return (
    <AbsoluteFill style={{opacity: op, transform: `scale(${sc})`, transformOrigin: '50% 52%'}}>
      {children(lt, dur)}
    </AbsoluteFill>
  );
};
const Svg: React.FC<{children: React.ReactNode}> = ({children}) => (
  <svg width={1080} height={1920} viewBox="0 0 1080 1920" style={{position: 'absolute', inset: 0}}>
    {children}
  </svg>
);

/** luce morbida dietro ai soggetti */
const Glow: React.FC<{x: number; y: number; r: number; c?: string; o?: number}> = ({x, y, r, c = VIO, o = 0.35}) => (
  <div style={{position: 'absolute', left: x - r, top: y - r, width: r * 2, height: r * 2, borderRadius: '50%', background: `radial-gradient(circle, ${c} 0%, transparent 68%)`, opacity: o}} />
);

/** pavimento: linea d'orizzonte sottile + riflesso */
const Floor: React.FC<{y: number; o?: number}> = ({y, o = 1}) => (
  <div style={{position: 'absolute', left: 0, right: 0, top: y, height: 2, background: `linear-gradient(90deg, transparent, ${LINE} 20%, ${LINE} 80%, transparent)`, opacity: o}} />
);

/** titolo di capitolo: numero + parola in serif */
const Chapter: React.FC<{n: string; title: string; t0: number; top?: number}> = ({n, title, t0, top = 470}) => {
  const t = useT();
  const p = prog(t, t0, t0 + 0.8);
  const ln = prog(t, t0 + 0.2, t0 + 1.0);
  return (
    <div style={{position: 'absolute', left: 0, right: 0, top, textAlign: 'center', opacity: p}}>
      <div style={{fontFamily: FONT, fontWeight: 700, fontSize: 26, letterSpacing: 10, color: VIO2}}>{n}</div>
      <div style={{fontFamily: SERIF, fontWeight: 600, fontSize: 128, color: INK, lineHeight: 1.05, transform: `translateY(${(1 - p) * 30}px)`, letterSpacing: -1}}>{title}</div>
      <div style={{margin: '14px auto 0', width: 160 * ln, height: 2, background: VIO}} />
    </div>
  );
};

const Kicker: React.FC<{text: string; t0: number; top: number; size?: number; color?: string; italic?: boolean; left?: number; right?: number; align?: 'center' | 'left' | 'right'}> = ({text, t0, top, size = 44, color = INK, italic = true, left = 60, right = 60, align = 'center'}) => {
  const t = useT();
  const p = prog(t, t0, t0 + 0.7);
  return (
    <div style={{position: 'absolute', left, right, top, textAlign: align, fontFamily: SERIF, fontStyle: italic ? 'italic' : 'normal', fontWeight: italic ? 400 : 600, fontSize: size, color, opacity: p, transform: `translateY(${(1 - p) * 18}px)`, lineHeight: 1.15}}>
      {text}
    </div>
  );
};

/** numero grande che conta */
const Counter: React.FC<{to: number; t0: number; x: number; y: number; prefix?: string; suffix?: string; label: string; dec?: number; color?: string; size?: number; dur?: number}> = ({
  to,
  t0,
  x,
  y,
  prefix = '',
  suffix = '',
  label,
  dec = 0,
  color = INK,
  size = 150,
  dur = 0.9,
}) => {
  const t = useT();
  const p = prog(t, t0, t0 + dur);
  const v = (to * p).toFixed(dec).replace('.', ',');
  return (
    <div style={{position: 'absolute', left: x - 250, width: 500, top: y, textAlign: 'center', opacity: prog(t, t0, t0 + 0.3)}}>
      <div style={{fontFamily: SERIF, fontWeight: 600, fontSize: size, color, lineHeight: 1}}>
        {prefix}
        {v}
        {suffix}
      </div>
      <div style={{fontFamily: FONT, fontWeight: 700, fontSize: 28, letterSpacing: 4, color: MUTED, marginTop: 10, textTransform: 'uppercase'}}>{label}</div>
    </div>
  );
};

const Source: React.FC<{text: string; t0: number}> = ({text, t0}) => {
  const t = useT();
  return (
    <div style={{position: 'absolute', left: 80, right: 80, top: 1600, textAlign: 'center', fontFamily: FONT, fontWeight: 600, fontSize: 24, letterSpacing: 1, color: 'rgba(243,239,232,.42)', opacity: prog(t, t0, t0 + 0.6)}}>
      Fonte · {text}
    </div>
  );
};

/** etichetta con linea guida */
const Callout: React.FC<{from: [number, number]; to: [number, number]; text: string; t0: number; align?: 'left' | 'right'}> = ({from, to, text, t0, align = 'left'}) => {
  const t = useT();
  const p = prog(t, t0, t0 + 0.6);
  const q = prog(t, t0 + 0.35, t0 + 0.9);
  const mid: [number, number] = [mix(from[0], to[0], p), mix(from[1], to[1], p)];
  return (
    <>
      <svg width={1080} height={1920} style={{position: 'absolute', inset: 0}}>
        <circle cx={from[0]} cy={from[1]} r={9 * prog(t, t0, t0 + 0.25)} fill={VIO2} />
        <circle cx={from[0]} cy={from[1]} r={9 + 18 * ((t * 1.2) % 1)} fill="none" stroke={VIO2} strokeWidth={2} opacity={p * (1 - ((t * 1.2) % 1))} />
        <line x1={from[0]} y1={from[1]} x2={mid[0]} y2={mid[1]} stroke={VIO2} strokeWidth={2.5} />
      </svg>
      <div
        style={{
          position: 'absolute',
          top: to[1] - 34,
          ...(align === 'left' ? {left: to[0] + 16} : {right: 1080 - to[0] + 16}),
          fontFamily: SERIF,
          fontWeight: 600,
          fontSize: 52,
          color: INK,
          opacity: q,
          transform: `translateX(${(1 - q) * (align === 'left' ? -14 : 14)}px)`,
        }}
      >
        {text}
      </div>
    </>
  );
};

/* ------------------------------------------------------------------ didascalia in alto (parola per parola) */
const KEY = new Set(
  'muscoli corpo forza adesso ossa carico rinforzandosi menopausa pesanti due otto salita leggeri scesa cervello memoria sei umore trentatré depressivi sovraccarichi settimana fondamentali impegna facile giusto tecnica progressi analisi'.split(' '),
);
type Tok = {w: string; t: number; key: boolean};
const tokens = (s: Seg): Tok[] => {
  const out: Tok[] = [];
  for (const [t0, , raw] of s.words) {
    if (raw.startsWith("'") && out.length) {
      out[out.length - 1].w += raw;
      continue;
    }
    let w = raw === 'Voi' ? 'Vuoi' : raw;
    if (w.toLowerCase().startsWith('analisi')) w = 'ANALISI' + w.slice(7).replace('.', '');
    const bare = w.toLowerCase().replace(/[^a-zàèéìòù']/g, '');
    out.push({w, t: t0, key: KEY.has(bare) || bare === 'analisi'});
  }
  return out;
};
/** spezza la frase in righe: prima sulla punteggiatura, poi in pezzi bilanciati da max 5 parole */
const chunks = (toks: Tok[]) => {
  const phrases: Tok[][] = [];
  let cur: Tok[] = [];
  toks.forEach((tk, i) => {
    cur.push(tk);
    if (/[,.?!:]$/.test(tk.w) || i === toks.length - 1) {
      phrases.push(cur);
      cur = [];
    }
  });
  // frasi di una parola: unite alla successiva se ci stanno
  const merged: Tok[][] = [];
  for (let i = 0; i < phrases.length; i++) {
    const ph = phrases[i];
    if (ph.length <= 2 && i + 1 < phrases.length && ph.length + phrases[i + 1].length <= 5) {
      phrases[i + 1] = [...ph, ...phrases[i + 1]];
      continue;
    }
    merged.push(ph);
  }
  const res: Tok[][] = [];
  for (const ph of merged) {
    const k = Math.ceil(ph.length / 5);
    const size = Math.ceil(ph.length / k);
    for (let i = 0; i < ph.length; i += size) res.push(ph.slice(i, i + size));
  }
  return res;
};
const CAPS = T.flatMap((s) => {
  const ch = chunks(tokens(s));
  return ch.map((c, i) => ({toks: c, t0: c[0].t - 0.12, t1: i < ch.length - 1 ? ch[i + 1][0].t - 0.12 : s.t1 + 0.25}));
});
const TopCaption: React.FC = () => {
  const t = useT();
  const cur = CAPS.find((c) => t >= c.t0 && t < c.t1);
  if (!cur) return null;
  const pin = prog(t, cur.t0, cur.t0 + 0.25);
  const pout = 1 - prog(t, cur.t1 - 0.15, cur.t1);
  return (
    <div style={{position: 'absolute', left: 70, right: 70, top: 230, height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: Math.min(pin, pout)}}>
      <div style={{textAlign: 'center', fontFamily: FONT, fontWeight: 800, fontSize: 60, lineHeight: 1.22, letterSpacing: -0.5, color: INK}}>
        {cur.toks.map((tk, i) => {
          const on = prog(t, tk.t - 0.06, tk.t + 0.14);
          const hl = tk.key ? prog(t, tk.t, tk.t + 0.22, E.out) : 0;
          return (
            <span key={i} style={{display: 'inline-block', margin: '0 9px', position: 'relative', opacity: 0.28 + 0.72 * on, transform: `translateY(${(1 - on) * 8}px)`}}>
              {tk.key && <span style={{position: 'absolute', left: -10, right: -10, top: 6, bottom: 2, background: VIO, borderRadius: 10, transform: `scaleX(${hl})`, transformOrigin: 'left center', zIndex: 0}} />}
              <span style={{position: 'relative', zIndex: 1}}>{tk.w.replace(/[,]$/, '')}</span>
            </span>
          );
        })}
      </div>
    </div>
  );
};

/* ------------------------------------------------------------------ oggetti */
/** bilanciere visto di fronte, centrato su (cx,cy) */
const BarFront: React.FC<{cx: number; cy: number; half?: number}> = ({cx, cy, half = 300}) => (
  <g>
    <rect x={cx - half} y={cy - 6} width={half * 2} height={12} rx={6} fill="#C9C6CF" />
    {[-1, 1].map((sd) => (
      <g key={sd}>
        <rect x={cx + sd * (half - 64) - 15} y={cy - 92} width={30} height={184} rx={8} fill={VIO} />
        <rect x={cx + sd * (half - 30) - 12} y={cy - 74} width={24} height={148} rx={7} fill="#5A33B8" />
        <rect x={cx + sd * (half - 92) - 8} y={cy - 22} width={16} height={44} rx={4} fill="#8F8C96" />
      </g>
    ))}
  </g>
);
/** bilanciere visto di lato (disco) */
const BarSide: React.FC<{cx: number; cy: number; r?: number}> = ({cx, cy, r = 74}) => (
  <g>
    <circle cx={cx} cy={cy} r={r} fill={VIO} />
    <circle cx={cx} cy={cy} r={r * 0.78} fill="none" stroke="#5A33B8" strokeWidth={6} />
    <circle cx={cx} cy={cy} r={12} fill="#C9C6CF" />
  </g>
);
const Dumbbell: React.FC<{cx: number; cy: number; s?: number}> = ({cx, cy, s = 1}) => (
  <g transform={`translate(${cx},${cy}) scale(${s})`}>
    <rect x={-30} y={-5} width={60} height={10} rx={5} fill="#C9C6CF" />
    <rect x={-44} y={-22} width={18} height={44} rx={6} fill={VIO} />
    <rect x={26} y={-22} width={18} height={44} rx={6} fill={VIO} />
  </g>
);
const Bag: React.FC<{x: number; y: number}> = ({x, y}) => (
  <g transform={`translate(${x},${y})`}>
    <path d="M-20 4 Q0 -26 20 4" stroke="#B9A47E" strokeWidth={5} fill="none" />
    <path d="M-38 6 L38 6 L44 104 L-44 104 Z" fill="#D8C29A" />
    <path d="M-38 6 L38 6 L39 24 L-39 24 Z" fill="#C3AB80" />
    <circle cx={-14} cy={-2} r={13} fill="#7DBB6A" />
    <rect x={6} y={-30} width={14} height={40} rx={5} fill="#F2E6CF" />
  </g>
);
const Clipboard: React.FC<{x: number; y: number; r?: number}> = ({x, y, r = -8}) => (
  <g transform={`translate(${x},${y}) rotate(${r})`}>
    <rect x={-44} y={-60} width={88} height={120} rx={8} fill="#E9E4DA" />
    <rect x={-18} y={-68} width={36} height={16} rx={5} fill="#6B6670" />
    {[0, 1, 2, 3].map((i) => (
      <g key={i}>
        <rect x={-30} y={-34 + i * 24} width={10} height={10} rx={2} fill={VIO} />
        <rect x={-14} y={-32 + i * 24} width={44 - (i % 2) * 14} height={6} rx={3} fill="#B9B3AA" />
      </g>
    ))}
  </g>
);

/* ------------------------------------------------------------------ scene */
const Hook: React.FC = () => (
  <Scene id="hook" zoom={0.06}>
    {(lt) => {
      // spinta sopra la testa, ciclo di 2,4 s
      const p = smooth(cyc(lt + 0.6, 2.4));
      const armL = lerpLimb([-0.62, -2.95], [-2.72, -2.98], p);
      const armR: Limb = [-armL[0], -armL[1]];
      const pose: Pose = {armL, armR, legL: [-0.12, -0.04], legR: [0.12, 0.04], mouth: 0};
      const lab = wt('a1', 11);
      return (
        <>
          <Glow x={540} y={1040} r={620} o={0.4} />
          <Floor y={1530} />
          <Svg>
            <Person kind="girl" x={540} y={1520} s={1.32} pose={pose} hold={({L, R}) => <BarFront cx={(L[0] + R[0]) / 2} cy={(L[1] + R[1]) / 2 + 12} half={290} />} />
          </Svg>
          <Callout from={[540, 760]} to={[300, 860]} text="Cervello" t0={lab + 0.1} align="right" />
          <Callout from={[505, 1300]} to={[250, 1250]} text="Ossa" t0={lab + 0.45} align="right" />
          <Callout from={[560, 920]} to={[830, 1010]} text="Umore" t0={lab + 0.8} />
        </>
      );
    }}
  </Scene>
);

const Futuro: React.FC = () => (
  <Scene id="futuro" zoom={0.03}>
    {(lt) => {
      const STEP_W = 150;
      const STEP_H = 74;
      const per = 1.5; // secondi per gradino
      const k = lt / per;
      const ph = k % 1;
      // gradini che scorrono verso il basso-sinistra: il personaggio sta fermo
      const ox = -ph * STEP_W;
      const oy = ph * STEP_H;
      const even = Math.floor(k) % 2 === 0;
      const swing = smooth(ph);
      const front: Limb = [mix(-0.1, 0.62, swing), mix(-0.25, 0.02, swing)];
      const back: Limb = [mix(0.62, -0.1, swing) * 0.4 - 0.12 * swing, mix(0.02, -0.28, swing)];
      const pose: Pose = {legL: even ? front : back, legR: even ? back : front, armL: [0.06, 0.04], armR: [-0.02, 0.02], bend: 0.18};
      const t30 = wt('a2', 1);
      return (
        <>
          <Glow x={560} y={1100} r={600} o={0.3} />
          <Svg>
            <g transform={`translate(${ox},${oy})`}>
              {Array.from({length: 14}).map((_, i) => {
                const x = -300 + i * STEP_W;
                const y = 1900 - i * STEP_H;
                return (
                  <g key={i}>
                    <path d={`M${x} ${y} L${x} ${y - STEP_H} L${x + STEP_W} ${y - STEP_H}`} stroke={LINE} strokeWidth={3} fill="none" />
                    <path d={`M${x} ${y - STEP_H} L${x + STEP_W} ${y - STEP_H}`} stroke={VIO} strokeWidth={3} opacity={0.5} />
                    <rect x={x} y={y - STEP_H} width={STEP_W} height={2000} fill="rgba(255,255,255,0.025)" />
                  </g>
                );
              })}
            </g>
            <Person kind="old" view="side" x={620} y={1478 + oy * 0} s={1.22} pose={pose} under={({R}) => <Bag x={R[0] + 6} y={R[1] + 10} />} hold={({L}) => <Bag x={L[0] + 4} y={L[1] + 12} />} />
          </Svg>
          <Counter to={30} t0={t30} x={270} y={600} prefix="+" label="anni" size={170} />
          <Kicker text="la forza si costruisce adesso" t0={wt('a2', 13)} top={1600} size={52} color={VIO2} />
        </>
      );
    }}
  </Scene>
);

/** osso (femore) a linea sottile con trabecole che si illuminano */
const BONE = 'M210 300 C150 230 170 140 250 150 C300 155 320 200 345 230 L735 230 C760 200 780 155 830 150 C910 140 930 230 870 300 C930 370 910 460 830 450 C780 445 760 400 735 370 L345 370 C320 400 300 445 250 450 C170 460 150 370 210 300 Z';
const Ossa: React.FC = () => (
  <Scene id="ossa" zoom={0.08}>
    {(lt, dur) => {
      const t = lt + W.ossa[0];
      const draw = prog(t, W.ossa[0] + 0.5, W.ossa[0] + 1.8, E.inOut);
      const load = prog(t, wt('a3', 4), wt('a3', 6) + 0.3);
      const stim = prog(t, wt('a3', 11), wt('a3', 11) + 0.6);
      const strong = prog(t, wt('a3', 14), wt('a3', 14) + 0.9);
      const press = load * (0.5 + 0.5 * Math.abs(Math.sin(lt * 3.2))) * (1 - strong * 0.6);
      const cells: React.ReactNode[] = [];
      for (let r = 0; r < 9; r++)
        for (let q = 0; q < 26; q++) {
          const x = 170 + q * 30 + (r % 2) * 15;
          const y = 160 + r * 34;
          const ph = rnd(r * 31 + q * 7);
          const on = clamp(stim * 1.8 - ph * 0.8);
          cells.push(
            <polygon
              key={`${r}-${q}`}
              points={[0, 1, 2, 3, 4, 5].map((i) => `${x + 14 * Math.cos((i * Math.PI) / 3 + Math.PI / 6)},${y + 14 * Math.sin((i * Math.PI) / 3 + Math.PI / 6)}`).join(' ')}
              fill={on > 0.1 ? VIO : 'none'}
              fillOpacity={on * (0.18 + 0.25 * strong)}
              stroke={on > 0.1 ? VIO2 : LINE}
              strokeWidth={1.5 + 2.5 * strong * on}
              opacity={0.35 + 0.65 * Math.max(on, 0.25)}
            />,
          );
        }
      return (
        <>
          <Chapter n="01" title="Ossa" t0={W.ossa[0] + 0.15} />
          <Glow x={540} y={1150} r={560} o={0.25 + 0.25 * strong} />
          <Svg>
            <defs>
              <clipPath id="bone">
                <path d={BONE} />
              </clipPath>
            </defs>
            <g transform="translate(0,850)">
              {/* frecce di carico */}
              {[300, 540, 780].map((x, i) => (
                <g key={i} opacity={load} transform={`translate(${x},${-40 - 30 * (1 - press) + i * 0})`}>
                  <line x1={0} y1={0} x2={0} y2={90 + 20 * press} stroke={INK} strokeWidth={4} />
                  <path d={`M-16 ${80 + 20 * press} L0 ${110 + 20 * press} L16 ${80 + 20 * press}`} fill="none" stroke={INK} strokeWidth={4} strokeLinejoin="round" />
                </g>
              ))}
              <g transform={`translate(0,${press * 6}) scale(1,${1 - press * 0.015})`}>
                <g clipPath="url(#bone)" opacity={draw}>
                  {cells}
                </g>
                <path d={BONE} fill="none" stroke={INK} strokeWidth={4 + 3 * strong} strokeDasharray={2600} strokeDashoffset={2600 * (1 - draw)} />
                {strong > 0 && <path d={BONE} fill="none" stroke={VIO2} strokeWidth={14} opacity={0.25 * strong} />}
              </g>
            </g>
          </Svg>
          <Kicker text="carico  →  stimolo  →  osso più forte" t0={wt('a3', 11)} top={1420} size={46} color={MUTED} />
          {dur > 0 && null}
        </>
      );
    }}
  </Scene>
);

const Ossa2: React.FC = () => (
  <Scene id="ossa2" zoom={0.04}>
    {(lt) => {
      const t = lt + W.ossa2[0];
      const chartIn = prog(t, wt('a4', 23) - 0.3, wt('a4', 23) + 0.3, E.inOut);
      const figOp = 1 - chartIn;
      // stacco da terra (vista laterale): cerniera d'anca
      const d = smooth(cyc(lt, 2.8));
      const pose: Pose = {bend: mix(0.08, 1.05, d), legL: [mix(0.04, 0.42, d), mix(0, -0.22, d)], legR: [mix(0.04, 0.42, d), mix(0, -0.22, d)], armL: [0, 0], armR: [0, 0]};
      const upBar = prog(t, wt('a4', 27), wt('a4', 28) + 0.6);
      const dnBar = prog(t, wt('a4', 30), wt('a4', 34) + 0.2);
      const BASE = 1150;
      return (
        <>
          <Kicker text="Lo studio LIFTMOR" t0={W.ossa2[0] + 0.2} top={470} size={40} color={VIO2} italic={false} />
          <div style={{opacity: figOp}}>
            <Glow x={560} y={1200} r={560} o={0.3} />
            <Floor y={1540} />
            <Svg>
              <Person kind="riky" x={260} y={1530} s={0.95} pose={{armL: [0.25, 2.1], armR: [-0.05, 0.05]}} hold={({L}) => <Clipboard x={L[0] + 6} y={L[1] + 20} />} />
              <Person kind="old" view="side" x={700} y={1530} s={1.05} pose={pose} hold={({L}) => <BarSide cx={L[0] + 4} cy={L[1] + 14} />} />
            </Svg>
            <Kicker text="donne in menopausa, ossa fragili" t0={wt('a4', 3)} top={560} size={44} />
            <Counter to={2} t0={wt('a4', 16)} x={300} y={640} suffix="×" label="a settimana" size={130} />
            <Counter to={8} t0={wt('a4', 21)} x={780} y={640} label="mesi" size={130} dur={0.6} />
          </div>
          {chartIn > 0 && (
            <div style={{opacity: chartIn}}>
              <Kicker text="densità ossea della colonna" t0={wt('a4', 23)} top={600} size={50} />
              <Svg>
                <line x1={150} y1={BASE} x2={930} y2={BASE} stroke={LINE} strokeWidth={3} />
                <rect x={250} y={BASE - 320 * upBar} width={190} height={320 * upBar} rx={10} fill={VIO} />
                <rect x={640} y={BASE} width={190} height={132 * dnBar} rx={10} fill={RED} opacity={0.9} />
              </Svg>
              <div style={{position: 'absolute', left: 195, width: 300, top: BASE - 320 * upBar - 130, textAlign: 'center', fontFamily: SERIF, fontWeight: 600, fontSize: 96, color: INK, opacity: upBar}}>+{(2.9 * upBar).toFixed(1).replace('.', ',')}%</div>
              <div style={{position: 'absolute', left: 585, width: 300, top: BASE + 132 * dnBar + 20, textAlign: 'center', fontFamily: SERIF, fontWeight: 600, fontSize: 96, color: INK, opacity: dnBar}}>−{(1.2 * dnBar).toFixed(1).replace('.', ',')}%</div>
              <div style={{position: 'absolute', left: 195, width: 300, top: BASE + 30, textAlign: 'center', fontFamily: FONT, fontWeight: 700, fontSize: 30, letterSpacing: 2, color: MUTED, opacity: upBar}}>CARICHI PESANTI</div>
              <div style={{position: 'absolute', left: 585, width: 300, top: BASE - 70, textAlign: 'center', fontFamily: FONT, fontWeight: 700, fontSize: 30, letterSpacing: 2, color: MUTED, opacity: dnBar}}>ESERCIZI LEGGERI</div>
            </div>
          )}
          <Source text="Watson et al., J Bone Miner Res 2018" t0={W.ossa2[0] + 0.6} />
        </>
      );
    }}
  </Scene>
);

/** cervello di profilo a linea sottile, ippocampo evidenziato */
const BRAIN =
  'M120 300 C90 230 110 140 190 100 C250 50 360 30 450 50 C540 60 620 110 650 190 C680 260 660 320 620 350 C600 380 560 390 520 385 C500 420 450 430 420 410 C380 440 300 440 260 410 C200 420 140 380 120 300 Z';
const GYRI = [
  'M180 180 C220 150 260 190 300 160',
  'M320 110 C350 90 400 120 430 95',
  'M470 120 C510 110 540 150 580 140',
  'M560 220 C600 210 620 250 640 240',
  'M150 260 C190 240 230 270 260 240',
  'M290 220 C330 190 380 230 420 200',
  'M450 200 C490 180 520 230 560 210',
  'M300 290 C340 270 380 290 420 270',
  'M460 290 C500 270 530 310 580 290',
  'M200 330 C260 300 360 305 430 350',
  'M520 385 C545 415 610 420 635 372',
  'M540 395 C560 405 600 405 620 385',
];
const Cervello: React.FC = () => (
  <Scene id="cervello" zoom={0.06}>
    {(lt) => {
      const t = lt + W.cervello[0];
      const draw = prog(t, W.cervello[0] + 0.4, W.cervello[0] + 1.8, E.inOut);
      const prot = prog(t, wt('a5', 17), wt('a5', 17) + 0.7);
      const pulse = 0.5 + 0.5 * Math.sin(t * 4);
      return (
        <>
          <Chapter n="02" title="Cervello" t0={W.cervello[0] + 0.15} />
          <Glow x={540} y={1130} r={520} o={0.22 + 0.25 * prot} />
          <Svg>
            <g transform="translate(120,800) scale(1.2)">
              <path d={BRAIN} fill="rgba(123,75,224,0.06)" stroke={INK} strokeWidth={4} strokeDasharray={2400} strokeDashoffset={2400 * (1 - draw)} />
              {GYRI.map((g, i) => (
                <path key={i} d={g} fill="none" stroke="rgba(243,239,232,.45)" strokeWidth={3} strokeLinecap="round" opacity={prog(t, W.cervello[0] + 1 + i * 0.08, W.cervello[0] + 1.5 + i * 0.08)} />
              ))}
              {/* tronco */}
              <path d="M470 410 C475 450 482 480 492 520" stroke={INK} strokeWidth={4} fill="none" opacity={draw} />
              {/* ippocampo */}
              <g opacity={prog(t, wt('a5', 7), wt('a5', 7) + 0.6)}>
                <path d="M330 345 C350 320 400 320 420 345 C435 365 420 380 400 372" fill="none" stroke={VIO2} strokeWidth={10 + 4 * prot} strokeLinecap="round" />
                <circle cx={375} cy={345} r={60 + 25 * prot * pulse} fill={VIO} opacity={0.18 + 0.2 * prot} />
                {prot > 0 && <circle cx={375} cy={345} r={95 + 16 * pulse} fill="none" stroke={VIO2} strokeWidth={3} opacity={0.6 * prot} strokeDasharray="10 12" />}
              </g>
            </g>
          </Svg>
          <Callout from={[570, 1214]} to={[700, 760]} text="memoria" t0={wt('a5', 17)} />
          <Counter to={55} t0={wt('a5', 5)} x={270} y={1390} prefix="over " label="anni" size={84} dur={0.01} />
          <Counter to={6} t0={wt('a5', 12)} x={800} y={1390} label="mesi di pesi" size={84} dur={0.01} color={VIO2} />
          <Source text="Broadhouse et al., NeuroImage: Clinical 2020" t0={W.cervello[0] + 0.6} />
        </>
      );
    }}
  </Scene>
);

const Umore: React.FC = () => (
  <Scene id="umore" zoom={0.05}>
    {(lt) => {
      const t = lt + W.umore[0];
      const g0 = wt('a6', 5);
      const line = prog(t, wt('a6', 11), wt('a6', 13) + 0.6, E.inOut);
      const pts = Array.from({length: 40}).map((_, i) => {
        const x = 140 + i * 20;
        const base = mix(1260, 1460, i / 39);
        const jitter = (rnd(i * 13) - 0.5) * 70 * (1 - i / 50);
        return [x, base + jitter] as const;
      });
      const shown = Math.floor(line * pts.length);
      return (
        <>
          <Chapter n="03" title="Umore" t0={W.umore[0] + 0.15} />
          <Svg>
            {Array.from({length: 33}).map((_, i) => {
              const col = i % 11;
              const row = Math.floor(i / 11);
              const x = 125 + col * 76;
              const y = 760 + row * 104;
              const p = prog(t, g0 + i * 0.035, g0 + i * 0.035 + 0.35, E.back);
              return (
                <g key={i} transform={`translate(${x + 28},${y + 38}) scale(${p}) translate(${-28},${-38})`} opacity={p}>
                  <rect x={0} y={0} width={56} height={76} rx={6} fill="rgba(243,239,232,.06)" stroke={VIO2} strokeWidth={2} />
                  {[0, 1, 2].map((k) => (
                    <rect key={k} x={10} y={14 + k * 16} width={36 - k * 8} height={5} rx={2} fill={LINE} />
                  ))}
                </g>
              );
            })}
            {/* sintomi in calo */}
            <polyline points={pts.slice(0, Math.max(2, shown)).map((p) => p.join(',')).join(' ')} fill="none" stroke={VIO2} strokeWidth={5} strokeLinejoin="round" strokeLinecap="round" opacity={line > 0 ? 1 : 0} />
            <line x1={130} y1={1500} x2={950} y2={1500} stroke={LINE} strokeWidth={2} opacity={line} />
          </Svg>
          <Counter to={33} t0={g0} x={540} y={1090} label="studi analizzati" size={100} dur={1.0} />
          <Kicker text="meno sintomi depressivi" t0={wt('a6', 11)} top={1520} size={48} color={VIO2} />
          <Source text="Gordon et al., JAMA Psychiatry 2018" t0={W.umore[0] + 0.6} />
        </>
      );
    }}
  </Scene>
);

const Card: React.FC<{n: string; title: string; t0: number; top: number}> = ({n, title, t0, top}) => {
  const t = useT();
  const p = prog(t, t0, t0 + 0.6);
  return (
    <div
      style={{
        position: 'absolute',
        left: 520,
        right: 60,
        top,
        padding: '26px 30px',
        borderRadius: 24,
        border: `1.5px solid ${p > 0 ? 'rgba(180,155,255,.45)' : 'transparent'}`,
        background: 'rgba(123,75,224,.16)',
        opacity: p,
        transform: `translateX(${(1 - p) * 40}px)`,
      }}
    >
      <div style={{fontFamily: SERIF, fontWeight: 600, fontSize: 64, color: VIO2, lineHeight: 1}}>{n}</div>
      <div style={{fontFamily: FONT, fontWeight: 700, fontSize: 36, color: INK, marginTop: 8, lineHeight: 1.15}}>{title}</div>
    </div>
  );
};
const Pratica: React.FC = () => (
  <Scene id="pratica" zoom={0.03}>
    {(lt) => {
      const t = lt + W.pratica[0];
      const d = smooth(cyc(lt, 2.6));
      const pose: Pose = {legL: [mix(-0.06, -0.45, d), mix(-0.02, 0.08, d)], legR: [mix(0.06, 0.45, d), mix(0.02, -0.08, d)], thigh: mix(1, 0.78, d), armL: [-0.1, -0.06], armR: [0.1, 0.06], bend: 0.04 * d};
      const plus = prog(t, wt('a7', 20), wt('a7', 20) + 0.5, E.back);
      return (
        <>
          <Kicker text="Da dove partire" t0={W.pratica[0] + 0.1} top={480} size={84} italic={false} />
          <Glow x={290} y={1200} r={460} o={0.3} />
          <Floor y={1560} />
          <Svg>
            <Person kind="girl" x={270} y={1550} s={1.12} pose={pose} hold={({L, R}) => (
              <>
                <Dumbbell cx={L[0] + 2} cy={L[1] + 18} s={0.9} />
                <Dumbbell cx={R[0] - 2} cy={R[1] + 18} s={0.9} />
              </>
            )} />
          </Svg>
          <Card n="01" title="2 sedute a settimana" t0={wt('a7', 3)} top={700} />
          <Card n="02" title="pochi esercizi fondamentali" t0={wt('a7', 7)} top={930} />
          <Card n="03" title="un carico che ti impegna davvero" t0={wt('a7', 11)} top={1160} />
          <div style={{position: 'absolute', left: 520, right: 60, top: 1420, textAlign: 'center', fontFamily: SERIF, fontStyle: 'italic', fontSize: 50, color: INK, opacity: plus, transform: `scale(${mix(0.8, 1, plus)})`}}>
            diventa facile? <span style={{color: VIO2, fontStyle: 'normal', fontWeight: 600}}>+ un poco</span>
          </div>
        </>
      );
    }}
  </Scene>
);

const Check: React.FC<{text: string; t0: number; top: number}> = ({text, t0, top}) => {
  const t = useT();
  const p = prog(t, t0, t0 + 0.5);
  const c = prog(t, t0 + 0.15, t0 + 0.6, E.inOut);
  return (
    <div style={{position: 'absolute', left: 120, right: 80, top, display: 'flex', alignItems: 'center', gap: 28, opacity: p, transform: `translateX(${(1 - p) * -30}px)`}}>
      <svg width={64} height={64} viewBox="0 0 64 64">
        <circle cx={32} cy={32} r={29} fill="none" stroke={VIO2} strokeWidth={3} />
        <path d="M19 33 L28 42 L46 23" fill="none" stroke={VIO2} strokeWidth={5} strokeLinecap="round" strokeLinejoin="round" strokeDasharray={44} strokeDashoffset={44 * (1 - c)} />
      </svg>
      <div style={{fontFamily: FONT, fontWeight: 700, fontSize: 44, color: INK}}>{text}</div>
    </div>
  );
};
const Fiducia: React.FC = () => (
  <Scene id="fiducia" zoom={0.04}>
    {(lt) => {
      const d = smooth(cyc(lt, 2.8));
      const pose: Pose = {legL: [mix(-0.06, -0.45, d), mix(-0.02, 0.08, d)], legR: [mix(0.06, 0.45, d), mix(0.02, -0.08, d)], thigh: mix(1, 0.78, d), armL: [-0.1, -0.06], armR: [0.1, 0.06], bend: 0.04 * d};
      return (
        <>
          <Kicker text="Il metodo" t0={W.fiducia[0] + 0.1} top={470} size={46} color={VIO2} />
          <Kicker text="RF Coaching" t0={W.fiducia[0] + 0.25} top={525} size={96} italic={false} />
          <Check text="Carico giusto per il tuo livello" t0={wt('a8', 9)} top={720} />
          <Check text="Tecnica sotto controllo" t0={wt('a8', 16)} top={830} />
          <Check text="Progressi misurati" t0={wt('a8', 20)} top={940} />
          <Glow x={540} y={1360} r={520} o={0.3} />
          <Floor y={1650} />
          <Svg>
            <Person kind="riky" x={330} y={1640} s={0.88} pose={{armL: [0.25, 2.1], armR: [0.45, 1.9], mouth: Math.abs(Math.sin(lt * 9)) * 0.6}} hold={({L}) => <Clipboard x={L[0] + 6} y={L[1] + 20} />} />
            <Person kind="girl" x={770} y={1640} s={0.88} pose={pose} hold={({L, R}) => (
              <>
                <Dumbbell cx={L[0] + 2} cy={L[1] + 18} s={0.85} />
                <Dumbbell cx={R[0] - 2} cy={R[1] + 18} s={0.85} />
              </>
            )} />
          </Svg>
        </>
      );
    }}
  </Scene>
);

const Cta: React.FC = () => (
  <Scene id="cta" zoom={0.03}>
    {(lt) => {
      const t = lt + W.cta[0];
      const wave = Math.sin(lt * 7) * 0.25;
      const box = prog(t, wt('a9', 6) - 0.1, wt('a9', 6) + 0.4, E.back);
      return (
        <>
          <Glow x={540} y={1150} r={600} o={0.4} />
          <Kicker text="Da dove parti tu?" t0={W.cta[0] + 0.2} top={500} size={84} italic={false} />
          <Floor y={1460} />
          <Svg>
            <Person kind="riky" x={540} y={1450} s={1.08} pose={{armR: [2.45 + wave * 0.3, 2.95 + wave], armL: [-0.08, -0.03], mouth: lt < 3.3 ? Math.abs(Math.sin(lt * 9)) * 0.7 : 0}} />
          </Svg>
          <div style={{position: 'absolute', left: 90, right: 90, top: 1500, textAlign: 'center', opacity: box, transform: `scale(${mix(0.85, 1, box)})`}}>
            <div style={{display: 'inline-block', padding: '24px 46px', borderRadius: 999, background: VIO, boxShadow: '0 20px 60px rgba(123,75,224,.45)'}}>
              <span style={{fontFamily: FONT, fontWeight: 700, fontSize: 44, color: '#fff'}}>Scrivimi </span>
              <span style={{fontFamily: FONT, fontWeight: 900, fontSize: 52, color: '#fff', letterSpacing: 3}}>ANALISI</span>
              <span style={{fontFamily: FONT, fontWeight: 700, fontSize: 44, color: '#fff'}}> in DM</span>
            </div>
            <div style={{fontFamily: FONT, fontWeight: 600, fontSize: 32, color: MUTED, marginTop: 26}}>@riccardofalconi_coach</div>
          </div>
        </>
      );
    }}
  </Scene>
);

/* ------------------------------------------------------------------ composizione */
const Overlay: React.FC = () => {
  const f = useCurrentFrame();
  const o = Math.floor(f / 2);
  return (
    <>
      <AbsoluteFill style={{background: 'radial-gradient(ellipse 80% 70% at 50% 50%, transparent 55%, rgba(0,0,0,.65) 100%)', pointerEvents: 'none'}} />
      <AbsoluteFill
        style={{
          backgroundImage: `url(${staticFile('grain.png')})`,
          backgroundSize: '256px 256px',
          backgroundPosition: `${rnd(o) * 256}px ${rnd(o + 7) * 256}px`,
          opacity: 0.07,
          mixBlendMode: 'screen',
          pointerEvents: 'none',
        }}
      />
    </>
  );
};
const Brand: React.FC = () => {
  const t = useT();
  const p = prog(t, END23P - 6, END23P);
  return (
    <>
      <div style={{position: 'absolute', left: 70, top: 120, fontFamily: FONT, fontWeight: 800, fontSize: 24, letterSpacing: 6, color: 'rgba(243,239,232,.5)'}}>
        RF <span style={{color: VIO2}}>COACHING</span>
      </div>
      <div style={{position: 'absolute', left: 70, right: 70, top: 168, height: 3, background: 'rgba(243,239,232,.1)', borderRadius: 2}}>
        <div style={{width: `${(t / END23P) * 100}%`, height: '100%', background: VIO, borderRadius: 2, opacity: 1 - p}} />
      </div>
    </>
  );
};

export const Video23Premium: React.FC = () => (
  <AbsoluteFill style={{background: BG}}>
    <FontFaces />
    <AbsoluteFill style={{background: 'radial-gradient(ellipse 90% 60% at 50% 45%, #1A1426 0%, #0C0A10 70%)'}} />
    <Hook />
    <Futuro />
    <Ossa />
    <Ossa2 />
    <Cervello />
    <Umore />
    <Pratica />
    <Fiducia />
    <Cta />
    <TopCaption />
    <Brand />
    <Overlay />
    <Audio src={staticFile('soundtrack23.wav')} />
  </AbsoluteFill>
);
