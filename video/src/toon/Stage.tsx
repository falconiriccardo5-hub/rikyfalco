/** Palco 2D: sfondo dello studio (illustrazione vettoriale) + personaggi 2D deformati (WebGL solo come rasterizzatore 2D). */
import React, {useEffect, useLayoutEffect, useMemo, useRef, useState} from 'react';
import {continueRender, delayRender, Img, staticFile} from 'remotion';
import {Aff, apply, ArmP, Bone, boneAff, Cam, camAff, gtqBones, mul, placeAff, profBones, ProfPose, RIGS, RigName, skin, StandPose, standBones, V2} from './engine';

export type ToonChar = {
  id: string;
  rig: RigName;
  /** piedi nel mondo (px dello studio 1536x1024) */
  x: number;
  y: number;
  /** scala tavola -> mondo */
  s: number;
  flip?: boolean;
  stand?: StandPose;
  prof?: ProfPose;
  mouth?: number;
  blink?: number;
  bell?: {scale?: number; color?: 'teal' | 'yellow'};
  phone?: 'L' | 'R';
  phoneScreen?: boolean;
  fx?: {lumbar?: number; legs?: number; brace?: number};
};

const BG = 'toon/studio.png';
const BELL: Record<string, string> = {teal: 'toon/kb_teal.png', yellow: 'toon/kb_yellow.png'};
const BELL_SIZE: V2 = [240, 290]; // px tavola
const ALL_TEX = [...Object.values(RIGS).flatMap((r) => r.layers.map((l) => 'toon/' + l.png)), ...Object.values(BELL)];

/* ------------------------------------------------------------------ caricamento texture */
const imgCache: Record<string, HTMLImageElement> = {};
let loading: Promise<void> | null = null;
const loadAll = () => {
  if (!loading) {
    loading = Promise.all(
      ALL_TEX.map(
        (p) =>
          new Promise<void>((res, rej) => {
            const im = new Image();
            im.onload = () => {
              imgCache[p] = im;
              res();
            };
            im.onerror = () => rej(new Error('texture ' + p));
            im.src = staticFile(p);
          }),
      ),
    ).then(() => undefined);
  }
  return loading;
};

export const bonesOf = (c: ToonChar): Record<string, Bone> => {
  const rig = RIGS[c.rig];
  if (c.rig === 'gprof') return profBones(rig, c.prof ?? {});
  if (c.rig === 'gtq') return gtqBones(rig, c.stand ?? {});
  return standBones(rig, c.stand ?? {});
};
export const charAff = (c: ToonChar, cam: Cam): Aff => mul(camAff(cam), placeAff(RIGS[c.rig], c.x, c.y, c.s, c.flip));

/* ------------------------------------------------------------------ WebGL */
const VS = `#version 300 es
in vec2 p; in vec2 uv; out vec2 v;
void main(){ v=uv; gl_Position=vec4(p.x/540.0-1.0, 1.0-p.y/960.0, 0.0, 1.0); }`;
const FS = `#version 300 es
precision mediump float; in vec2 v; uniform sampler2D t; out vec4 o;
void main(){ o=texture(t,v); }`;

type GLState = {gl: WebGL2RenderingContext; prog: WebGLProgram; tex: Record<string, WebGLTexture>; pbuf: WebGLBuffer; ubuf: WebGLBuffer; ibuf: WebGLBuffer; locP: number; locU: number};
const initGL = (cv: HTMLCanvasElement): GLState => {
  const gl = cv.getContext('webgl2', {premultipliedAlpha: true, preserveDrawingBuffer: true, antialias: true, alpha: true}) as WebGL2RenderingContext;
  const sh = (type: number, src: string) => {
    const s = gl.createShader(type)!;
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s) ?? 'shader');
    return s;
  };
  const prog = gl.createProgram()!;
  gl.attachShader(prog, sh(gl.VERTEX_SHADER, VS));
  gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FS));
  gl.linkProgram(prog);
  gl.useProgram(prog);
  const tex: Record<string, WebGLTexture> = {};
  gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
  for (const p of ALL_TEX) {
    const t = gl.createTexture()!;
    gl.bindTexture(gl.TEXTURE_2D, t);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, imgCache[p]);
    gl.generateMipmap(gl.TEXTURE_2D);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    tex[p] = t;
  }
  gl.enable(gl.BLEND);
  gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
  return {gl, prog, tex, pbuf: gl.createBuffer()!, ubuf: gl.createBuffer()!, ibuf: gl.createBuffer()!, locP: gl.getAttribLocation(prog, 'p'), locU: gl.getAttribLocation(prog, 'uv')};
};

