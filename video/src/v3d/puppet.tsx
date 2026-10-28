/** Marionette 2D ritagliate dai riferimenti originali (video/refs): i personaggi restano identici alle immagini,
 *  si muovono per pezzi (testa, busto, braccia, gambe) con pivot sulle articolazioni. */
import React from 'react';
import {Img, staticFile} from 'remotion';
import gprof from './rigs/gprof.json';
import gtq from './rigs/gtq.json';
import rfront from './rigs/rfront.json';
import rtq from './rigs/rtq.json';

type V2 = [number, number];
type Rig = {size: number[]; P: Record<string, number[] | number>; off: Record<string, number[]>; face: {eyes: number[][]; mouth: number[]; skin: number[]}};
export const RIGS: Record<string, Rig> = {gprof, gtq, rfront, rtq} as unknown as Record<string, Rig>;

/** metri per pixel di sprite (Riccardo ~1.85 m dalla suola alla punta dei capelli) */
export const M_PER_PX = 1.85 / 834;
const FOOT_X: Record<string, number> = {gprof: 212, gtq: 190, rfront: 160, rtq: 168};

const rot = (v: V2, a: number): V2 => [v[0] * Math.cos(a) - v[1] * Math.sin(a), v[0] * Math.sin(a) + v[1] * Math.cos(a)];
const add = (a: V2, b: V2): V2 => [a[0] + b[0], a[1] + b[1]];
const sub = (a: V2, b: V2): V2 => [a[0] - b[0], a[1] - b[1]];
const len = (a: V2) => Math.hypot(a[0], a[1]);
const ang = (a: V2) => Math.atan2(a[1], a[0]);
const pt = (r: Rig, k: string) => r.P[k] as V2;

/* ------------------------------------------------------------------ pezzo */
const Piece: React.FC<{rig: string; k: string; piv: V2; wp: V2; a: number; children?: React.ReactNode; filter?: string}> = ({rig, k, piv, wp, a, children, filter}) => {
  const r = RIGS[rig];
  const off = r.off[k];
  return (
    <div style={{position: 'absolute', left: 0, top: 0, width: r.size[0], height: r.size[1], transformOrigin: `${piv[0]}px ${piv[1]}px`, transform: `translate(${wp[0] - piv[0]}px,${wp[1] - piv[1]}px) rotate(${a}rad)`}}>
      {off && <Img src={staticFile(`rig/${rig}_${k}.png`)} style={{position: 'absolute', left: off[0], top: off[1], filter}} />}
      {children}
    </div>
  );
};

/** bocca (apertura m 0..1, ricavata dalla bocca originale schiacciata) + palpebre (b 0..1) */
const Face: React.FC<{rig: string; m: number; b: number; id: string}> = ({rig, m, b, id}) => {
  const r = RIGS[rig];
  const [x0, y0, x1, y1] = r.face.mouth;
  const sk = `rgb(${r.face.skin.join(',')})`;
  const off = r.off.head;
  const sy = 0.12 + 0.88 * Math.max(0, Math.min(1, m));
  return (
    <>
      <div style={{position: 'absolute', left: x0 - 3, top: y0 - 2, width: x1 - x0 + 6, height: y1 - y0 + 5, borderRadius: '45%', background: sk, filter: 'blur(1.5px)'}} />
      <div style={{position: 'absolute', left: x0, top: y0, width: x1 - x0, height: y1 - y0, overflow: 'hidden', transformOrigin: '50% 0%', transform: `scaleY(${sy})`}}>
        <Img src={staticFile(`rig/${rig}_head.png`)} style={{position: 'absolute', left: off[0] - x0, top: off[1] - y0}} />
      </div>
      {b > 0.02 && (
        <svg style={{position: 'absolute', left: 0, top: 0, overflow: 'visible'}} width={r.size[0]} height={r.size[1]}>
          {r.face.eyes.map(([cx, cy, w, h], i) => {
            const lid = cy - h / 2 - 3 + (h + 6) * b;
            return (
              <g key={i}>
                <clipPath id={`${id}e${i}`}>
                  <ellipse cx={cx} cy={cy} rx={w / 2 + 3} ry={h / 2 + 3} />
                </clipPath>
                <rect x={cx - w} y={cy - h} width={w * 2} height={lid - (cy - h)} fill={sk} clipPath={`url(#${id}e${i})`} />
                {b > 0.6 && <path d={`M${cx - w / 2} ${lid - 2} Q${cx} ${lid + 4} ${cx + w / 2} ${lid - 2}`} stroke="#111" strokeWidth={3.5} fill="none" strokeLinecap="round" />}
              </g>
            );
          })}
        </svg>
      )}
    </>
  );
};

