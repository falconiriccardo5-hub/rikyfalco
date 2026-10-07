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
import {S8a, S8b} from './scenes/S8';

export const FPS = 30;
export const DURATION = 44 * FPS;

/** Sottotitoli = copione parlato di Riky, in stile card neo-brutal del brand. */
const CAPS: CapLine[] = [
  // 0–4 HOOK (grande)
  {t0: 0.2, t1: 2.5, text: 'Ti alleni da mesi', big: true, size: 118, y: 70, times: [0.25, 0.5, 0.85, 1.05]},
  {t0: 2.6, t1: 3.98, text: 'Ma non cambi?', big: true, size: 150, y: 56, hl: [2], color: C.red, times: [2.6, 2.85, 3.1], slam: 2},
  // 4–9
  {t0: 4.25, t1: 6.4, text: 'Stesso esercizio. Stesso peso.', hl: [3]},
  {t0: 6.65, t1: 8.95, text: 'Settimana dopo settimana.', hl: [2]},
  // 9–14
  {t0: 9.2, t1: 11.4, text: 'I mesi passano velocissimi…', hl: [1]},
  {t0: 11.7, t1: 13.95, text: '…e il tuo corpo resta identico.', hl: [4]},
  // 14–19
  {t0: 16.0, t1: 16.45, text: 'Se lo stimolo non cambia…'},
  {t0: 16.65, t1: 18.95, text: 'il corpo non ha motivo di cambiare.', hl: [5]},
  // 19–25
  {t0: 19.35, t1: 21.9, text: 'La soluzione ha un nome:', hl: [4]},
  {t0: 22.3, t1: 24.9, text: 'Si chiama progressione.', hl: [2]},
  // 25–32
  {t0: 25.15, t1: 28.4, text: 'Aumenta carico e ripetizioni…', hl: [1, 3]},
  {t0: 28.6, t1: 31.9, text: '…cura tecnica, volume e recupero.', hl: [2, 4, 6]},
  // 32–39
  {t0: 32.3, t1: 35.35, text: 'Settimana 1… settimana 4…', hl: [1, 3]},
  {t0: 35.75, t1: 38.9, text: 'settimana 12: il fisico cambia davvero.', hl: [1, 5]},
  // 39–44 CHIUSURA (grande)
  {
    t0: 39.2,
    t1: 41.45,
    text: 'Allenarsi tanto non significa automaticamente allenarsi bene.',
    big: true,
    dark: true,
    size: 100,
    y: 250,
    hl: [1, 3, 6],
    hlColors: {1: C.red, 3: C.cream, 6: C.blueL},
    times: [39.25, 39.5, 39.78, 40.05, 40.35, 40.95, 41.3],
    slam: 6,
  },
];

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
  {t: 41.5, type: 'wipeR', color: C.blue},
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
    <Show from={39} to={41.5}><S8a /></Show>
    <Show from={41.5} to={44}><S8b /></Show>
    <Captions lines={CAPS} />
    <Transitions list={TRANS} />
    <Grain />
    <Audio src={staticFile('soundtrack.wav')} />
  </AbsoluteFill>
);
