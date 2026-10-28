/** Motore 2D: disegni originali (tavole 2D) deformati lungo uno scheletro, come nei cartoni animati (stile Live2D/Spine). */
import gprof from './rigs/gprof.json';
import gtq from './rigs/gtq.json';
import rfront from './rigs/rfront.json';
import rtq from './rigs/rtq.json';

export type V2 = [number, number];
export type Layer = {name: string; png: string; x0: number; y0: number; w: number; h: number; v: number[]; t: number[]; bi: number[]; bw: number[]};
export type Rig = {size: number[]; bones: string[]; rest: Record<string, number[]>; layers: Layer[]; face: {eyes: number[][]; mouth: number[]; skin: number[]; neck?: number[]}; floor: number; footx: number};
export const RIGS: Record<string, Rig> = {gprof, gtq, rfront, rtq} as unknown as Record<string, Rig>;
export type RigName = 'gprof' | 'gtq' | 'rfront' | 'rtq';

/** trasformazione rigida di un osso: p -> R(r)(p - h) + t */
export type Bone = {r: number; h: V2; t: V2};
export const rot = (v: V2, a: number): V2 => [v[0] * Math.cos(a) - v[1] * Math.sin(a), v[0] * Math.sin(a) + v[1] * Math.cos(a)];
const add = (a: V2, b: V2): V2 => [a[0] + b[0], a[1] + b[1]];
const sub = (a: V2, b: V2): V2 => [a[0] - b[0], a[1] - b[1]];
const len = (a: V2) => Math.hypot(a[0], a[1]);
const ang = (a: V2) => Math.atan2(a[1], a[0]);
export const applyBone = (b: Bone, p: V2): V2 => add(rot(sub(p, b.h), b.r), b.t);
const fixed = (h: V2): Bone => ({r: 0, h, t: h});

/* ------------------------------------------------------------------ pose */
export type ArmP = [number, number];
export type StandPose = {L?: ArmP; R?: ArmP; head?: number; bob?: number};
export type ProfPose = {sq?: number; heel?: number; lean?: number; wink?: number; ua?: number; fa?: number; head?: number; breath?: number};
export const GOBLET = {ua: -0.35, fa: -2.2};
export const HAND_BACK = {ua: 0.5, fa: -1.15};

export const standBones = (rig: Rig, p: StandPose): Record<string, Bone> => {
  const bob = p.bob ?? 0;
  const R = rig.rest as Record<string, V2>;
  const out: Record<string, Bone> = {body: {r: 0, h: [0, 0], t: [0, bob]}, head: {r: p.head ?? 0, h: R.neck, t: add(R.neck, [0, bob])}};
  for (const s of ['L', 'R'] as const) {
    if (!R[s + '_sh']) continue;
    const [a, b] = p[s] ?? [0, 0];
    const sh = add(R[s + '_sh'], [0, bob]);
    const E = add(sh, rot(sub(R[s + '_el'], R[s + '_sh']), a));
    out[s + '_u'] = {r: a, h: R[s + '_sh'], t: sh};
    out[s + '_f'] = {r: a + b, h: R[s + '_el'], t: E};
  }
  return out;
};

const ik = (H: V2, A: V2, Lt: number, Ls: number): V2 => {
  const d = sub(A, H);
  const L = Math.min(len(d), Lt + Ls - 1e-3);
  const u: V2 = [d[0] / len(d), d[1] / len(d)];
  const c = Math.acos(Math.max(-1, Math.min(1, (Lt * Lt + L * L - Ls * Ls) / (2 * Lt * L))));
  let n: V2 = [u[1], -u[0]];
  if (n[0] < 0) n = [-n[0], -n[1]];
  return [H[0] + u[0] * Lt * Math.cos(c) + n[0] * Lt * Math.sin(c), H[1] + u[1] * Lt * Math.cos(c) + n[1] * Lt * Math.sin(c)];
};

