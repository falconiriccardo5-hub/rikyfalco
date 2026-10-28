/** Reel «Squat: 3 errori» — cartone animato 2D: personaggi dalle tavole 2D originali (deformate su scheletro), studio illustrato. */
import React from 'react';
import {AbsoluteFill, Audio, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {C, E, FONT, OUT, mix, prog, useT} from '../brand';
import {Grain, cardStyle} from '../ui';
import {Captions, CapLine} from '../Captions';
import {Transitions, Tr} from '../Transitions';
import {Stage, ToonChar} from './Stage';
import {apply, ArmP, Cam, camAff, GOBLET, HAND_BACK, ProfPose, StandPose} from './engine';
import {makeTiming, VT} from '../v13/reel';
import {repH, Tag, StepCard, Headline, KeywordCTA, Handle, Sparkles, Burst} from '../v13/kit';
import timing from '../voice20_timing.json';
import envR from '../voice20_env_r.json';
import envG from '../voice20_env_g.json';

const SL = ['s01', 's02', 's03', 's04', 'q05', 'q06', 'q07', 's08', 's09', 's10', 's11', 's12', 'q15', 'q16'];
const T = makeTiming(timing as (VT & {who: string})[], SL, 64);
export const DURATION22 = T.DURATION;
const {W, wd, v} = T;
const ER = envR as number[];
const EG = envG as number[];

/* ------------------------------------------------------------------ inquadrature 2D (coordinate dello studio 1536x1024) */
const G0: [number, number] = [470, 850];
const R0: [number, number] = [700, 838];
const SC = 0.27;
const CAM: Record<string, Cam> = {
  wide: {cx: 600, cy: 595, h: 1000},
  two: {cx: 590, cy: 642, h: 800},
  girl: {cx: 500, cy: 597, h: 520},
  riky: {cx: 700, cy: 585, h: 520},
  side: {cx: 475, cy: 659, h: 720},
  sideClose: {cx: 470, cy: 700, h: 600},
  feet: {cx: 500, cy: 770, h: 450},
};
const mixCam = (a: Cam, b: Cam, p: number): Cam => ({cx: mix(a.cx, b.cx, p), cy: mix(a.cy, b.cy, p), h: mix(a.h, b.h, p)});
const dolly = (a: Cam, k = 0.06): Cam => ({...a, h: a.h * (1 - k)});

/* ------------------------------------------------------------------ pose */
const blinkAt = (t: number, seed: number) => {
  const ph = (t + seed) % 3.4;
  return ph < 0.14 ? 1 - Math.abs(ph - 0.07) / 0.07 : 0;
};
type State = {cam: Cam; chars: ToonChar[]; bellFloor?: boolean};

const sceneAt = (t: number, fr: number): State => {
  const tg = Math.min(1, (EG[fr] ?? 0) * 1.3);
  const tr = Math.min(1, (ER[fr] ?? 0) * 1.3);
  const s = SL.find((k) => t >= W[k][0] && t < W[k][1]) ?? SL[SL.length - 1];
  const [a, b] = W[s];
  const lp = prog(t, a, b, E.lin);
  const gb = blinkAt(t, 0.7);
  const rb = blinkAt(t, 2.1);
  const br = Math.sin(t * 2.2) * 4;
  const nod = Math.sin(t * 1.7) * 0.03;
  const w = wd(s);
  // ragazza
  const gProf = (p: ProfPose, extra: Partial<ToonChar> = {}): ToonChar => ({id: 'g', rig: 'gprof', x: G0[0], y: G0[1], s: SC, prof: {breath: br, ...GOBLET, ...p}, bell: {}, mouth: tg, blink: gb, ...extra});
  const gTq = (p: StandPose = {}, extra: Partial<ToonChar> = {}): ToonChar => ({id: 'g', rig: 'gtq', x: G0[0], y: G0[1], s: SC, stand: {head: nod * 0.8, bob: br * 0.5, ...p}, mouth: tg, blink: gb, ...extra});
  // Riccardo
  const rTq = (p: StandPose = {}, extra: Partial<ToonChar> = {}): ToonChar => ({id: 'r', rig: 'rtq', x: R0[0], y: R0[1], s: SC, flip: true, stand: {head: nod, bob: br * 0.5, ...p}, mouth: tr, blink: rb, ...extra});
  const rFr = (p: StandPose = {}, extra: Partial<ToonChar> = {}): ToonChar => ({id: 'r', rig: 'rfront', x: R0[0], y: R0[1], s: SC, stand: {head: nod, bob: br * 0.5, ...p}, mouth: tr, blink: rb, ...extra});
  const WAG = (): ArmP => [-0.3, -2.45 + Math.sin(t * 11) * 0.22];
  const WAVE = (): ArmP => [-2.35, -0.35 + Math.sin(t * 9) * 0.35];
  const OPEN: ArmP = [-0.55, -1.0];
  const FILM: ArmP = [-0.95, -0.85];
  switch (s) {
    case 's01': {
      const stop = prog(t, w[5] - 0.2, w[6]);
      const sq = repH(t, a, 1.7, 0.03, 0.9) * (1 - stop);
      const back = prog(t, w[6], w[8]);
      const g = back > 0.05 ? gProf({...HAND_BACK, head: 0.06}, {bell: undefined, fx: {lumbar: back * (0.75 + 0.25 * Math.sin(t * 9))}}) : gProf({sq, heel: 0.3 * sq, wink: 0.6 * sq}, {fx: {lumbar: 0.6 * sq}});
      return {cam: mixCam(CAM.wide, CAM.two, prog(t, a, b, E.inOut)), chars: [rTq({}, {mouth: 0}), g], bellFloor: back > 0.05};
    }
    case 's02':
      return {cam: dolly(CAM.riky, 0.08 * lp), chars: [gTq({}, {mouth: 0}), rFr({R: WAG()})], bellFloor: true};
    case 's03':
      return {cam: dolly(CAM.girl, 0.08 * lp), chars: [rTq({}, {mouth: 0}), gTq({head: -0.05 + nod})], bellFloor: true};
    case 's04':
      return {cam: dolly(CAM.two, 0.06 * lp), chars: [rTq({L: [0.45, -0.9], R: [-0.45, -0.9]}), gTq({head: 0.05}, {mouth: 0})], bellFloor: true};
    case 'q05':
      return {cam: dolly(CAM.riky, 0.1 * lp), chars: [gTq({}, {mouth: 0}), rFr({R: WAG(), head: Math.sin(t * 7) * 0.06})], bellFloor: true};
    case 'q06': {
      const sq = repH(t, a + 0.1, 2.2, 0.03, 0.95);
      return {cam: mixCam(CAM.side, CAM.sideClose, prog(t, a, b, E.inOut)), chars: [gProf({sq, heel: 0.3 * sq, wink: 0.8 * Math.max(0, sq - 0.6) / 0.4}, {mouth: 0, fx: {lumbar: prog(t, w[13], w[15]) * sq, legs: (1 - prog(t, w[13], w[15])) * 0.6 * prog(t, w[11] - 0.2, w[11])}})]};
    }
    case 'q07': {
      const step = prog(t, w[2] - 0.1, w[4], E.inOut) + prog(t, w[6], w[8], E.inOut);
      const sq = repH(t, a, 1.9, 0.03, 0.9);
      return {cam: dolly(CAM.side, 0.1 * lp), chars: [gProf({sq, heel: 0.2 * sq, wink: (0.5 * sq * step) / 2}, {mouth: 0, bell: {scale: 1 + 0.22 * step, color: step > 1.2 ? 'yellow' : 'teal'}, fx: {lumbar: (step / 2) * sq}})]};
    }
    case 's08': {
      const up = prog(t, a + 0.1, a + 0.6, E.inOut);
      return {cam: dolly(CAM.two, 0.05 * lp), chars: [rTq({R: [FILM[0] * up, FILM[1] * up]}, {phone: up > 0.3 ? 'R' : undefined}), gTq({}, {mouth: 0})], bellFloor: true};
    }
    case 's09': {
      const fix = prog(t, w[11] - 0.1, w[11] + 0.4);
      const sq = repH(t, a + 0.1, 2.2, 0.03, 0.9);
      return {cam: mixCam(CAM.feet, dolly(CAM.side, 0.2), prog(t, w[6] - 0.2, w[8] + 0.2, E.inOut) * (1 - fix)), chars: [gProf({sq, heel: (1 - fix) * Math.min(0.45, sq * 0.6), lean: 0.6 * sq + (1 - fix) * 0.35 * sq}, {mouth: 0, fx: {legs: fix * 0.6 * sq}})]};
    }
    case 's10': {
      const fix = prog(t, w[7] - 0.1, w[7] + 0.4);
      const sq = repH(t, a + 0.1, 2.3, 0.03, mix(1.0, 0.72, fix));
      const wk = (1 - fix) * Math.max(0, (sq - 0.7) / 0.3);
      return {cam: dolly(CAM.sideClose, 0.05 * lp), chars: [gProf({sq, wink: wk}, {mouth: 0, fx: {lumbar: wk}})]};
    }
    case 's11': {
      const air = prog(t, w[4] - 0.1, w[5] + 0.3);
      const brace = prog(t, w[7] - 0.1, w[8] + 0.2);
      const sq = t > w[8] + 0.2 ? repH(t, w[8] + 0.2, 2.2, 0.03, 0.82) : 0.03;
      return {cam: dolly(CAM.side, 0.05 * lp), chars: [gProf({sq, breath: br - 10 * air * (1 - brace * 0.5)}, {mouth: air > 0 && air < 1 ? 0.3 : 0, fx: {brace}})]};
    }
    case 's12': {
      const sq = repH(t, a, 2.0, 0.03, 0.85);
      return {cam: mixCam(CAM.two, CAM.side, 0.25 + 0.2 * lp), chars: [rTq({head: 0.05 + Math.sin(t * 5) * 0.04, R: OPEN}, {mouth: 0}), gProf({sq}, {fx: {legs: 0.7, brace: 0.5}})]};
    }
    case 'q15':
      return {cam: dolly(CAM.riky, 0.06 * lp), chars: [gTq({}, {mouth: 0}), rFr({R: [-0.45, -2.25]}, {phone: 'R', phoneScreen: true})], bellFloor: true};
    default:
      return {cam: dolly(CAM.riky, 0.12 * lp), chars: [gTq({}, {mouth: 0}), rFr({R: WAVE()})], bellFloor: true};
  }
};

const World2D: React.FC = () => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const st = sceneAt(f / fps, f);
  return <Stage cam={st.cam} chars={st.chars} props={st.bellFloor ? [{src: 'toon/kb_teal.png', x: G0[0] + 95, y: G0[1] + 18, w: 62}] : []} />;
};

