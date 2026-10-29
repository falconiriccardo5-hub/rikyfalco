/** Personaggi a livelli (2D): ogni parte del corpo è un livello disegnato, con contorno e colore separati;
 *  gli shorts sono un livello morbido (si piegano come stoffa). Bocche, palpebre e mani sono sprite a scambio. */
import React, {useEffect, useLayoutEffect, useRef, useState} from 'react';
import {continueRender, delayRender, Img, staticFile} from 'remotion';
import gprof from './layers/gprof.json';
import rtq from './layers/rtq.json';
import spr from './layers/sprites.json';

export type V2 = [number, number];
type ImgRef = {png: string; x0: number; y0: number; w: number; h: number} | null;
type Part = {name: string; bone?: string; ink?: ImgRef; fill?: ImgRef; mesh?: ImgRef & object; bones?: string[]; v?: number[]; t?: number[]; w?: number[]};
type Rig = {size: number[]; joints: Record<string, V2>; groups: {name: string; parts: Part[]}[]; floor: number; footx: number; face: {mouth: number[]; eyes: number[][]; skin: number[]}};
export const LRIGS: Record<string, Rig> = {gprof, rtq} as unknown as Record<string, Rig>;
const SPR = spr as unknown as {lid_rtq: V2; lid_gprof: V2; hand_rtq: {wrist: V2; size: V2}};

/* ------------------------------------------------------------------ matematica 2D */
export type Bone = {r: number; h: V2; t: V2};
export type Aff = [number, number, number, number, number, number];
const rot = (v: V2, a: number): V2 => [v[0] * Math.cos(a) - v[1] * Math.sin(a), v[0] * Math.sin(a) + v[1] * Math.cos(a)];
const add = (a: V2, b: V2): V2 => [a[0] + b[0], a[1] + b[1]];
const sub = (a: V2, b: V2): V2 => [a[0] - b[0], a[1] - b[1]];
const len = (a: V2) => Math.hypot(a[0], a[1]);
const ang = (a: V2) => Math.atan2(a[1], a[0]);
export const mul = (m: Aff, n: Aff): Aff => [m[0] * n[0] + m[2] * n[1], m[1] * n[0] + m[3] * n[1], m[0] * n[2] + m[2] * n[3], m[1] * n[2] + m[3] * n[3], m[0] * n[4] + m[2] * n[5] + m[4], m[1] * n[4] + m[3] * n[5] + m[5]];
export const apply = (m: Aff, p: V2): V2 => [m[0] * p[0] + m[2] * p[1] + m[4], m[1] * p[0] + m[3] * p[1] + m[5]];
export const boneAff = (b: Bone): Aff => {
  const c = Math.cos(b.r);
  const s = Math.sin(b.r);
  return [c, s, -s, c, b.t[0] - (c * b.h[0] - s * b.h[1]), b.t[1] - (s * b.h[0] + c * b.h[1])];
};
export type Cam = {cx: number; cy: number; h: number};
export const camAff = (c: Cam): Aff => {
  const z = 1920 / c.h;
  return [z, 0, 0, z, 540 - c.cx * z, 960 - c.cy * z];
};
const placeAff = (rig: Rig, x: number, y: number, s: number, flip = false): Aff => {
  const sx = flip ? -s : s;
  return [sx, 0, 0, s, x - rig.footx * sx, y - rig.floor * s];
};

/* ------------------------------------------------------------------ pose */
export type ProfPose = {sq?: number; heel?: number; lean?: number; wink?: number; ua?: number; fa?: number; ha?: number; head?: number; pony?: number; dx?: number};
export type TqPose = {L?: [number, number, number?]; R?: [number, number, number?]; head?: number; bob?: number; lean?: number};

const ik = (H: V2, A: V2, Lt: number, Ls: number): V2 => {
  const d = sub(A, H);
  const L = Math.min(len(d), Lt + Ls - 1e-3);
  const u: V2 = [d[0] / len(d), d[1] / len(d)];
  const c = Math.acos(Math.max(-1, Math.min(1, (Lt * Lt + L * L - Ls * Ls) / (2 * Lt * L))));
  let n: V2 = [u[1], -u[0]];
  if (n[0] < 0) n = [-n[0], -n[1]];
  return [H[0] + u[0] * Lt * Math.cos(c) + n[0] * Lt * Math.sin(c), H[1] + u[1] * Lt * Math.cos(c) + n[1] * Lt * Math.sin(c)];
};

