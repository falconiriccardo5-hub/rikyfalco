import { Easing, interpolate } from "remotion";

export const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

export const TOP_ANGLE = 85;
export const REST_ANGLE = 6;

/** Slow, controlled rep: smooth rise, short hold, slower braked descent. */
export const controlledRep = (
  f: number,
  { up = 45, hold = 10, down = 60, rest = 15 } = {},
) => {
  const cycle = up + hold + down + rest;
  const t = ((f % cycle) + cycle) % cycle;
  if (t < up)
    return interpolate(t, [0, up], [REST_ANGLE, TOP_ANGLE], {
      ...clamp,
      easing: Easing.inOut(Easing.sin),
    });
  if (t < up + hold) return TOP_ANGLE;
  if (t < up + hold + down)
    return interpolate(t, [up + hold, up + hold + down], [TOP_ANGLE, REST_ANGLE], {
      ...clamp,
      easing: Easing.inOut(Easing.quad),
    });
  return REST_ANGLE;
};

export const controlledPhase = (
  f: number,
  { up = 45, hold = 10, down = 60, rest = 15 } = {},
) => {
  const cycle = up + hold + down + rest;
  const t = ((f % cycle) + cycle) % cycle;
  if (t < up) return { phase: "up" as const, p: t / up };
  if (t < up + hold) return { phase: "hold" as const, p: 1 };
  if (t < up + hold + down) return { phase: "down" as const, p: (t - up - hold) / down };
  return { phase: "rest" as const, p: 0 };
};

/** Swung rep: explosive throw up with body swing, dropped down. */
export const swungRep = (f: number) => {
  const cycle = 26;
  const t = ((f % cycle) + cycle) % cycle;
  let angle: number;
  if (t < 7)
    angle = interpolate(t, [0, 7], [REST_ANGLE, 100], { ...clamp, easing: Easing.out(Easing.cubic) });
  else if (t < 9) angle = 100;
  else if (t < 15)
    angle = interpolate(t, [9, 15], [100, REST_ANGLE], { ...clamp, easing: Easing.in(Easing.quad) });
  else angle = REST_ANGLE;
  // body swing: lean forward to load, then back to throw
  const lean = interpolate(t, [0, 3, 8, 14, 20, 26], [-6, -9, 12, 4, -2, -6], clamp);
  const shrug = interpolate(t, [3, 7, 11, 15], [0, 1, 1, 0], clamp);
  const fast = t < 15 ? 1 : 0;
  return { angle, lean, shrug, fast, t };
};

export const isBlinking = (f: number, offset = 0) => {
  const t = (f + offset) % 97;
  return t > 92;
};

/** Pseudo-syllable mouth opening, 0..1 */
export const talkAmount = (f: number) =>
  0.2 + 0.8 * Math.abs(Math.sin(f * 0.62 + Math.sin(f * 0.21) * 1.8));