const drawTris = (S: GLState, texKey: string, pos: Float32Array, uv: Float32Array, idx: Uint16Array) => {
  const {gl} = S;
  gl.bindTexture(gl.TEXTURE_2D, S.tex[texKey]);
  gl.bindBuffer(gl.ARRAY_BUFFER, S.pbuf);
  gl.bufferData(gl.ARRAY_BUFFER, pos, gl.DYNAMIC_DRAW);
  gl.enableVertexAttribArray(S.locP);
  gl.vertexAttribPointer(S.locP, 2, gl.FLOAT, false, 0, 0);
  gl.bindBuffer(gl.ARRAY_BUFFER, S.ubuf);
  gl.bufferData(gl.ARRAY_BUFFER, uv, gl.DYNAMIC_DRAW);
  gl.enableVertexAttribArray(S.locU);
  gl.vertexAttribPointer(S.locU, 2, gl.FLOAT, false, 0, 0);
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, S.ibuf);
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, idx, gl.DYNAMIC_DRAW);
  gl.drawElements(gl.TRIANGLES, idx.length, gl.UNSIGNED_SHORT, 0);
};

/* dati statici per strato: uv, indici, sotto-insieme "davanti" (avambraccio) */
type LayerData = {uv: Float32Array; idx: Uint16Array; front?: Uint16Array};
const LD: Record<string, LayerData> = {};
const layerData = (rig: RigName, li: number): LayerData => {
  const key = rig + li;
  if (LD[key]) return LD[key];
  const r = RIGS[rig];
  const L = r.layers[li];
  const n = L.v.length / 2;
  const uv = new Float32Array(n * 2);
  for (let i = 0; i < n; i++) {
    uv[i * 2] = (L.v[i * 2] - L.x0) / L.w;
    uv[i * 2 + 1] = (L.v[i * 2 + 1] - L.y0) / L.h;
  }
  const idx = new Uint16Array(L.t);
  let front: Uint16Array | undefined;
  const fb = L.name.endsWith('_arm') ? r.bones.indexOf(L.name[0] + '_f') : -1;
  if (fb >= 0) {
    const wf = (i: number) => {
      let w = 0;
      for (let k = 0; k < 3; k++) if (L.bi[i * 3 + k] === fb) w += L.bw[i * 3 + k];
      return w;
    };
    const f: number[] = [];
    for (let t = 0; t < L.t.length; t += 3) {
      const a = L.t[t];
      const b = L.t[t + 1];
      const c = L.t[t + 2];
      if ((wf(a) + wf(b) + wf(c)) / 3 > 0.5) f.push(a, b, c);
    }
    front = new Uint16Array(f);
  }
  LD[key] = {uv, idx, front};
  return LD[key];
};

const drawChar = (S: GLState, c: ToonChar, cam: Cam) => {
  const r = RIGS[c.rig];
  const B = bonesOf(c);
  const A = charAff(c, cam);
  const toScreen = (pos: Float32Array) => {
    const o = new Float32Array(pos.length);
    for (let i = 0; i < pos.length; i += 2) {
      o[i] = A[0] * pos[i] + A[2] * pos[i + 1] + A[4];
      o[i + 1] = A[1] * pos[i] + A[3] * pos[i + 1] + A[5];
    }
    return o;
  };
  const layer = (name: string, part: 'all' | 'front' = 'all') => {
    const li = r.layers.findIndex((l) => l.name === name);
    if (li < 0) return;
    const d = layerData(c.rig, li);
    const idx = part === 'front' ? d.front : d.idx;
    if (!idx || idx.length === 0) return;
    drawTris(S, 'toon/' + r.layers[li].png, toScreen(skin(r, r.layers[li], B)), d.uv, idx);
  };
  const bell = () => {
    if (!c.bell) return;
    const R = r.rest as Record<string, V2>;
    const w = apply(boneAff(B.farm), R.wrist);
    const k = c.bell.scale ?? 1;
    const [bw, bh] = BELL_SIZE;
    const x0 = w[0] - (bw / 2) * k + 18;
    const y0 = w[1] - 40 * k;
    const q: V2[] = [[x0, y0], [x0 + bw * k, y0], [x0, y0 + bh * k], [x0 + bw * k, y0 + bh * k]];
    const pos = new Float32Array(q.flatMap((p) => apply(A, p)));
    drawTris(S, BELL[c.bell.color ?? 'teal'], pos, new Float32Array([0, 0, 1, 0, 0, 1, 1, 1]), new Uint16Array([0, 1, 2, 1, 3, 2]));
  };
  if (c.rig === 'gprof') {
    layer('body');
    bell();
    layer('arm');
  } else if (c.rig === 'gtq') {
    layer('body');
  } else {
    layer('L_arm');
    layer('R_arm');
    layer('body');
    layer('L_arm', 'front');
    layer('R_arm', 'front');
  }
};