export const profBones = (p: ProfPose): Record<string, Bone> => {
  const J = LRIGS.gprof.joints;
  const sq = p.sq ?? 0;
  const heel = p.heel ?? 0;
  const Lt = len(sub(J.knee, J.hip));
  const Ls = len(sub(J.ankle, J.knee));
  const T = J.toe;
  const Aw = add(T, rot(sub(J.ankle, T), heel));
  const Hw = add(J.hip, [-190 * sq + 50 * heel + (p.dx ?? 0), 290 * sq - 10 * heel]);
  const Kw = ik(Hw, Aw, Lt, Ls);
  const tr = (p.lean ?? 0.6 * sq) - (p.wink ?? 0) * 0.25;
  const thr = ang(sub(Kw, Hw)) - ang(sub(J.knee, J.hip));
  const shr = ang(sub(Aw, Kw)) - ang(sub(J.ankle, J.knee));
  const Nw = add(Hw, rot(sub(J.neck, J.hip), tr));
  const Sw = add(Hw, rot(sub(J.shoulder, J.hip), tr));
  const u = tr + (p.ua ?? 0);
  const Ew = add(Sw, rot(sub(J.elbow, J.shoulder), u));
  const f = u + (p.fa ?? 0);
  const Ww = add(Ew, rot(sub(J.wrist, J.elbow), f));
  const hr = tr * 0.8 + (p.head ?? 0);
  const Pw = add(Nw, rot(sub(J.pony, J.neck), hr));
  return {
    trunk: {r: tr, h: J.hip, t: Hw},
    pelvis: {r: (tr + thr) / 2, h: J.hip, t: Hw},
    thigh: {r: thr, h: J.hip, t: Hw},
    shin: {r: shr, h: J.knee, t: Kw},
    foot: {r: heel, h: T, t: T},
    head: {r: hr, h: J.neck, t: Nw},
    pony: {r: hr + (p.pony ?? 0), h: J.pony, t: Pw},
    uarm: {r: u, h: J.shoulder, t: Sw},
    farm: {r: f, h: J.elbow, t: Ew},
    hand: {r: f + (p.ha ?? 0), h: J.wrist, t: Ww},
  };
};

export const tqBones = (p: TqPose): Record<string, Bone> => {
  const J = LRIGS.rtq.joints;
  const bob = p.bob ?? 0;
  const lean = p.lean ?? 0;
  const base: V2 = [460, 1628];
  const body: Bone = {r: lean, h: base, t: add(base, [0, bob])};
  const B = boneAff(body);
  const out: Record<string, Bone> = {body};
  const N = apply(B, J.neck);
  out.head = {r: lean + (p.head ?? 0), h: J.neck, t: N};
  for (const s of ['L', 'R'] as const) {
    const [a, b, c] = p[s] ?? [0, 0, 0];
    const sh = apply(B, J[s + '_sh']);
    const u = lean + a;
    const E = add(sh, rot(sub(J[s + '_el'], J[s + '_sh']), u));
    const f = u + b;
    const Wr = add(E, rot(sub(J[s + '_wr'], J[s + '_el']), f));
    out[s + '_u'] = {r: u, h: J[s + '_sh'], t: sh};
    out[s + '_f'] = {r: f, h: J[s + '_el'], t: E};
    out[s + '_h'] = {r: f + (c ?? 0), h: J[s + '_wr'], t: Wr};
    out[s + '_sleeve'] = {r: lean + a * 0.3, h: J[s + '_sh'], t: sh};
  }
  return out;
};

/* ------------------------------------------------------------------ personaggio in scena */
export type Who = {
  id: string;
  rig: 'gprof' | 'rtq';
  x: number;
  y: number;
  s: number;
  flip?: boolean;
  prof?: ProfPose;
  tq?: TqPose;
  /** visema della bocca */
  mouth?: string;
  /** 0 aperti · 1 a metà · 2 chiusi */
  lid?: 0 | 1 | 2;
  bell?: {scale?: number; color?: 'teal' | 'yellow'};
  /** mano sinistra di Riccardo: 'art' | 'open' | 'point' */
  handL?: 'art' | 'open' | 'point';
  handR?: 'art' | 'open' | 'point';
  glow?: {lumbar?: number};
};
const bonesOf = (w: Who) => (w.rig === 'gprof' ? profBones(w.prof ?? {}) : tqBones(w.tq ?? {}));
const ORDER: Record<string, (string | {sprite: string})[]> = {
  gprof: ['legs', 'foot', 'shorts', 'upper', {sprite: 'face'}, {sprite: 'bell'}, 'arm'],
  rtq: ['armR', {sprite: 'handR'}, 'body', {sprite: 'face'}, 'armL', {sprite: 'handL'}, 'sleeveL'],
};