/* ------------------------------------------------------------------ overlay 2D */
const at = (s: string, p: [number, number]) => {
  const t0 = W[s][0];
  return apply(camAff(sceneAt(t0 + 0.5, Math.round((t0 + 0.5) * 30)).cam), p);
};

const Overlays: React.FC = () => {
  const t = useT();
  const s = SL.find((k) => t >= W[k][0] && t < W[k][1]) ?? SL[SL.length - 1];
  const [a] = W[s];
  const w = wd(s);
  switch (s) {
    case 's01':
      return <Headline t0={0.15} lines={[{text: 'SQUAT'}, {text: 'MAL DI SCHIENA?', color: C.red}]} top={150} size={100} />;
    case 's02':
      return <Headline t0={w[2] - 0.1} lines={[{text: 'IL PROBLEMA'}, {text: 'NON È LO SQUAT', color: C.blue}]} top={150} size={92} />;
    case 's03':
      return (
        <>
          <Tag t0={w[3]} at={[300, 520]} to={at('s03', [440, 650])} text="TIRA IN BASSO" bg={C.red} fg="#fff" size={44} />
          <Tag t0={w[9]} at={[540, 300]} text="IL GIORNO DOPO: RIGIDA 😣" size={44} />
        </>
      );
    case 's04':
      return (
        <>
          <Tag t0={w[2]} at={[300, 330]} text="− PESO" size={56} rot={-4} />
          <Tag t0={w[6]} at={[740, 470]} text="NIENTE SQUAT" icon="no" size={50} rot={3} />
        </>
      );
    case 'q05':
      return <Headline t0={w[1] - 0.1} lines={[{text: 'EVITARLO'}, {text: 'NON RISOLVE', color: C.red}]} top={150} size={96} />;
    case 'q06':
      return (
        <>
          <StepCard n="3" title="errori di tecnica" t0={w[6] - 0.1} bad sub="spostano il carico sulla schiena" />
          <Tag t0={w[13] - 0.1} at={[780, 1250]} text="GAMBE" bg={C.blue} fg="#fff" size={44} />
          <Tag t0={w[15] - 0.1} at={[260, 760]} text="SCHIENA" bg={C.red} fg="#fff" size={44} />
        </>
      );
    case 'q07': {
      const step = prog(t, w[2] - 0.1, w[4], E.inOut) + prog(t, w[6], w[8], E.inOut);
      return (
        <div style={{position: 'absolute', left: 60, right: 60, top: 96, ...cardStyle('#fff', 10), padding: '18px 30px', fontFamily: FONT}}>
          <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'baseline'}}>
            <span style={{fontWeight: 900, fontSize: 40, color: C.ink}}>KETTLEBELL</span>
            <span style={{fontWeight: 900, fontSize: 92, color: C.ink, letterSpacing: -2}}>{Math.round(12 + step * 6)} KG</span>
          </div>
          <div style={{fontWeight: 900, fontSize: 34, color: C.red, marginTop: 8}}>CARICO SULLA SCHIENA</div>
          <div style={{height: 44, borderRadius: 22, border: `${OUT}px solid ${C.ink}`, marginTop: 8, overflow: 'hidden', background: '#F1EEF8'}}>
            <div style={{width: `${20 + step * 40}%`, height: '100%', background: C.red}} />
          </div>
        </div>
      );
    }
    case 's08': {
      const ph = prog(t, w[3] - 0.15, w[3] + 0.25, E.back);
      const items = ['Piedi', 'Bacino', 'Tronco'];
      return (
        <>
          <div style={{position: 'absolute', left: 60, right: 60, top: 160, display: 'flex', gap: 18, justifyContent: 'center'}}>
            {items.map((it, i) => {
              const p = prog(t, a + 0.3 + i * 0.18, a + 0.6 + i * 0.18, E.back);
              return (
                <div key={i} style={{transform: `scale(${p})`, ...cardStyle('#fff', 8), padding: '10px 22px', fontFamily: FONT, fontWeight: 900, fontSize: 44, color: C.ink, display: 'flex', alignItems: 'center', gap: 12}}>
                  <span style={{width: 40, height: 40, borderRadius: 10, border: `${OUT - 1}px solid ${C.ink}`, display: 'inline-block'}} />
                  {it}
                </div>
              );
            })}
          </div>
          <div style={{position: 'absolute', left: 60, top: 330, transform: `scale(${ph})`, transformOrigin: '0 50%', display: 'flex', alignItems: 'center', gap: 12, fontFamily: FONT, fontWeight: 900, fontSize: 38, color: '#fff', background: C.ink, borderRadius: 999, padding: '8px 22px'}}>
            <span style={{width: 24, height: 24, borderRadius: 12, background: C.red, opacity: Math.sin(t * 8) > 0 ? 1 : 0.3}} />
            REC · DI LATO
          </div>
        </>
      );
    }
    case 's09': {
      const fix = t > w[11] - 0.1;
      return fix ? (
        <>
          <StepCard n="1" title="Tutto il piede a terra" t0={w[11] - 0.1} sub="talloni giù, peso su tutto il piede" />
          <Tag t0={w[14] - 0.1} at={[540, 1200]} text="PIEDE APPOGGIATO" icon="ok" size={46} />
        </>
      ) : (
        <>
          <StepCard n="1" title="Talloni che si alzano" t0={a + 0.05} bad />
          <Tag t0={w[2]} at={at('s09', [440, 800])} text="TALLONI SU" icon="no" size={46} />
          <Tag t0={w[7] - 0.05} at={[760, 560]} text="BUSTO IN AVANTI" bg={C.red} fg="#fff" size={40} />
        </>
      );
    }
    case 's10': {
      const fix = t > w[7] - 0.1;
      return fix ? (
        <>
          <StepCard n="2" title="Scendi finché la schiena è neutra" t0={w[7] - 0.1} />
          <Tag t0={w[9]} at={[800, 980]} text="FIN QUI" bg={C.blue} fg="#fff" size={50} />
          <Tag t0={w[13]} at={[300, 640]} text="SCHIENA NEUTRA" icon="ok" size={42} />
        </>
      ) : (
        <>
          <StepCard n="2" title="Il bacino si arrotonda" t0={a + 0.05} bad sub="in fondo al movimento" />
          <Tag t0={w[4]} at={[300, 640]} text="LOMBARE IN TENSIONE" bg={C.red} fg="#fff" size={38} />
        </>
      );
    }
    case 's11':
      return (
        <>
          <StepCard n="3" title="Blocca il tronco" t0={a + 0.05} sub="aria → addome stretto → scendi" />
          <Tag t0={w[4]} at={[790, 520]} text="1. ARIA" size={46} />
          <Tag t0={w[7]} at={[300, 1150]} text="2. ADDOME STRETTO" bg={C.blue} fg="#fff" size={40} />
          <Tag t0={w[8] + 0.3} at={[800, 1250]} text="3. SCENDI" size={46} />
        </>
      );
    case 's12':
      return (
        <>
          <Tag t0={w[4] - 0.1} at={[760, 1180]} text="GAMBE AL LAVORO" bg={C.blue} fg="#fff" size={44} />
          <Tag t0={w[9] - 0.1} at={[300, 520]} text="SCHIENA PROTETTA" icon="ok" size={42} />
          <Sparkles t0={w[0]} x={420} y={760} n={12} />
        </>
      );
    case 'q15': {
      const rows: {ic: string; txt: string; at: number}[] = [
        {ic: '▶', txt: 'Guardo il tuo video', at: w[8]},
        {ic: '◎', txt: 'Un dettaglio alla volta', at: w[11]},
        {ic: '↗', txt: 'Misuriamo i progressi', at: w[17]},
      ];
      return (
        <div style={{position: 'absolute', left: 60, right: 60, top: 140, display: 'flex', flexDirection: 'column', gap: 18}}>
          <div style={{fontFamily: FONT, fontWeight: 900, fontSize: 58, color: C.ink, letterSpacing: -1, WebkitTextStroke: '8px #fff', paintOrder: 'stroke fill'}}>
            COSÌ LAVORO <span style={{color: C.blue}}>CON I MIEI CLIENTI</span>
          </div>
          {rows.map((r, i) => {
            const p = prog(t, r.at - 0.1, r.at + 0.25, E.back);
            return (
              <div key={i} style={{transform: `translateX(${(1 - p) * -300}px)`, opacity: p, ...cardStyle('#fff', 8), padding: '14px 22px', display: 'flex', alignItems: 'center', gap: 18, fontFamily: FONT, fontWeight: 900, fontSize: 40, color: C.ink, alignSelf: 'flex-start'}}>
                <span style={{width: 62, height: 62, borderRadius: 18, background: C.blue, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 36, border: `${OUT - 1}px solid ${C.ink}`}}>{r.ic}</span>
                {r.txt}
              </div>
            );
          })}
        </div>
      );
    }
    default:
      return (
        <>
          <KeywordCTA t0={w[6] - 0.1} word="ANALISI" />
          <Handle t0={w[9]} top={720} />
          <Sparkles t0={w[7]} x={540} y={400} n={14} />
        </>
      );
  }
};