/* ------------------------------------------------------------------ sovrapposizioni (volto, telefono, aloni) */
const css = (m: Aff) => `matrix(${m.join(',')})`;
const Face: React.FC<{c: ToonChar; cam: Cam; B: Record<string, Bone>}> = ({c, cam, B}) => {
  const r = RIGS[c.rig];
  const M = mul(charAff(c, cam), boneAff(B.head));
  const [x0, y0, x1, y1] = r.face.mouth;
  const m = Math.max(0, Math.min(1, c.mouth ?? 0));
  const sy = 0.1 + 0.9 * m;
  const sk = `rgb(${r.face.skin.join(',')})`;
  const b = c.blink ?? 0;
  return (
    <div style={{position: 'absolute', left: 0, top: 0, width: 0, height: 0, transformOrigin: '0 0', transform: css(M)}}>
      <div style={{position: 'absolute', left: x0 - 4, top: y0 - 3, width: x1 - x0 + 8, height: y1 - y0 + 7, borderRadius: '42%', background: sk}} />
      <div style={{position: 'absolute', left: x0, top: y0, width: x1 - x0, height: y1 - y0, overflow: 'hidden', transformOrigin: '50% 0%', transform: `scaleY(${sy})`}}>
        <Img src={staticFile(`toon/${c.rig}_mouth.png`)} style={{position: 'absolute', left: 0, top: 0, width: x1 - x0, height: y1 - y0}} />
      </div>
      {b > 0.02 && (
        <svg style={{position: 'absolute', left: 0, top: 0, overflow: 'visible'}} width={10} height={10}>
          {r.face.eyes.map(([cx, cy, w, h], i) => {
            const lid = cy - h / 2 - 6 + (h + 12) * b;
            return (
              <g key={i}>
                <clipPath id={`${c.id}e${i}`}>
                  <ellipse cx={cx} cy={cy} rx={w / 2 + 6} ry={h / 2 + 6} />
                </clipPath>
                <rect x={cx - w} y={cy - h} width={w * 2} height={lid - (cy - h)} fill={sk} clipPath={`url(#${c.id}e${i})`} />
                {b > 0.55 && <path d={`M${cx - w / 2 - 2} ${lid - 3} Q${cx} ${lid + 7} ${cx + w / 2 + 2} ${lid - 3}`} stroke="#141414" strokeWidth={9} fill="none" strokeLinecap="round" />}
              </g>
            );
          })}
        </svg>
      )}
    </div>
  );
};

const PhoneOv: React.FC<{c: ToonChar; cam: Cam; B: Record<string, Bone>}> = ({c, cam, B}) => {
  if (!c.phone) return null;
  const R = RIGS[c.rig].rest as Record<string, V2>;
  const M = mul(charAff(c, cam), boneAff(B[c.phone + '_f']));
  const w = R[c.phone + '_wr'];
  return (
    <div style={{position: 'absolute', left: 0, top: 0, width: 0, height: 0, transformOrigin: '0 0', transform: css(M)}}>
      <div style={{position: 'absolute', left: w[0] - 48, top: w[1] + 10, width: 96, height: 170, borderRadius: 18, background: '#1d1d22', border: '9px solid #111', transform: 'rotate(180deg)', overflow: 'hidden'}}>
        <div style={{position: 'absolute', inset: 6, borderRadius: 10, background: c.phoneScreen ? 'linear-gradient(160deg,#9a78e6,#6D3BD2)' : '#2c2c34'}}>
          {c.phoneScreen && <div style={{position: 'absolute', left: '50%', top: '50%', width: 0, height: 0, borderLeft: '26px solid #fff', borderTop: '17px solid transparent', borderBottom: '17px solid transparent', transform: 'translate(-40%,-50%) rotate(180deg)'}} />}
        </div>
      </div>
    </div>
  );
};

const Glow: React.FC<{M: Aff; x: number; y: number; r: number; c: string; o: number}> = ({M, x, y, r, c, o}) =>
  o > 0.01 ? (
    <div style={{position: 'absolute', left: 0, top: 0, width: 0, height: 0, transformOrigin: '0 0', transform: css(M)}}>
      <div style={{position: 'absolute', left: x - r, top: y - r, width: r * 2, height: r * 2, borderRadius: '50%', background: `radial-gradient(circle, ${c}AA 0%, ${c}55 40%, ${c}00 70%)`, opacity: o}} />
    </div>
  ) : null;