/* ------------------------------------------------------------------ oggetti */
export const KB: React.FC<{x: number; y: number; s?: number; color?: string}> = ({x, y, s = 1, color = '#1F7A80'}) => (
  <svg style={{position: 'absolute', left: x - 60 * s, top: y - 22 * s, overflow: 'visible'}} width={120 * s} height={130 * s} viewBox="0 0 120 130">
    <path d="M30 52 C24 10 96 10 90 52" stroke="#2A2A2E" strokeWidth={13} fill="none" strokeLinecap="round" />
    <path d="M32 50 C27 16 93 16 88 50" stroke="#55555c" strokeWidth={4} fill="none" strokeLinecap="round" opacity={0.6} />
    <ellipse cx={60} cy={86} rx={44} ry={40} fill={color} stroke="#16302f" strokeWidth={3} />
    <ellipse cx={46} cy={72} rx={14} ry={10} fill="#fff" opacity={0.28} />
    <rect x={30} y={118} width={60} height={9} rx={4} fill="#163638" />
  </svg>
);
const Glow: React.FC<{x: number; y: number; r: number; c: string; o: number}> = ({x, y, r, c, o}) =>
  o > 0.01 ? <div style={{position: 'absolute', left: x - r, top: y - r, width: r * 2, height: r * 2, borderRadius: '50%', background: `radial-gradient(circle, ${c}CC 0%, ${c}66 38%, ${c}00 70%)`, opacity: o * 0.75}} /> : null;
export const Phone: React.FC<{x: number; y: number; a?: number; s?: number; screen?: boolean}> = ({x, y, a = 0, s = 1, screen}) => (
  <div style={{position: 'absolute', left: x - 22 * s, top: y - 40 * s, width: 44 * s, height: 80 * s, borderRadius: 9 * s, background: '#18181c', border: `${3 * s}px solid #2c2c33`, transform: `rotate(${a}rad)`, boxShadow: '0 4px 8px rgba(0,0,0,.25)', overflow: 'hidden'}}>
    <div style={{position: 'absolute', inset: 4 * s, borderRadius: 6 * s, background: screen ? 'linear-gradient(160deg,#8f6ae0,#6D3BD2)' : '#26262c'}}>
      {screen && <div style={{position: 'absolute', left: '50%', top: '50%', width: 0, height: 0, borderLeft: `${12 * s}px solid #fff`, borderTop: `${8 * s}px solid transparent`, borderBottom: `${8 * s}px solid transparent`, transform: 'translate(-40%,-50%)'}} />}
    </div>
  </div>
);

/* ------------------------------------------------------------------ ragazza di profilo (squat) */
export type ProfPose = {sq?: number; heel?: number; lean?: number; wink?: number; ua?: number; fa?: number; head?: number; breath?: number};
export type ProfFx = {bell?: boolean; bellScale?: number; bellColor?: string; lumbar?: number; legs?: number; brace?: number; mouth?: number; blink?: number};
export const GOBLET = {ua: -0.35, fa: -2.2};
export const HAND_BACK = {ua: 0.5, fa: -1.1};

const ik = (H: V2, A: V2, Lt: number, Ls: number): V2 => {
  const d = sub(A, H);
  const L = Math.min(len(d), Lt + Ls - 1e-3);
  const u: V2 = [d[0] / len(d), d[1] / len(d)];
  const c = Math.acos(Math.max(-1, Math.min(1, (Lt * Lt + L * L - Ls * Ls) / (2 * Lt * L))));
  let n: V2 = [u[1], -u[0]];
  if (n[0] < 0) n = [-n[0], -n[1]];
  return [H[0] + u[0] * Lt * Math.cos(c) + n[0] * Lt * Math.sin(c), H[1] + u[1] * Lt * Math.cos(c) + n[1] * Lt * Math.sin(c)];
};

