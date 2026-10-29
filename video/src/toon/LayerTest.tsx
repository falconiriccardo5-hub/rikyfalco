/** Prova (≈7 s) dei personaggi a livelli: hook del reel squat con ragazza (profilo) e Riccardo (tre quarti). */
import React from 'react';
import {AbsoluteFill, Audio, staticFile, useCurrentFrame} from 'remotion';
import {C, FONT} from '../brand';
import {Captions, CapLine} from '../Captions';
import {Headline} from '../v13/kit';
import {Grain} from '../ui';
import {Cam, LStage, ProfPose, TqPose, Who} from './layered';
import timing from '../voice20_timing.json';
import envR from '../voice20_env_r.json';
import envG from '../voice20_env_g.json';

export const LAYER_TEST_DUR = Math.round(6.7 * 30);
type VT = {slot: string; text: string; t0: number; t1: number; words: number[]; who: string};
const TM = timing as VT[];
const line = (s: string) => TM.find((x) => x.slot === s)!;

/* ------------------------------------------------------------------ curve */
const clamp = (x: number) => Math.max(0, Math.min(1, x));
export const EZ = {
  io: (x: number) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2),
  out: (x: number) => 1 - Math.pow(1 - x, 3),
  in: (x: number) => x * x * x,
  back: (x: number) => {
    const c1 = 1.70158;
    const c3 = c1 + 1;
    return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2);
  },
};
/** traccia a chiavi [tempo, valore, curva verso la chiave successiva] */
export const tk = (t: number, keys: [number, number, ((x: number) => number)?][]) => {
  if (t <= keys[0][0]) return keys[0][1];
  for (let i = 0; i < keys.length - 1; i++) {
    const [t0, v0, e] = keys[i];
    const [t1, v1] = keys[i + 1];
    if (t <= t1) return v0 + (v1 - v0) * (e ?? EZ.io)(clamp((t - t0) / (t1 - t0)));
  }
  return keys[keys.length - 1][1];
};