const FxOv: React.FC<{c: ToonChar; cam: Cam; B: Record<string, Bone>}> = ({c, cam, B}) => {
  if (c.rig !== 'gprof' || !c.fx) return null;
  const A = charAff(c, cam);
  const br = c.fx.brace ?? 0;
  return (
    <>
      <Glow M={mul(A, boneAff(B.trunk))} x={455} y={930} r={190} c="#E5484D" o={c.fx.lumbar ?? 0} />
      <Glow M={mul(A, boneAff(B.thigh))} x={500} y={1200} r={200} c="#7C4DFF" o={(c.fx.legs ?? 0) * 0.9} />
      <Glow M={mul(A, boneAff(B.shin))} x={480} y={1420} r={150} c="#7C4DFF" o={(c.fx.legs ?? 0) * 0.7} />
      {br > 0.01 && (
        <div style={{position: 'absolute', left: 0, top: 0, width: 0, height: 0, transformOrigin: '0 0', transform: css(mul(A, boneAff(B.trunk)))}}>
          <div style={{position: 'absolute', left: 405, top: 800, width: 330, height: 130, borderRadius: '50%', border: '18px solid #6D3BD2', opacity: br, transform: `scale(${1.08 - 0.1 * br})`, boxShadow: '0 0 30px #6D3BD2'}} />
        </div>
      )}
    </>
  );
};

/* ------------------------------------------------------------------ palco */
export type Prop = {src: string; x: number; y: number; w: number};
export const Stage: React.FC<{cam: Cam; chars: ToonChar[]; bgFilter?: string; props?: Prop[]}> = ({cam, chars, bgFilter, props = []}) => {
  const ref = useRef<HTMLCanvasElement>(null);
  const [ready, setReady] = useState(false);
  const [handle] = useState(() => delayRender('texture 2D'));
  const glRef = useRef<GLState | null>(null);
  useEffect(() => {
    loadAll().then(() => {
      setReady(true);
      continueRender(handle);
    });
  }, [handle]);
  useLayoutEffect(() => {
    if (!ready || !ref.current) return;
    if (!glRef.current) glRef.current = initGL(ref.current);
    const S = glRef.current;
    S.gl.viewport(0, 0, 1080, 1920);
    S.gl.clearColor(0, 0, 0, 0);
    S.gl.clear(S.gl.COLOR_BUFFER_BIT);
    for (const c of chars) drawChar(S, c, cam);
  });
  const z = 1920 / cam.h;
  const bones = useMemo(() => chars.map((c) => bonesOf(c)), [chars]);
  return (
    <div style={{position: 'absolute', inset: 0, overflow: 'hidden', background: '#45454D'}}>
      <Img src={staticFile(BG)} style={{position: 'absolute', left: 540 - cam.cx * z, top: 960 - cam.cy * z, width: 1536 * z, height: 1024 * z, filter: bgFilter}} />
      {chars.map((c) => {
        const p = apply(camAff(cam), [c.x, c.y]);
        const w = 130 * c.s * z * 3.2;
        return <div key={'sh' + c.id} style={{position: 'absolute', left: p[0] - w / 2, top: p[1] - w * 0.09, width: w, height: w * 0.18, borderRadius: '50%', background: 'radial-gradient(ellipse at center, rgba(10,10,20,.45) 0%, rgba(10,10,20,.2) 50%, rgba(10,10,20,0) 72%)'}} />;
      })}
      {props.map((p, i) => {
        const q = apply(camAff(cam), [p.x, p.y]);
        return <Img key={'pr' + i} src={staticFile(p.src)} style={{position: 'absolute', left: q[0] - (p.w * z) / 2, top: q[1] - p.w * z * 1.2, width: p.w * z}} />;
      })}
      <canvas ref={ref} width={1080} height={1920} style={{position: 'absolute', left: 0, top: 0, width: 1080, height: 1920}} />
      {chars.map((c, i) => (
        <React.Fragment key={c.id}>
          <FxOv c={c} cam={cam} B={bones[i]} />
          <Face c={c} cam={cam} B={bones[i]} />
          <PhoneOv c={c} cam={cam} B={bones[i]} />
        </React.Fragment>
      ))}
    </div>
  );
};
export type {ArmP, StandPose, ProfPose, Cam};