const GirlProfile: React.FC<{p: ProfPose; fx: ProfFx; id: string}> = ({p, fx, id}) => {
  const r = RIGS.gprof;
  const P = (k: string) => pt(r, k);
  const sq = p.sq ?? 0;
  const heel = p.heel ?? 0;
  const wink = p.wink ?? 0;
  const Lt = len(sub(P('knee'), P('hip')));
  const Ls = len(sub(P('ankle'), P('knee')));
  const T = P('toe');
  const Aw = add(T, rot(sub(P('ankle'), T), heel));
  const Hw = add(P('hip'), [-112 * sq + 30 * heel, 158 * sq - 6 * heel + (p.breath ?? 0)]);
  const Kw = ik(Hw, Aw, Lt, Ls);
  const th = ang(sub(Kw, Hw)) - ang(sub(P('knee'), P('hip')));
  const sh = ang(sub(Aw, Kw)) - ang(sub(P('ankle'), P('knee')));
  const lean = p.lean ?? 0.62 * sq;
  const tr = lean - wink * 0.25;
  const Nw = add(Hw, rot(sub(P('neck'), P('hip')), tr));
  const Sw = add(Hw, rot(sub(P('shoulder'), P('hip')), tr));
  const ua = tr + (p.ua ?? 0);
  const Ew = add(Sw, rot(sub(P('elbow'), P('shoulder')), ua));
  const fa = ua + (p.fa ?? 0);
  const hand: V2 = [236, 598];
  const bs = fx.bellScale ?? 1;
  return (
    <>
      <Piece rig="gprof" k="shin" piv={P('knee')} wp={Kw} a={sh}>
        <Glow x={200} y={760} r={70} c="#8B5CF6" o={(fx.legs ?? 0) * 0.8} />
      </Piece>
      <Piece rig="gprof" k="foot" piv={T} wp={T} a={heel} />
      <Piece rig="gprof" k="thigh" piv={P('hip')} wp={Hw} a={th}>
        <Glow x={210} y={640} r={95} c="#8B5CF6" o={(fx.legs ?? 0) * 0.9} />
      </Piece>
      <Piece rig="gprof" k="trunk" piv={P('hip')} wp={Hw} a={tr}>
        <Glow x={182} y={478} r={95} c="#E5484D" o={fx.lumbar ?? 0} />
        {(fx.brace ?? 0) > 0.01 && (
          <div style={{position: 'absolute', left: 150, top: 420, width: 175, height: 70, borderRadius: '50%', border: '9px solid #6D3BD2', opacity: fx.brace, transform: `scale(${1.06 - 0.08 * (fx.brace ?? 0)})`, boxShadow: '0 0 18px #6D3BD2'}} />
        )}
      </Piece>
      <Piece rig="gprof" k="neck" piv={P('hip')} wp={Hw} a={tr} />
      <Piece rig="gprof" k="head" piv={P('neck')} wp={Nw} a={tr * 0.35 + (p.head ?? 0)}>
        <Face rig="gprof" m={fx.mouth ?? 0} b={fx.blink ?? 0} id={id} />
      </Piece>
      <Piece rig="gprof" k="uarm" piv={P('shoulder')} wp={Sw} a={ua} />
      <Piece rig="gprof" k="farm" piv={P('elbow')} wp={Ew} a={fa}>
        {fx.bell && (
          <div style={{position: 'absolute', left: hand[0], top: hand[1], transform: `rotate(${-fa}rad)`}}>
            <div style={{position: 'absolute', left: 0, top: 0, transform: `scale(${bs})`, transformOrigin: '0 0'}}>
              <KB x={18} y={6} s={0.82} color={fx.bellColor} />
            </div>
          </div>
        )}
      </Piece>
      {/* la mano vicina va sopra al kettlebell: ridisegno solo l'avambraccio */}
      {fx.bell && <Piece rig="gprof" k="farm" piv={P('elbow')} wp={Ew} a={fa} />}
    </>
  );
};