export const profBones = (rig: Rig, p: ProfPose): Record<string, Bone> => {
  const R = rig.rest as Record<string, V2>;
  const sq = p.sq ?? 0;
  const heel = p.heel ?? 0;
  const Lt = len(sub(R.knee, R.hip));
  const Ls = len(sub(R.ankle, R.knee));
  const T = R.toe;
  const Aw = add(T, rot(sub(R.ankle, T), heel));
  const Hw = add(R.hip, [-190 * sq + 50 * heel, 290 * sq - 10 * heel + (p.breath ?? 0)]);
  const Kw = ik(Hw, Aw, Lt, Ls);
  const tr = (p.lean ?? 0.6 * sq) - (p.wink ?? 0) * 0.25;
  const Nw = add(Hw, rot(sub(R.neck, R.hip), tr));
  const Sw = add(Hw, rot(sub(R.shoulder, R.hip), tr));
  const ua = tr + (p.ua ?? 0);
  const Ew = add(Sw, rot(sub(R.elbow, R.shoulder), ua));
  const fa = ua + (p.fa ?? 0);
  const thr = ang(sub(Kw, Hw)) - ang(sub(R.knee, R.hip));
  return {
    trunk: {r: tr, h: R.hip, t: Hw},
    pelvis: {r: (tr + thr) / 2, h: R.hip, t: Hw},
    head: {r: tr * 0.35 + (p.head ?? 0), h: R.neck, t: Nw},
    thigh: {r: thr, h: R.hip, t: Hw},
    shin: {r: ang(sub(Aw, Kw)) - ang(sub(R.ankle, R.knee)), h: R.knee, t: Kw},
    foot: {r: heel, h: T, t: T},
    uarm: {r: ua, h: R.shoulder, t: Sw},
    farm: {r: fa, h: R.elbow, t: Ew},
  };
};

export const gtqBones = (rig: Rig, p: StandPose): Record<string, Bone> => {
  const R = rig.rest as Record<string, V2>;
  const bob = p.bob ?? 0;
  return {body: {r: 0, h: [0, 0], t: [0, bob]}, head: {r: p.head ?? 0, h: R.neck, t: add(R.neck, [0, bob])}};
};

/** posizioni deformate (coordinate tavola) dei vertici di uno strato */
export const skin = (rig: Rig, layer: Layer, bones: Record<string, Bone>): Float32Array => {
  const B = rig.bones.map((n) => bones[n] ?? fixed([0, 0]));
  const n = layer.v.length / 2;
  const out = new Float32Array(n * 2);
  const cs = B.map((b) => Math.cos(b.r));
  const sn = B.map((b) => Math.sin(b.r));
  for (let i = 0; i < n; i++) {
    const x = layer.v[i * 2];
    const y = layer.v[i * 2 + 1];
    let ox = 0;
    let oy = 0;
    for (let k = 0; k < 3; k++) {
      const w = layer.bw[i * 3 + k];
      if (w <= 0) continue;
      const j = layer.bi[i * 3 + k];
      const b = B[j];
      const dx = x - b.h[0];
      const dy = y - b.h[1];
      ox += w * (dx * cs[j] - dy * sn[j] + b.t[0]);
      oy += w * (dx * sn[j] + dy * cs[j] + b.t[1]);
    }
    out[i * 2] = ox;
    out[i * 2 + 1] = oy;
  }
  return out;
};

/* ------------------------------------------------------------------ piazzamento: tavola -> mondo -> schermo */
export type Cam = {cx: number; cy: number; h: number}; // centro e altezza visibile (unità mondo = px dello studio 1536x1024)
export type Aff = [number, number, number, number, number, number]; // x' = a x + c y + e ; y' = b x + d y + f
export const camAff = (c: Cam, W = 1080, H = 1920): Aff => {
  const z = H / c.h;
  return [z, 0, 0, z, W / 2 - c.cx * z, H / 2 - c.cy * z];
};
export const mul = (m: Aff, n: Aff): Aff => [m[0] * n[0] + m[2] * n[1], m[1] * n[0] + m[3] * n[1], m[0] * n[2] + m[2] * n[3], m[1] * n[2] + m[3] * n[3], m[0] * n[4] + m[2] * n[5] + m[4], m[1] * n[4] + m[3] * n[5] + m[5]];
export const apply = (m: Aff, p: V2): V2 => [m[0] * p[0] + m[2] * p[1] + m[4], m[1] * p[0] + m[3] * p[1] + m[5]];
/** tavola -> mondo: piedi della tavola su (x,y) del mondo, scala s, eventualmente specchiato */
export const placeAff = (rig: Rig, x: number, y: number, s: number, flip = false): Aff => {
  const sx = flip ? -s : s;
  return [sx, 0, 0, s, x - rig.footx * sx, y - rig.floor * s];
};
export const boneAff = (b: Bone): Aff => {
  const c = Math.cos(b.r);
  const s = Math.sin(b.r);
  return [c, s, -s, c, b.t[0] - (c * b.h[0] - s * b.h[1]), b.t[1] - (s * b.h[0] + c * b.h[1])];
};
