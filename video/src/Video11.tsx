import React from 'react';
import {AbsoluteFill, Audio, staticFile} from 'remotion';
import {C, FONT} from './brand';
import {Show, Grain} from './ui';
import {Captions, CapLine} from './Captions';
import {Transitions, Tr} from './Transitions';
import {S1} from './scenes/S1';
import {S2a, S2b} from './scenes/S2';
import {S3a, S3b} from './scenes/S3';
import {S4a, S4b} from './scenes/S4';
import {S5a, S5b} from './scenes/S5';
import {S6} from './scenes/S6';
import {S7View} from './scenes/S7';
import {S8a, S8b, S8} from './scenes/S8';
import voiceTiming from './voice_timing.json';

export const FPS = 30;
export const DURATION = 44 * FPS;

/** Sottotitoli = trascrizione della voce di Riky. I tempi parola-per-parola arrivano da voice/costruisci_traccia.py. */
type VT = {slot: string; text: string; t0: number; t1: number; words: number[]};
const VT_LIST = voiceTiming as VT[];
const vt = (slot: string) => {
  const v = VT_LIST.find((x) => x.slot === slot);
  if (!v) throw new Error('slot voce mancante: ' + slot);
  return v;
};

type Spec = {slot: string; caption?: string; hl?: number[]} & Partial<CapLine>;
const SMALL: Spec[] = [
  {slot: 's2a', caption: 'Stesso esercizio.', hl: [1]},
  {slot: 's2b', caption: 'Stesso peso.', hl: [1]},
  {slot: 's2c', caption: 'Settimana dopo settimana.', hl: [2]},
  {slot: 's3a', caption: 'I mesi passano velocissimi…', hl: [1]},
  {slot: 's3b', caption: 'E il tuo corpo resta identico.', hl: [5]},
  {slot: 's4b', caption: 'Stimolo uguale, risultato uguale.', hl: [0, 2]},
  {slot: 's5a', caption: 'La soluzione ha un nome…', hl: [3]},
  {slot: 's5b', caption: 'Progressione.', hl: [0]},
  {slot: 's5c', caption: 'Un passo alla volta.', hl: [1, 3]},
  {slot: 's6a', caption: 'Aumenta il carico,', hl: [2]},
  {slot: 's6b', caption: 'le ripetizioni,', hl: [1]},
  {slot: 's6c', caption: 'cura la tecnica,', hl: [2]},
  {slot: 's6d', caption: 'alza il volume,', hl: [2]},
  {slot: 's6e', caption: 'e recupera bene.', hl: [2]},
  {slot: 's7a', caption: 'Settimana uno,', hl: [1]},
  {slot: 's7b', caption: 'settimana quattro,', hl: [1]},
  {slot: 's7c', caption: 'otto,', hl: [0]},
  {slot: 's7d', caption: 'dodici: cambia davvero.', hl: [0, 2]},
];

const buildCaps = (): CapLine[] => {
  const lines: CapLine[] = [];
  const h1 = vt('hook1');
  const h2 = vt('hook2');
  lines.push({t0: h1.words[0] - 0.05, t1: h2.words[0] - 0.05, text: 'Ti alleni da mesi', big: true, size: 118, y: 70, times: h1.words});
  lines.push({t0: h2.words[0] - 0.05, t1: 3.98, text: 'Ma non cambi?', big: true, size: 150, y: 56, hl: [2], color: C.red, times: h2.words, slam: 2});
  const q = vt('s8');
  lines.push({
    t0: q.words[0] - 0.05,
    t1: 43.05,
    text: 'Allenarsi tanto non significa automaticamente allenarsi bene.',
    big: true,
    dark: true,
    size: 100,
    y: 230,
    hl: [1, 3, 6],
    hlColors: {1: C.red, 3: C.cream, 6: C.blueL},
    times: q.words,
    slam: 6,
  });
  const small = SMALL.map((sp) => {
    const v = vt(sp.slot);
    return {t0: v.words[0] - 0.18, t1: v.t1 + 0.3, text: sp.caption ?? v.text, hl: sp.hl, times: v.words} as CapLine;
  }).sort((a, b) => a.t0 - b.t0);
  small.forEach((l, i) => {
    const nx = small[i + 1];
    if (nx) l.t1 = Math.min(l.t1, nx.t0 - 0.03);
    l.t1 = Math.min(l.t1, 43.9);
  });
  return [...lines, ...small];
};
const CAPS = buildCaps();

const TRANS: Tr[] = [
  {t: 4, type: 'wipeR', color: C.blue},
  {t: 6.5, type: 'stripes', color: C.blue},
  {t: 9, type: 'iris', color: C.blue},
  {t: 11.5, type: 'wipeU', color: C.blue},
  {t: 14, type: 'wipeL', color: C.blue},
  {t: 16.5, type: 'stripes', color: C.red},
  {t: 19, type: 'iris', color: C.blue},
  {t: 22, type: 'wipeR', color: C.blue},
  {t: 25, type: 'wipeU', color: C.blue},
  {t: 26.4, type: 'wipeR', color: C.blue, d: 0.26},
  {t: 27.8, type: 'wipeL', color: C.ink, d: 0.26},
  {t: 29.2, type: 'wipeR', color: C.blue, d: 0.26},
  {t: 30.6, type: 'wipeL', color: C.ink, d: 0.26},
  {t: 32, type: 'stripes', color: C.blue},
  {t: 35.5, type: 'wipeL', color: C.ink},
  {t: 39, type: 'iris', color: C.blue},
  {t: S8.cut, type: 'wipeR', color: C.blue},
];

export const Video11: React.FC = () => (
  <AbsoluteFill style={{background: C.cream, fontFamily: FONT}}>
    <style>{`
      @font-face{font-family:'Inter';font-weight:900;src:url(${staticFile('fonts/Inter-Black.otf')});}
      @font-face{font-family:'Inter';font-weight:800;src:url(${staticFile('fonts/Inter-ExtraBold.otf')});}
      @font-face{font-family:'Inter';font-weight:700;src:url(${staticFile('fonts/Inter-Bold.otf')});}
    `}</style>
    <Show from={0} to={4} punch={0}><S1 /></Show>
    <Show from={4} to={6.5}><S2a /></Show>
    <Show from={6.5} to={9}><S2b /></Show>
    <Show from={9} to={11.5}><S3a /></Show>
    <Show from={11.5} to={14}><S3b /></Show>
    <Show from={14} to={16.5}><S4a /></Show>
    <Show from={16.5} to={19}><S4b /></Show>
    <Show from={19} to={22}><S5a /></Show>
    <Show from={22} to={25}><S5b /></Show>
    <Show from={25} to={32}><S6 /></Show>
    <Show from={32} to={39}><S7View /></Show>
    <Show from={39} to={S8.cut}><S8a /></Show>
    <Show from={S8.cut} to={44}><S8b /></Show>
    <Captions lines={CAPS} />
    <Transitions list={TRANS} />
    <Grain />
    <Audio src={staticFile('soundtrack.wav')} />
  </AbsoluteFill>
);