/* ------------------------------------------------------------------ viste fronte / tre quarti */
export type ArmP = [number, number];
export type StandPose = {L?: ArmP; R?: ArmP; head?: number; mouth?: number; blink?: number; phone?: 'L' | 'R'; phoneScreen?: boolean; bob?: number};
const HANDS: Record<string, Record<string, V2>> = {rfront: {L: [30, 600], R: [290, 600]}, rtq: {L: [70, 605], R: [296, 596]}};

const Stand: React.FC<{rig: string; p: StandPose; id: string}> = ({rig, p, id}) => {
  const r = RIGS[rig];
  const P = (k: string) => pt(r, k);
  const arms = (['L', 'R'] as const).filter((s) => r.off[`${s}_u`]);
  const bob = p.bob ?? 0;
  const N = add(P('neck'), [0, bob]);
  const geo = Object.fromEntries(
    arms.map((s) => {
      const [a, b] = (p[s] ?? [0, 0]) as ArmP;
      const sh = add(P(`${s}_sh`), [0, bob]);
      const E = add(sh, rot(sub(P(`${s}_el`), P(`${s}_sh`)), a));
      return [s, {sh, E, a, f: a + b}];
    }),
  ) as Record<string, {sh: V2; E: V2; a: number; f: number}>;
  return (
    <>
      {arms.map((s) => (
        <Piece key={s + 'u'} rig={rig} k={`${s}_u`} piv={P(`${s}_sh`)} wp={geo[s].sh} a={geo[s].a} />
      ))}
      <Piece rig={rig} k="body" piv={P('neck')} wp={N} a={0} />
      <Piece rig={rig} k="head" piv={P('neck')} wp={N} a={p.head ?? 0}>
        <Face rig={rig} m={p.mouth ?? 0} b={p.blink ?? 0} id={id} />
      </Piece>
      {arms.map((s) => (
        <Piece key={s + 'f'} rig={rig} k={`${s}_f`} piv={P(`${s}_el`)} wp={geo[s].E} a={geo[s].f}>
          {p.phone === s && <Phone x={HANDS[rig][s][0] + (s === 'R' ? -6 : 6)} y={HANDS[rig][s][1] - 22} a={Math.PI - 0.15} s={1.15} screen={p.phoneScreen} />}
        </Piece>
      ))}
    </>
  );
};

/* ------------------------------------------------------------------ posizionamento in scena */
export type PuppetProps = {
  rig: 'gprof' | 'gtq' | 'rfront' | 'rtq';
  /** punto a terra in pixel schermo */
  x: number;
  y: number;
  /** pixel schermo per metro alla profondità del personaggio */
  ppm: number;
  flip?: boolean;
  prof?: ProfPose;
  fx?: ProfFx;
  stand?: StandPose;
  id: string;
};
export const Puppet: React.FC<PuppetProps> = ({rig, x, y, ppm, flip, prof, fx, stand, id}) => {
  const r = RIGS[rig];
  const s = ppm * M_PER_PX;
  const fxX = FOOT_X[rig];
  const floor = r.P.floor as number;
  return (
    <>
      <div style={{position: 'absolute', left: x - 0.36 * ppm, top: y - 0.07 * ppm, width: 0.72 * ppm, height: 0.14 * ppm, borderRadius: '50%', background: 'radial-gradient(ellipse at center, rgba(40,25,15,.42) 0%, rgba(40,25,15,.18) 50%, rgba(40,25,15,0) 72%)'}} />
      <div style={{position: 'absolute', left: x, top: y, width: 0, height: 0}}>
        <div style={{position: 'absolute', left: 0, top: 0, width: r.size[0], height: r.size[1], transformOrigin: '0 0', transform: `scale(${flip ? -s : s},${s}) translate(${-fxX}px,${-floor}px)`}}>
          {rig === 'gprof' ? <GirlProfile p={prof ?? {}} fx={fx ?? {}} id={id} /> : <Stand rig={rig} p={stand ?? {}} id={id} />}
        </div>
      </div>
    </>
  );
};