/* ------------------------------------------------------------------ texture */
const TEX = new Set<string>(['toon/kb_teal.png', 'toon/kb_yellow.png']);
for (const r of Object.values(LRIGS))
  for (const g of r.groups)
    for (const p of g.parts) for (const d of [p.ink, p.fill, p.mesh]) if (d) TEX.add('layers/' + d.png);
for (const k of ['rest', 'mbp', 'fv', 'a', 'e', 'i', 'o', 'u']) TEX.add(`layers/mouth_rtq_${k}.png`);
for (const k of ['rest', 'mbp', 'fv', 'a', 'e', 'i', 'o', 'u', 'pain']) TEX.add(`layers/mouth_gprof_${k}.png`);
for (const k of ['half', 'closed']) {
  TEX.add(`layers/lid_rtq_${k}.png`);
  TEX.add(`layers/lid_gprof_${k}.png`);
}
TEX.add('layers/hand_rtq_open.png');
TEX.add('layers/hand_rtq_point.png');
const ALL = [...TEX];
const imgs: Record<string, HTMLImageElement> = {};
let loading: Promise<void> | null = null;
const loadAll = () =>
  (loading ??= Promise.all(
    ALL.map(
      (p) =>
        new Promise<void>((res, rej) => {
          const im = new Image();
          im.onload = () => {
            imgs[p] = im;
            res();
          };
          im.onerror = () => rej(new Error(p));
          im.src = staticFile(p);
        }),
    ),
  ).then(() => undefined));

/* ------------------------------------------------------------------ WebGL (solo rasterizzazione 2D) */
const VS = `#version 300 es
in vec2 p; in vec2 uv; out vec2 v;
void main(){ v=uv; gl_Position=vec4(p.x/540.0-1.0, 1.0-p.y/960.0, 0.0, 1.0); }`;
const FS = `#version 300 es
precision mediump float; in vec2 v; uniform sampler2D t; out vec4 o;
void main(){ o=texture(t,v); }`;
type GL = {gl: WebGL2RenderingContext; tex: Record<string, WebGLTexture>; pb: WebGLBuffer; ub: WebGLBuffer; ib: WebGLBuffer; lp: number; lu: number; meta: Record<string, [number, number]>};
const initGL = (cv: HTMLCanvasElement): GL => {
  const gl = cv.getContext('webgl2', {premultipliedAlpha: true, preserveDrawingBuffer: true, antialias: true}) as WebGL2RenderingContext;
  const sh = (type: number, src: string) => {
    const s = gl.createShader(type)!;
    gl.shaderSource(s, src);
    gl.compileShader(s);
    return s;
  };
  const prog = gl.createProgram()!;
  gl.attachShader(prog, sh(gl.VERTEX_SHADER, VS));
  gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FS));
  gl.linkProgram(prog);
  gl.useProgram(prog);
  gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
  const tex: Record<string, WebGLTexture> = {};
  const meta: Record<string, [number, number]> = {};
  for (const p of ALL) {
    const t = gl.createTexture()!;
    gl.bindTexture(gl.TEXTURE_2D, t);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, imgs[p]);
    gl.generateMipmap(gl.TEXTURE_2D);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    tex[p] = t;
    meta[p] = [imgs[p].naturalWidth, imgs[p].naturalHeight];
  }
  gl.enable(gl.BLEND);
  gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
  return {gl, tex, meta, pb: gl.createBuffer()!, ub: gl.createBuffer()!, ib: gl.createBuffer()!, lp: gl.getAttribLocation(prog, 'p'), lu: gl.getAttribLocation(prog, 'uv')};
};
const draw = (G: GL, key: string, pos: Float32Array, uv: Float32Array, idx: Uint16Array) => {
  const {gl} = G;
  gl.bindTexture(gl.TEXTURE_2D, G.tex[key]);
  gl.bindBuffer(gl.ARRAY_BUFFER, G.pb);
  gl.bufferData(gl.ARRAY_BUFFER, pos, gl.DYNAMIC_DRAW);
  gl.enableVertexAttribArray(G.lp);
  gl.vertexAttribPointer(G.lp, 2, gl.FLOAT, false, 0, 0);
  gl.bindBuffer(gl.ARRAY_BUFFER, G.ub);
  gl.bufferData(gl.ARRAY_BUFFER, uv, gl.DYNAMIC_DRAW);
  gl.enableVertexAttribArray(G.lu);
  gl.vertexAttribPointer(G.lu, 2, gl.FLOAT, false, 0, 0);
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, G.ib);
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, idx, gl.DYNAMIC_DRAW);
  gl.drawElements(gl.TRIANGLES, idx.length, gl.UNSIGNED_SHORT, 0);
};
const QUV = new Float32Array([0, 0, 1, 0, 0, 1, 1, 1]);
const QI = new Uint16Array([0, 1, 2, 1, 3, 2]);
/** immagine rettangolare (coordinate tavola x0,y0,w,h) trasformata da M */
const quad = (G: GL, key: string, M: Aff, x0: number, y0: number, w: number, h: number) => {
  const c: V2[] = [[x0, y0], [x0 + w, y0], [x0, y0 + h], [x0 + w, y0 + h]];
  draw(G, key, new Float32Array(c.flatMap((p) => apply(M, p))), QUV, QI);
};
const meshCache: Record<string, {uv: Float32Array; idx: Uint16Array}> = {};

