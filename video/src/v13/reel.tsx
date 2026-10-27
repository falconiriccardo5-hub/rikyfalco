/** Fabbrica dei reel verticali: tempi dalla voce, scene, sottotitoli, transizioni, audio. */
import React from 'react';
import {AbsoluteFill, Audio, staticFile} from 'remotion';
import {C, FONT} from '../brand';
import {Show, Grain} from '../ui';
import {Captions, CapLine} from '../Captions';
import {Transitions, Tr} from '../Transitions';

export type VT = {slot: string; text: string; t0: number; t1: number; words: number[]};
export type SceneFC = React.FC<{a: number; b: number}>;

export const makeTiming = (timing: VT[], SL: string[], maxEnd = 64, G = 0.22) => {
  const v = (s: string) => {
    const x = timing.find((q) => q.slot === s);
    if (!x) throw new Error('slot voce mancante ' + s);
    return x;
  };
  const st = (s: string) => v(s).t0;
  const en = (s: string) => v(s).t1;
  const wd = (s: string) => v(s).words;
  const END = Math.min(maxEnd, en(SL[SL.length - 1]) + 1.4);
  const W: Record<string, [number, number]> = Object.fromEntries(
    SL.map((s, i) => [s, [i === 0 ? 0 : st(s) - G, i === SL.length - 1 ? END : st(SL[i + 1]) - G]]),
  ) as Record<string, [number, number]>;
  return {v, st, en, wd, END, W, DURATION: Math.ceil(END * 30)};
};

export const buildCaps = (
  T: ReturnType<typeof makeTiming>,
  big: {slot: string; hl: number[]; color?: string; size?: number; y?: number; slam?: number; until: string}[],
  meta: Record<string, number[]>,
  display: Record<string, string> = {},
): CapLine[] => {
  const B: CapLine[] = big.map((b) => {
    const x = T.v(b.slot);
    return {t0: x.words[0] - 0.05, t1: T.W[b.until][0] - 0.02, text: x.text, big: true, size: b.size ?? 92, y: b.y ?? 120, hl: b.hl, color: b.color ?? C.blue, times: x.words, slam: b.slam};
  });
  const small = Object.entries(meta)
    .map(([slot, hl]) => {
      const x = T.v(slot);
      return {t0: x.words[0] - 0.15, t1: x.t1 + 0.35, text: display[slot] ?? x.text, hl, times: x.words, bottom: 300, wrapAt: 19, fs: 50, bg: '#fff'} as CapLine;
    })
    .sort((p, q) => p.t0 - q.t0);
  small.forEach((l, i) => {
    const nx = small[i + 1];
    if (nx) l.t1 = Math.min(l.t1, nx.t0 - 0.03);
    l.t1 = Math.min(l.t1, T.END - 0.05);
  });
  return [...B, ...small];
};

const TT: Tr['type'][] = ['iris', 'wipeR', 'wipeL', 'stripes', 'wipeU', 'iris', 'wipeR', 'wipeL', 'stripes', 'wipeU', 'iris', 'wipeR', 'wipeL', 'stripes', 'wipeU'];
const TC = [C.blue, C.ink, C.red, C.ink, C.blue, C.red, C.ink, C.blue, C.ink, C.blue, C.red, C.ink, C.blue, C.ink, C.blue];

export const ReelShell: React.FC<{T: ReturnType<typeof makeTiming>; SL: string[]; scenes: Record<string, SceneFC>; caps: CapLine[]; audio: string}> = ({T, SL, scenes, caps, audio}) => {
  const trans: Tr[] = SL.slice(1).map((s, i) => ({t: T.W[s][0], type: TT[i % TT.length], color: TC[i % TC.length]}));
  return (
    <AbsoluteFill style={{background: '#fff', fontFamily: FONT}}>
      <style>{`
        @font-face{font-family:'Inter';font-weight:900;src:url(${staticFile('fonts/Inter-Black.otf')});}
        @font-face{font-family:'Inter';font-weight:800;src:url(${staticFile('fonts/Inter-ExtraBold.otf')});}
        @font-face{font-family:'Inter';font-weight:700;src:url(${staticFile('fonts/Inter-Bold.otf')});}
      `}</style>
      {SL.map((s, i) => {
        const Sc = scenes[s];
        const last = i === SL.length - 1;
        return (
          <Show key={s} from={T.W[s][0]} to={T.W[s][1] + (last ? 1 : 0)} punch={i === 0 ? 0 : 0.05}>
            <Sc a={T.W[s][0]} b={T.W[s][1]} />
          </Show>
        );
      })}
      <Captions lines={caps} />
      <Transitions list={trans} />
      <Grain />
      <Audio src={staticFile(audio)} />
    </AbsoluteFill>
  );
};