/* ------------------------------------------------------------------ lip-sync: lettere -> visemi */
const VOW: Record<string, string> = {a: 'a', à: 'a', e: 'e', è: 'e', é: 'e', i: 'i', ì: 'i', o: 'o', ò: 'o', u: 'u', ù: 'u', m: 'mbp', b: 'mbp', p: 'mbp', f: 'fv', v: 'fv'};
const visemeAt = (slot: string, t: number, env: number): string => {
  const L = line(slot);
  const words = L.text.replace(/[^\p{L}\s']/gu, '').split(/\s+/).filter(Boolean);
  for (let i = 0; i < L.words.length; i++) {
    const s = L.words[i];
    const e = Math.min(i + 1 < L.words.length ? L.words[i + 1] : L.t1, s + 0.7);
    if (t >= s && t < e) {
      const seq = [...(words[i] ?? '').toLowerCase()].map((c) => VOW[c]).filter(Boolean);
      if (!seq.length) return 'e';
      const k = Math.min(seq.length - 1, Math.floor(((t - s) / (e - s)) * seq.length));
      const v = seq[k];
      return env < 0.06 && v !== 'mbp' ? 'rest' : v;
    }
  }
  return 'rest';
};

/* ------------------------------------------------------------------ scena */
const G0: [number, number] = [470, 850];
const R0: [number, number] = [700, 838];
const SC = 0.27;
const blink = (t: number, at: number[]): 0 | 1 | 2 => {
  for (const b of at) {
    const d = t - b;
    if (d >= 0 && d < 0.05) return 1;
    if (d >= 0.05 && d < 0.11) return 2;
    if (d >= 0.11 && d < 0.16) return 1;
  }
  return 0;
};

const girlPose = (t: number): ProfPose => {
  const sq = tk(t, [[0, 0.02], [0.3, 0.02], [1.3, 1.0], [1.5, 1.0], [2.4, 0.02, EZ.out], [6, 0.02]]);
  const heel = tk(t, [[0, 0], [1.05, 0], [1.3, 0.3], [1.5, 0.3], [1.8, 0]]);
  const wink = tk(t, [[0, 0], [1.15, 0], [1.35, 0.7], [1.5, 0.7], [1.8, 0]]);
  // dopo la ripetizione: fastidio alla schiena, si incurva un poco tenendo il kettlebell
  const hunch = tk(t, [[0, 0], [2.4, 0], [2.9, 1, EZ.back], [6, 1]]);
  return {sq, heel, wink, lean: 0.6 * sq + 0.12 * hunch, ua: -0.35 - 0.05 * hunch, fa: -2.2, ha: 0.05 * Math.sin(t * 3)};
};

export const LayerTest: React.FC = () => {
  const f = useCurrentFrame();
  const t = f / 30;
  const shot2 = t >= 3.55;
  // ----- ragazza
  const gp = girlPose(t);
  const gPrev = girlPose(t - 0.12);
  const lean = (p: ProfPose) => (p.lean ?? 0.6 * (p.sq ?? 0)) - (p.wink ?? 0) * 0.25;
  gp.pony = 0.9 * (lean(gPrev) - lean(gp)) + 0.25 * ((gPrev.sq ?? 0) - (gp.sq ?? 0)) + 0.03 * Math.sin(t * 2.1);
  gp.head = 0.04 * Math.sin(t * 4.2) * clamp(((envG as number[])[f] ?? 0) * 4);
  const pain = tk(t, [[0, 0], [1.2, 0], [1.5, 0.7], [2.6, 0.8], [3.0, 1]]);
  const gEnv = (envG as number[])[f] ?? 0;
  const girl: Who = {
    id: 'g', rig: 'gprof', x: G0[0], y: G0[1], s: SC, prof: gp,
    bell: {},
    mouth: t > 3.42 ? (pain > 0.5 ? 'pain' : 'rest') : visemeAt('s01', t, gEnv),
    lid: pain > 0.6 && t > 2.6 ? 1 : blink(t, [0.9, 4.6]),
    glow: {lumbar: pain * (0.75 + 0.25 * Math.sin(t * 9))},
  };
  // ----- Riccardo
  const rEnv = (envR as number[])[f] ?? 0;
  // braccio vicino: indice alzato su «Tranquilla», poi torna giù
  const pointK: [number, number, ((x: number) => number)?][] = [[0, 0], [3.62, 0], [3.72, -0.08], [4.02, 1, EZ.back], [4.55, 1], [5.0, 0, EZ.io]];
  // braccio verso di lei: mano aperta su «il problema non è lo squat»
  const openK: [number, number, ((x: number) => number)?][] = [[0, 0], [4.5, 0], [4.6, -0.08], [4.95, 1, EZ.back], [5.85, 1], [6.5, 0.15]];
  const pt = tk(t, pointK);
  const ptLag = tk(t - 0.07, pointK);
  const op = tk(t, openK);
  const opLag = tk(t - 0.07, openK);
  const wag = pt > 0.6 ? Math.sin(t * 13) * 0.2 * pt : 0;
  const tq: TqPose = {
    L: [0.04 - 0.36 * pt + Math.sin(t * 1.3) * 0.02, -2.35 * ptLag, wag],
    R: [-0.95 * op + Math.sin(t * 1.3 + 1) * 0.02, 0.02 - 0.75 * opLag, -0.25 * op],
    head: tk(t, [[0, 0], [2.5, 0], [2.9, 0.06], [3.6, 0.03], [4.7, -0.05, EZ.back], [5.4, 0.02], [6.4, 0.04]]) + 0.035 * Math.sin(t * 5) * clamp(rEnv * 4),
    bob: Math.sin(t * 2.2) * 3,
    lean: tk(t, [[0, 0], [4.6, 0], [4.95, -0.035, EZ.back], [6.2, 0]]),
  };
  const riky: Who = {
    id: 'r', rig: 'rtq', x: R0[0], y: R0[1], s: SC, flip: true, tq,
    handL: pt > 0.7 ? 'point' : 'art',
    handR: op > 0.4 ? 'open' : 'art',
    mouth: shot2 ? visemeAt('s02', t, rEnv) : 'rest',
    lid: blink(t, [1.6, 3.3, 5.5]),
  };
  const cam: Cam = shot2 ? {cx: 655, cy: 615, h: 570 - (t - 3.55) * 8} : {cx: 590, cy: 640, h: 800 - t * 10};
  const caps: CapLine[] = (['s01', 's02'] as const).map((s) => {
    const x = line(s);
    const g = x.who === 'G';
    return {t0: x.words[0] - 0.12, t1: s === 's01' ? 3.6 : 6.6, text: x.text, hl: s === 's01' ? [5, 8, 10] : [3, 6], times: x.words, bottom: 110, wrapAt: 19, fs: 50, bg: g ? C.ink : '#fff', fg: g ? C.cream : C.ink, hlBg: g ? '#EE6A55' : C.blue} as CapLine;
  });
  return (
    <AbsoluteFill style={{fontFamily: FONT, background: '#45454D'}}>
      <style>{`
        @font-face{font-family:'Inter';font-weight:900;src:url(${staticFile('fonts/Inter-Black.otf')});}
        @font-face{font-family:'Inter';font-weight:800;src:url(${staticFile('fonts/Inter-ExtraBold.otf')});}
      `}</style>
      <LStage cam={cam} who={shot2 ? [girl, riky] : [riky, girl]} />
      {!shot2 && <Headline t0={0.15} lines={[{text: 'SQUAT'}, {text: 'MAL DI SCHIENA?', color: C.red}]} top={150} size={100} />}
      <Captions lines={caps} />
      <Grain />
      <Audio src={staticFile('soundtrack20.wav')} />
    </AbsoluteFill>
  );
};