const drawWho = (G: GL, w: Who, cam: Cam) => {
  const rig = LRIGS[w.rig];
  const B = bonesOf(w);
  const A = mul(camAff(cam), placeAff(rig, w.x, w.y, w.s, w.flip));
  const BA = (b?: string) => (b && B[b] ? mul(A, boneAff(B[b])) : A);
  const group = (gname: string) => {
    const g = rig.groups.find((q) => q.name === gname);
    if (!g) return;
    for (const p of g.parts) if (p.ink) quad(G, 'layers/' + p.ink.png, BA(p.bone), p.ink.x0, p.ink.y0, p.ink.w, p.ink.h);
    for (const p of g.parts) {
      if (p.mesh && p.v && p.t && p.w && p.bones) {
        const key = w.rig + p.name;
        if (!meshCache[key]) {
          const n = p.v.length / 2;
          const uv = new Float32Array(n * 2);
          for (let i = 0; i < n; i++) {
            uv[i * 2] = (p.v[i * 2] - p.mesh.x0) / p.mesh.w;
            uv[i * 2 + 1] = (p.v[i * 2 + 1] - p.mesh.y0) / p.mesh.h;
          }
          meshCache[key] = {uv, idx: new Uint16Array(p.t)};
        }
        const Ms = p.bones.map((b) => BA(b));
        const n = p.v.length / 2;
        const k = p.bones.length;
        const pos = new Float32Array(n * 2);
        for (let i = 0; i < n; i++) {
          let ox = 0;
          let oy = 0;
          for (let j = 0; j < k; j++) {
            const wt = p.w[i * k + j];
            if (wt <= 0) continue;
            const q = apply(Ms[j], [p.v[i * 2], p.v[i * 2 + 1]]);
            ox += wt * q[0];
            oy += wt * q[1];
          }
          pos[i * 2] = ox;
          pos[i * 2 + 1] = oy;
        }
        draw(G, 'layers/' + p.mesh.png, pos, meshCache[key].uv, meshCache[key].idx);
      } else if (p.fill) quad(G, 'layers/' + p.fill.png, BA(p.bone), p.fill.x0, p.fill.y0, p.fill.w, p.fill.h);
    }
  };
  const sprite = (name: string) => {
    if (name === 'face') {
      const H = BA('head');
      const mb = rig.face.mouth;
      const mk = `layers/mouth_${w.rig}_${w.mouth ?? 'rest'}.png`;
      const [mw, mh] = G.meta[mk];
      const ox = w.rig === 'rtq' ? mb[0] : mb[0] - 2;
      const oy = w.rig === 'rtq' ? mb[1] + 2 : mb[1] - 2;
      quad(G, mk, H, ox, oy, mw, mh);
      if (w.lid) {
        const lk = `layers/lid_${w.rig}_${w.lid === 2 ? 'closed' : 'half'}.png`;
        const o = w.rig === 'rtq' ? SPR.lid_rtq : SPR.lid_gprof;
        const [lw, lh] = G.meta[lk];
        quad(G, lk, H, o[0], o[1], lw, lh);
      }
    }
    if (name === 'bell' && w.bell) {
      const M = BA('hand');
      const J = rig.joints;
      const wr = apply(boneAff(B.hand), J.wrist);
      const k = w.bell.scale ?? 1;
      // il kettlebell resta dritto (gravità): uso solo la posizione del polso
      quad(G, `toon/kb_${w.bell.color ?? 'teal'}.png`, A, wr[0] - 120 * k + 22, wr[1] - 46 * k, 240 * k, 290 * k);
      void M;
    }
    for (const side of ['L', 'R'] as const) {
      const hk = side === 'L' ? w.handL : w.handR;
      if (name !== 'hand' + side || !hk || hk === 'art') continue;
      const M = BA(side + '_h');
      const [wx, wy] = rig.joints[side + '_wr'];
      const hs = SPR.hand_rtq;
      const k = side === 'R' ? 0.86 : 1;
      quad(G, `layers/hand_rtq_${hk}.png`, M, wx - hs.wrist[0] * k, wy - hs.wrist[1] * k, hs.size[0] * k, hs.size[1] * k);
    }
  };
  for (const o of ORDER[w.rig]) {
    if (typeof o === 'string') {
      const hk = o === 'armL' ? w.handL : o === 'armR' ? w.handR : undefined;
      if (hk && hk !== 'art') {
        // braccio senza la mano originale (sostituita dallo sprite)
        const g = rig.groups.find((q) => q.name === o)!;
        const saved = g.parts;
        g.parts = saved.filter((p) => p.name !== 'hand');
        group(o);
        g.parts = saved;
      } else group(o);
    } else sprite(o.sprite);
  }
};