/* ------------------------------------------------------------------ sottotitoli */
const buildCaps = (): CapLine[] => {
  const meta: Record<string, number[]> = {
    s01: [5, 8, 10],
    s02: [3, 6],
    s03: [4, 9, 13],
    s04: [2, 6],
    q05: [1, 3],
    q06: [6, 7, 13, 15],
    q07: [2, 7],
    s08: [4, 6],
    s09: [2, 4, 11, 14],
    s10: [4, 6, 7, 14],
    s11: [5, 7, 8],
    s12: [4, 7, 9],
    q15: [8, 11, 17],
    q16: [7],
  };
  const DISPLAY: Record<string, string> = {q16: 'Vuoi che guardi il tuo squat? Scrivimi ANALISI in privato.'};
  const lines = Object.entries(meta)
    .map(([slot, hl]) => {
      const x = v(slot) as VT & {who?: string};
      const g = x.who === 'G';
      return {t0: x.words[0] - 0.12, t1: x.t1 + 0.35, text: DISPLAY[slot] ?? x.text, hl, times: x.words, bottom: 110, wrapAt: 19, fs: 50, bg: g ? C.ink : '#fff', fg: g ? C.cream : C.ink, hlBg: g ? '#EE6A55' : C.blue} as CapLine;
    })
    .sort((p, q) => p.t0 - q.t0);
  lines.forEach((l, i) => {
    const nx = lines[i + 1];
    if (nx) l.t1 = Math.min(l.t1, nx.t0 - 0.03);
    l.t1 = Math.min(l.t1, T.END - 0.05);
  });
  return lines;
};
const CAPS = buildCaps();

