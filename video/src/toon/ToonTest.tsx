import React from 'react';
import {AbsoluteFill, useCurrentFrame} from 'remotion';
import {Stage, ToonChar} from './Stage';
import {GOBLET, HAND_BACK} from './engine';

// frame 0: due personaggi a riposo · 1: gesti · 2: squat goblet · 3: errori · 4: primo piano Riccardo
export const ToonTest: React.FC = () => {
  const f = useCurrentFrame();
  const S = 0.27;
  if (f === 0 || f === 1) {
    const g: ToonChar = {id: 'g', rig: 'gtq', x: 560, y: 840, s: S, mouth: f ? 0.8 : 0, blink: f ? 1 : 0, stand: {head: f ? 0.06 : 0}};
    const r: ToonChar = {id: 'r', rig: 'rtq', x: 790, y: 830, s: S, flip: true, mouth: f ? 1 : 0, stand: f ? {R: [-0.55, -1.0], L: [0.45, -0.9]} : {}};
    return <AbsoluteFill><Stage cam={{cx: 670, cy: 560, h: 1024}} chars={[g, r]} /></AbsoluteFill>;
  }
  if (f === 2 || f === 3 || f === 5) {
    const p = f === 2 ? {sq: 0.95, ...GOBLET} : f === 3 ? {sq: 1, heel: 0.35, lean: 1.0, wink: 0.8, ...GOBLET} : {...HAND_BACK};
    const g: ToonChar = {id: 'g', rig: 'gprof', x: 500, y: 850, s: S, prof: p, bell: f === 5 ? undefined : {}, fx: f === 3 ? {lumbar: 1} : {}, mouth: 0.4};
    return <AbsoluteFill><Stage cam={{cx: 500, cy: 650, h: 640}} chars={[g]} /></AbsoluteFill>;
  }
  const r: ToonChar = {id: 'r', rig: 'rfront', x: 760, y: 830, s: S, mouth: 0.7, stand: {R: [-2.35, -0.35]}, phone: undefined};
  const r2: ToonChar = {...r, stand: {R: [-0.45, -2.25]}, phone: 'R', phoneScreen: true};
  return <AbsoluteFill><Stage cam={{cx: 760, cy: 640, h: 560}} chars={[f === 4 ? r : r2]} /></AbsoluteFill>;
};