/* ------------------------------------------------------------------ palco */
export const LStage: React.FC<{cam: Cam; who: Who[]; bg?: string; props?: {src: string; x: number; y: number; w: number}[]; overlay?: React.ReactNode}> = ({cam, who, bg = 'toon/studio.png', props = []}) => {
  const ref = useRef<HTMLCanvasElement>(null);
  const glr = useRef<GL | null>(null);
  const [ready, setReady] = useState(false);
  const [h] = useState(() => delayRender('livelli'));
  useEffect(() => {
    loadAll().then(() => {
      setReady(true);
      continueRender(h);
    });
  }, [h]);
  useLayoutEffect(() => {
    if (!ready || !ref.current) return;
    glr.current ??= initGL(ref.current);
    const G = glr.current;
    G.gl.viewport(0, 0, 1080, 1920);
    G.gl.clearColor(0, 0, 0, 0);
    G.gl.clear(G.gl.COLOR_BUFFER_BIT);
    for (const w of who) drawWho(G, w, cam);
  });
  const z = 1920 / cam.h;
  const C = camAff(cam);
  return (
    <div style={{position: 'absolute', inset: 0, overflow: 'hidden', background: '#45454D'}}>
      <Img src={staticFile(bg)} style={{position: 'absolute', left: 540 - cam.cx * z, top: 960 - cam.cy * z, width: 1536 * z, height: 1024 * z}} />
      {props.map((p, i) => {
        const q = apply(C, [p.x, p.y]);
        return <Img key={i} src={staticFile(p.src)} style={{position: 'absolute', left: q[0] - (p.w * z) / 2, top: q[1] - p.w * z * 1.2, width: p.w * z}} />;
      })}
      {who.map((w) => {
        const p = apply(C, [w.x, w.y]);
        const sw = 400 * w.s * z;
        return <div key={'s' + w.id} style={{position: 'absolute', left: p[0] - sw / 2, top: p[1] - sw * 0.09, width: sw, height: sw * 0.18, borderRadius: '50%', background: 'radial-gradient(ellipse at center, rgba(10,10,20,.42) 0%, rgba(10,10,20,.18) 50%, rgba(10,10,20,0) 72%)'}} />;
      })}
      <canvas ref={ref} width={1080} height={1920} style={{position: 'absolute', left: 0, top: 0}} />
      {who.map((w) => {
        if (w.rig !== 'gprof' || !w.glow?.lumbar) return null;
        const B = profBones(w.prof ?? {});
        const M = mul(mul(C, placeAff(LRIGS.gprof, w.x, w.y, w.s, w.flip)), boneAff(B.trunk));
        return (
          <div key={'gl' + w.id} style={{position: 'absolute', left: 0, top: 0, transformOrigin: '0 0', transform: `matrix(${M.join(',')})`}}>
            <div style={{position: 'absolute', left: 455 - 190, top: 930 - 190, width: 380, height: 380, borderRadius: '50%', background: 'radial-gradient(circle, #E5484DAA 0%, #E5484D55 40%, #E5484D00 70%)', opacity: w.glow.lumbar}} />
          </div>
        );
      })}
    </div>
  );
};
