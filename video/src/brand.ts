import {Easing, interpolate, useCurrentFrame, useVideoConfig} from 'remotion';
import voiceEnv from './voice_env.json';

/** Palette Coach Riky: nero, crema, denim (dai pantaloncini del personaggio) + rosso solo per "stagnazione". */
export const C = {
  ink: '#111111',
  cream: '#F5F3EE',
  paper: '#FFFFFF',
  blue: '#4F7AB3',
  blueD: '#3F6499',
  blueL: '#8DB4E8',
  red: '#E5484D',
  grey: '#DCDAD3',
  steel: '#C9CED6',
  night: '#14161A',
  night2: '#1D2127',
};

export const FONT = "Inter, 'Helvetica Neue', Arial, sans-serif";
export const OUT = 6; // spessore contorno, come il personaggio

export const E = {
  out: Easing.bezier(0.16, 1, 0.3, 1),
  inOut: Easing.bezier(0.65, 0, 0.35, 1),
  in: Easing.bezier(0.7, 0, 0.84, 0),
  back: Easing.out(Easing.back(1.9)),
  backSoft: Easing.out(Easing.back(1.2)),
  bounce: Easing.out(Easing.bounce),
  lin: (x: number) => x,
};

export const prog = (t: number, a: number, b: number, ease: (x: number) => number = E.out) =>
  interpolate(t, [a, b], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: ease});

export const mix = (a: number, b: number, p: number) => a + (b - a) * p;

export const useT = () => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  return f / fps;
};

/** Pseudo-random deterministico (per shake, coriandoli, ecc.) */
export const rnd = (n: number) => {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
};

/** Shake smorzato: ampiezza px a partire dall'istante t0 */
export const shake = (t: number, t0: number, amp = 14, dur = 0.35) => {
  const p = t - t0;
  if (p < 0 || p > dur) return {x: 0, y: 0};
  const k = (1 - p / dur) ** 2 * amp;
  return {x: (rnd(Math.floor(p * 60)) - 0.5) * 2 * k, y: (rnd(Math.floor(p * 60) + 99) - 0.5) * 2 * k};
};

/** Apertura bocca (0..0.9) di Riky legata all'inviluppo della voce: lip-sync semplice ma credibile. */
export const useTalk = () => {
  const f = useCurrentFrame();
  const v = (voiceEnv as number[])[f] ?? 0;
  return Math.min(0.9, v * 0.95);
};