const TT: Tr['type'][] = ['wipeR', 'iris', 'wipeL', 'stripes', 'wipeU', 'wipeR', 'iris', 'wipeL', 'wipeR', 'wipeU', 'iris', 'stripes', 'wipeR'];
const TC = [C.blue, C.ink, C.blue, C.red, C.ink, C.red, C.blue, C.ink, C.blue, C.ink, C.blue, C.ink, C.blue];
// tagli netti dove la camera resta coerente (dialogo), transizioni grafiche sui cambi di blocco
const TRANS: Tr[] = SL.slice(1)
  .map((s, i) => ({t: W[s][0], type: TT[i], color: TC[i]}))
  .filter((_, i) => [0, 3, 4, 6, 7, 10, 11].includes(i));

export const Video22: React.FC = () => (
  <AbsoluteFill style={{background: '#EADBC6', fontFamily: FONT}}>
    <style>{`
      @font-face{font-family:'Inter';font-weight:900;src:url(${staticFile('fonts/Inter-Black.otf')});}
      @font-face{font-family:'Inter';font-weight:800;src:url(${staticFile('fonts/Inter-ExtraBold.otf')});}
      @font-face{font-family:'Inter';font-weight:700;src:url(${staticFile('fonts/Inter-Bold.otf')});}
    `}</style>
    <World2D />
    <Overlays />
    <Captions lines={CAPS} />
    <Transitions list={TRANS} />
    <Grain />
    <Audio src={staticFile('soundtrack20.wav')} />
  </AbsoluteFill>
);
export {Burst, mix};
