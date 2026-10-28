/** Reel 3D «Squat: 3 errori che ti fanno male alla schiena» — Riccardo + ragazza allenata nello studio RF Coaching. */
import React, {useLayoutEffect, useMemo} from 'react';
import * as THREE from 'three';
import {AbsoluteFill, Audio, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {ThreeCanvas} from '@remotion/three';
import {useThree} from '@react-three/fiber';
import {C, E, FONT, OUT, mix, prog, useT} from '../brand';
import {Grain, cardStyle} from '../ui';
import {Captions, CapLine} from '../Captions';
import {Transitions, Tr} from '../Transitions';
import {Studio, StudioLights, useStudioTex, Kettlebell} from './studio';
import {Riky3D, Girl3D, basePose, squatPose, GOBLET_ARMS, Pose, Extras, Arm} from './chars';
import {CamSpec, mixCam, project} from './cam';
import {makeTiming, VT} from '../v13/reel';
import {repH, Tag, StepCard, Headline, KeywordCTA, Handle, Sparkles, Burst} from '../v13/kit';
import timing from '../voice20_timing.json';
import envR from '../voice20_env_r.json';
import envG from '../voice20_env_g.json';

const SL = ['s01', 's02', 's03', 's04', 'q05', 'q06', 'q07', 's08', 's09', 's10', 's11', 's12', 'q15', 'q16'];
const T = makeTiming(timing as (VT & {who: string})[], SL, 64);
export const DURATION20 = T.DURATION;
const {W, wd, v} = T;
const ER = envR as number[];
const EG = envG as number[];

/* ------------------------------------------------------------------ camere */
const cf = (look: [number, number, number], yaw: number, pitch: number, dist: number, fov: number): CamSpec => ({
  look,
  fov,
  pos: [look[0] + Math.sin(yaw) * Math.cos(pitch) * dist, look[1] + Math.sin(pitch) * dist, look[2] + Math.cos(yaw) * Math.cos(pitch) * dist],
});
const GX = -0.2;
const GZ = 0.6;
const RX = 0.8;
const RZ = 0.9;
const CAM: Record<string, CamSpec> = {
  wide: cf([0.3, 0.75, 0.6], 0.15, 0.16, 7.6, 40),
  two: cf([0.3, 0.68, 0.75], 0.0, 0.07, 6.3, 36),
  girl: cf([GX, 0.62, GZ], 0.35, 0.05, 5.1, 36),
  riky: cf([RX, 1.0, RZ], -0.2, 0.04, 3.9, 36),
  side: cf([GX, 0.8, GZ], -Math.PI / 2, 0.03, 7.4, 36),
  sideClose: cf([GX, 0.78, GZ], -Math.PI / 2 + 0.15, 0.03, 6.6, 34),
  feet: cf([GX, 0.2, GZ + 0.05], -Math.PI / 2 + 0.3, 0.1, 2.3, 34),
};
const dolly = (a: CamSpec, k = 0.06): CamSpec => ({...a, pos: [a.pos[0] + (a.look[0] - a.pos[0]) * k, a.pos[1] + (a.look[1] - a.pos[1]) * k, a.pos[2] + (a.look[2] - a.pos[2]) * k]});

/* ------------------------------------------------------------------ pose */
const B = basePose();
const GB: Pose = {...B, x: GX, z: GZ, ry: 0.5};
const GS: Pose = {...B, x: GX, z: GZ, ry: 0}; // di profilo per la camera laterale
const RB: Pose = {...B, x: RX, z: RZ, ry: -0.8};
const RC: Pose = {...B, x: RX, z: RZ, ry: -0.25};

const blinkAt = (t: number, seed: number) => {
  const ph = (t + seed) % 3.4;
  return ph < 0.12 ? 1 - Math.abs(ph - 0.06) / 0.06 : 0;
};
const HAND_BACK: Arm = {sx: 0.75, sz: 0.45, ex: -1.7};
const WAG = (t: number): Arm => ({sx: -0.25, sz: 2.35 + Math.sin(t * 12) * 0.12, ex: -0.5});
const POINT: Arm = {sx: -1.15, sz: 0.35, ex: -0.25};
const SHRUG: Arm = {sx: -0.35, sz: 0.65, ex: -1.3};
const FILM: Arm = {sx: -1.45, sz: 0.1, ex: -0.55};
const WAVE = (t: number): Arm => ({sx: -0.2, sz: 2.5 + Math.sin(t * 9) * 0.25, ex: -0.3});

type State = {cam: CamSpec; girl: Pose; gx: Extras; riky: Pose; rx: Extras; bellFloor?: boolean; hideRiky?: boolean};

const sceneAt = (t: number, fr: number): State => {
  const tg = Math.min(0.9, (EG[fr] ?? 0) * 0.95);
  const tr = Math.min(0.9, (ER[fr] ?? 0) * 0.95);
  const s = SL.find((k) => t >= W[k][0] && t < W[k][1]) ?? SL[SL.length - 1];
  const [a, b] = W[s];
  const lp = prog(t, a, b, E.lin);
  const breath = Math.sin(t * 2.2) * 0.006;
  const g0 = (p: Pose, extra: Partial<Pose> = {}): Pose => ({...p, hipY: p.hipY + breath, blink: blinkAt(t, 0.7), mouth: tg, ...extra});
  const r0 = (p: Pose, extra: Partial<Pose> = {}): Pose => ({...p, hipY: p.hipY + breath * 0.8, blink: blinkAt(t, 2.1), mouth: tr, headX: Math.sin(t * 1.7) * 0.04, ...extra});
  const gob = (base: Pose, sq: number, hu = 0, wk = 0, extra: Partial<Pose> = {}): Pose => ({...squatPose(g0(base), sq, hu, wk), ...GOBLET_ARMS, ...extra});
  const w = wd(s);
  switch (s) {
    case 's01': {
      const stop = prog(t, w[5] - 0.2, w[6]);
      const sq = repH(t, a, 1.7, 0.03, 0.9) * (1 - stop);
      const back = prog(t, w[6], w[8]);
      return {
        cam: mixCam(CAM.wide, CAM.two, prog(t, a, b, E.inOut)),
        girl: back > 0.05 ? g0(GB, {armR: HAND_BACK, smile: -0.7}) : gob(GB, sq, 0.4, 0.6 * sq),
        gx: {goblet: back <= 0.05, lumbarGlow: Math.max(0.6 * sq, back) * (0.75 + 0.25 * Math.sin(t * 9))},
        riky: r0(RB, {mouth: 0, smile: 0.2}),
        rx: {},
        bellFloor: back > 0.05,
      };
    }
    case 's02':
      return {cam: dolly(CAM.riky, 0.08 * lp), girl: g0(GB, {armR: HAND_BACK, mouth: 0, smile: -0.3}), gx: {lumbarGlow: 0.5}, riky: r0(RC, {armR: WAG(t), smile: 0.8}), rx: {}, bellFloor: true};
    case 's03':
      return {cam: dolly(CAM.girl, 0.08 * lp), girl: g0(GB, {armR: HAND_BACK, smile: -0.6, ry: 0.25}), gx: {lumbarGlow: 0.8 + 0.2 * Math.sin(t * 8)}, riky: r0(RB, {mouth: 0}), rx: {}, bellFloor: true};
    case 's04':
      return {cam: dolly(CAM.two, 0.06 * lp), girl: g0(GB, {mouth: 0, smile: -0.2}), gx: {}, riky: r0(RB, {armL: SHRUG, armR: SHRUG, smile: 0.4}), rx: {}, bellFloor: true};
    case 'q05':
      return {cam: dolly(CAM.riky, 0.1 * lp), girl: g0(GB, {mouth: 0}), gx: {}, riky: r0(RC, {armR: WAG(t), smile: 0.3}), rx: {}, bellFloor: true};
    case 'q06': {
      const sq = repH(t, a + 0.1, 2.2, 0.03, 0.95);
      return {cam: mixCam(CAM.side, CAM.sideClose, prog(t, a, b, E.inOut)), girl: gob(GS, sq, 0.8 * sq, 0.8 * Math.max(0, sq - 0.6) / 0.4, {mouth: 0}), gx: {goblet: true, lumbarGlow: prog(t, w[13], w[15]) * sq, legGlow: (1 - prog(t, w[13], w[15])) * 0.6 * prog(t, w[11] - 0.2, w[11])}, riky: r0(RB), rx: {}, hideRiky: true};
    }
    case 'q07': {
      const step = prog(t, w[2] - 0.1, w[4], E.inOut) + prog(t, w[6], w[8], E.inOut);
      const sq = repH(t, a, 1.9, 0.03, 0.9);
      return {cam: dolly(CAM.side, 0.1 * lp), girl: gob(GS, sq, 0.5 * sq, 0.5 * sq * step / 2, {mouth: 0, smile: -0.3 * step}), gx: {goblet: true, bellScale: 1 + 0.25 * step, bellColor: step > 1.2 ? '#E7C437' : '#1F7A80', lumbarGlow: (step / 2) * sq}, riky: r0(RB), rx: {}, hideRiky: true};
    }
    case 's08': {
      const sq = t > w[2] ? repH(t, w[2], 2.2, 0.03, 0.85) : 0.03;
      return {cam: dolly(CAM.two, 0.05 * lp), girl: gob(GB, sq, 0.4 * sq, 0, {mouth: 0, ry: 0.15}), gx: {goblet: true}, riky: r0({...RB, ry: -1.3}, {armR: FILM}), rx: {phone: true}};
    }
    case 's09': {
      const fix = prog(t, w[11] - 0.1, w[11] + 0.4);
      const sq = repH(t, a + 0.1, 2.2, 0.03, 0.9);
      return {cam: mixCam(CAM.feet, dolly(CAM.side, 0.25), prog(t, w[6] - 0.2, w[8] + 0.2, E.inOut) * (1 - fix) + fix * 0.0), girl: gob(GS, sq, (1 - fix) * Math.min(1, sq * 1.3), 0, {mouth: 0}), gx: {goblet: true, legGlow: fix * 0.6 * sq}, riky: r0(RB), rx: {}, hideRiky: true};
    }
    case 's10': {
      const fix = prog(t, w[7] - 0.1, w[7] + 0.4);
      const sq = repH(t, a + 0.1, 2.3, 0.03, mix(1.0, 0.72, fix));
      const wk = (1 - fix) * Math.max(0, (sq - 0.7) / 0.3);
      return {cam: dolly(CAM.sideClose, 0.05 * lp), girl: gob(GS, sq, 0, wk, {mouth: 0}), gx: {goblet: true, lumbarGlow: wk}, riky: r0(RB), rx: {}, hideRiky: true};
    }
    case 's11': {
      const air = prog(t, w[4] - 0.1, w[5] + 0.3);
      const brace = prog(t, w[7] - 0.1, w[8] + 0.2);
      const sq = t > w[8] + 0.2 ? repH(t, w[8] + 0.2, 2.2, 0.03, 0.82) : 0.03;
      return {cam: dolly(CAM.girl, 0.05 * lp), girl: gob(GB, sq, 0, 0, {mouth: air > 0 && air < 1 ? 0.25 : 0, ry: 0.3}), gx: {goblet: true, brace, chest: air * (1 - brace * 0.6)}, riky: r0(RB), rx: {}};
    }
    case 's12': {
      const sq = repH(t, a, 2.0, 0.03, 0.85);
      return {cam: mixCam(CAM.two, CAM.girl, 0.4 + 0.2 * lp), girl: gob(GB, sq, 0, 0, {smile: 1, ry: 0.35}), gx: {goblet: true, legGlow: 0.7, brace: 0.6}, riky: r0(RB, {mouth: 0, smile: 1, armR: {sx: -0.6, sz: 0.6, ex: -1.6}}), rx: {}};
    }
    case 'q15':
      return {cam: dolly(CAM.riky, 0.06 * lp), girl: g0(GB, {mouth: 0, smile: 0.9}), gx: {}, riky: r0(RC, {armR: FILM, armL: POINT}), rx: {phone: true}, bellFloor: true};
    default:
      return {cam: dolly(CAM.riky, 0.12 * lp), girl: g0(GB, {mouth: 0, smile: 1}), gx: {}, riky: r0(RC, {armR: WAVE(t), smile: 1}), rx: {}, bellFloor: true};
  }
};

/** camera di scena: creata da noi e aggiornata già in fase di render (prima che ThreeCanvas avanzi il frame) */
const CamRig: React.FC<{c: CamSpec}> = ({c}) => {
  const set = useThree((st) => st.set);
  const cam = useMemo(() => new THREE.PerspectiveCamera(40, 1080 / 1920, 0.05, 60), []);
  cam.aspect = 1080 / 1920;
  cam.fov = c.fov;
  cam.position.set(...c.pos);
  cam.lookAt(...c.look);
  cam.updateProjectionMatrix();
  cam.updateMatrixWorld();
  useLayoutEffect(() => {
    set({camera: cam});
  }, [cam, set]);
  return null;
};

const World3D: React.FC = () => {
  const f = useCurrentFrame();
  const {width, height, fps} = useVideoConfig();
  const tex = useStudioTex();
  if (!tex) return null;
  const st = sceneAt(f / fps, f);
  return (
    <ThreeCanvas width={width} height={height} shadows style={{background: '#EADBC6'}}>
      <CamRig c={st.cam} />
      <StudioLights />
      <Studio tex={tex} />
      <Girl3D p={st.girl} x={st.gx} />
      {st.bellFloor && <Kettlebell p={[GX + 0.3, 0.0, GZ + 0.35]} c="#1F7A80" s={0.95} />}
      {!st.hideRiky && <Riky3D p={st.riky} x={st.rx} />}
    </ThreeCanvas>
  );
};

/* ------------------------------------------------------------------ overlay 2D */
const at = (s: string, p: [number, number, number]) => {
  const t0 = W[s][0];
  return project(sceneAt(t0 + 0.5, Math.round((t0 + 0.5) * 30)).cam, p);
};

const Overlays: React.FC = () => {
  const t = useT();
  const s = SL.find((k) => t >= W[k][0] && t < W[k][1]) ?? SL[SL.length - 1];
  const [a] = W[s];
  const w = wd(s);
  switch (s) {
    case 's01':
      return <Headline t0={0.15} lines={[{text: 'SQUAT'}, {text: 'MAL DI SCHIENA?', color: C.red}]} top={150} size={100} />;
    case 's02':
      return <Headline t0={w[2] - 0.1} lines={[{text: 'IL PROBLEMA'}, {text: 'NON È LO SQUAT', color: C.blue}]} top={150} size={92} />;
    case 's03':
      return (
        <>
          <Tag t0={w[3]} at={at('s03', [GX - 0.35, 1.25, GZ])} to={at('s03', [GX - 0.05, 0.9, GZ - 0.1])} text="TIRA IN BASSO" bg={C.red} fg="#fff" size={44} />
          <Tag t0={w[9]} at={[540, 300]} text="IL GIORNO DOPO: RIGIDA 😣" size={44} />
        </>
      );
    case 's04':
      return (
        <>
          <Tag t0={w[2]} at={[300, 330]} text="− PESO" size={56} rot={-4} />
          <Tag t0={w[6]} at={[740, 470]} text="NIENTE SQUAT" icon="no" size={50} rot={3} />
        </>
      );
    case 'q05':
      return <Headline t0={w[1] - 0.1} lines={[{text: 'EVITARLO'}, {text: 'NON RISOLVE', color: C.red}]} top={150} size={96} />;
    case 'q06':
      return (
        <>
          <StepCard n="3" title="errori di tecnica" t0={w[6] - 0.1} bad sub="spostano il carico sulla schiena" />
          <Tag t0={w[13] - 0.1} at={[780, 1250]} text="GAMBE" bg={C.blue} fg="#fff" size={44} />
          <Tag t0={w[15] - 0.1} at={[260, 760]} text="SCHIENA" bg={C.red} fg="#fff" size={44} />
        </>
      );
    case 'q07': {
      const step = prog(t, w[2] - 0.1, w[4], E.inOut) + prog(t, w[6], w[8], E.inOut);
      return (
        <div style={{position: 'absolute', left: 60, right: 60, top: 150, ...cardStyle('#fff', 10), padding: '22px 30px', fontFamily: FONT}}>
          <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'baseline'}}>
            <span style={{fontWeight: 900, fontSize: 40, color: C.ink}}>KETTLEBELL</span>
            <span style={{fontWeight: 900, fontSize: 92, color: C.ink, letterSpacing: -2}}>{Math.round(12 + step * 6)} KG</span>
          </div>
          <div style={{fontWeight: 900, fontSize: 34, color: C.red, marginTop: 8}}>CARICO SULLA SCHIENA</div>
          <div style={{height: 44, borderRadius: 22, border: `${OUT}px solid ${C.ink}`, marginTop: 8, overflow: 'hidden', background: '#F1EEF8'}}>
            <div style={{width: `${20 + step * 40}%`, height: '100%', background: C.red}} />
          </div>
        </div>
      );
    }
    case 's08': {
      const ph = prog(t, w[3] - 0.15, w[3] + 0.25, E.back);
      const items = ['Piedi', 'Bacino', 'Tronco'];
      return (
        <>
          <div style={{position: 'absolute', left: 60, right: 60, top: 160, display: 'flex', gap: 18, justifyContent: 'center'}}>
            {items.map((it, i) => {
              const p = prog(t, a + 0.3 + i * 0.18, a + 0.6 + i * 0.18, E.back);
              return (
                <div key={i} style={{transform: `scale(${p})`, ...cardStyle('#fff', 8), padding: '10px 22px', fontFamily: FONT, fontWeight: 900, fontSize: 44, color: C.ink, display: 'flex', alignItems: 'center', gap: 12}}>
                  <span style={{width: 40, height: 40, borderRadius: 10, border: `${OUT - 1}px solid ${C.ink}`, display: 'inline-block'}} />
                  {it}
                </div>
              );
            })}
          </div>
          <div style={{position: 'absolute', left: 60, top: 330, transform: `scale(${ph})`, transformOrigin: '0 50%', display: 'flex', alignItems: 'center', gap: 12, fontFamily: FONT, fontWeight: 900, fontSize: 38, color: '#fff', background: C.ink, borderRadius: 999, padding: '8px 22px'}}>
            <span style={{width: 24, height: 24, borderRadius: 12, background: C.red, opacity: Math.sin(t * 8) > 0 ? 1 : 0.3}} />
            REC · DI LATO
          </div>
        </>
      );
    }
    case 's09': {
      const fix = t > w[11] - 0.1;
      return fix ? (
        <>
          <StepCard n="1" title="Tutto il piede a terra" t0={w[11] - 0.1} sub="talloni giù, peso su tutto il piede" />
          <Tag t0={w[14] - 0.1} at={[540, 1200]} text="PIEDE APPOGGIATO" icon="ok" size={46} />
        </>
      ) : (
        <>
          <StepCard n="1" title="Talloni che si alzano" t0={a + 0.05} bad />
          <Tag t0={w[2]} at={at('s09', [GX, 0.45, GZ - 0.2])} text="TALLONI SU" icon="no" size={46} />
          <Tag t0={w[7] - 0.05} at={[760, 560]} text="BUSTO IN AVANTI" bg={C.red} fg="#fff" size={40} />
        </>
      );
    }
    case 's10': {
      const fix = t > w[7] - 0.1;
      return fix ? (
        <>
          <StepCard n="2" title="Scendi finché la schiena è neutra" t0={w[7] - 0.1} />
          <Tag t0={w[9]} at={[800, 980]} text="FIN QUI" bg={C.blue} fg="#fff" size={50} />
          <Tag t0={w[13]} at={[300, 640]} text="SCHIENA NEUTRA" icon="ok" size={42} />
        </>
      ) : (
        <>
          <StepCard n="2" title="Il bacino si arrotonda" t0={a + 0.05} bad sub="in fondo al movimento" />
          <Tag t0={w[4]} at={[300, 640]} text="LOMBARE IN TENSIONE" bg={C.red} fg="#fff" size={38} />
        </>
      );
    }
    case 's11':
      return (
        <>
          <StepCard n="3" title="Blocca il tronco" t0={a + 0.05} sub="aria → addome stretto → scendi" />
          <Tag t0={w[4]} at={[790, 520]} text="1. ARIA" size={46} />
          <Tag t0={w[7]} at={[300, 1150]} text="2. ADDOME STRETTO" bg={C.blue} fg="#fff" size={40} />
          <Tag t0={w[8] + 0.3} at={[800, 1250]} text="3. SCENDI" size={46} />
        </>
      );
    case 's12':
      return (
        <>
          <Tag t0={w[4] - 0.1} at={[760, 1180]} text="GAMBE AL LAVORO" bg={C.blue} fg="#fff" size={44} />
          <Tag t0={w[9] - 0.1} at={[300, 520]} text="SCHIENA PROTETTA" icon="ok" size={42} />
          <Sparkles t0={w[0]} x={420} y={760} n={12} />
        </>
      );
    case 'q15': {
      const rows: {ic: string; txt: string; at: number}[] = [
        {ic: '▶', txt: 'Guardo il tuo video', at: w[8]},
        {ic: '◎', txt: 'Un dettaglio alla volta', at: w[11]},
        {ic: '↗', txt: 'Misuriamo i progressi', at: w[17]},
      ];
      return (
        <div style={{position: 'absolute', left: 60, right: 60, top: 140, display: 'flex', flexDirection: 'column', gap: 18}}>
          <div style={{fontFamily: FONT, fontWeight: 900, fontSize: 58, color: C.ink, letterSpacing: -1, WebkitTextStroke: '8px #fff', paintOrder: 'stroke fill'}}>
            COSÌ LAVORO <span style={{color: C.blue}}>CON I MIEI CLIENTI</span>
          </div>
          {rows.map((r, i) => {
            const p = prog(t, r.at - 0.1, r.at + 0.25, E.back);
            return (
              <div key={i} style={{transform: `translateX(${(1 - p) * -300}px)`, opacity: p, ...cardStyle('#fff', 8), padding: '14px 22px', display: 'flex', alignItems: 'center', gap: 18, fontFamily: FONT, fontWeight: 900, fontSize: 40, color: C.ink, alignSelf: 'flex-start'}}>
                <span style={{width: 62, height: 62, borderRadius: 18, background: C.blue, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 36, border: `${OUT - 1}px solid ${C.ink}`}}>{r.ic}</span>
                {r.txt}
              </div>
            );
          })}
        </div>
      );
    }
    default:
      return (
        <>
          <KeywordCTA t0={w[6] - 0.1} word="ANALISI" />
          <Handle t0={w[9]} top={720} />
          <Sparkles t0={w[7]} x={540} y={400} n={14} />
        </>
      );
  }
};

/* ------------------------------------------------------------------ sottotitoli */
const buildCaps = (): CapLine[] => {
  const meta: Record<string, number[]> = {
    s01: [5, 8, 10],
    s02: [3, 6],
    s03: [4, 9, 13],
    s04: [2, 6],
    q05: [1, 3],
    q06: [6, 7, 13, 15],
    q07: [2, 7],
    s08: [4, 6],
    s09: [2, 4, 11, 14],
    s10: [4, 6, 7, 14],
    s11: [5, 7, 8],
    s12: [4, 7, 9],
    q15: [8, 11, 17],
    q16: [7],
  };
  const DISPLAY: Record<string, string> = {q16: 'Vuoi che guardi il tuo squat? Scrivimi ANALISI in privato.'};
  const lines = Object.entries(meta)
    .map(([slot, hl]) => {
      const x = v(slot) as VT & {who?: string};
      const g = x.who === 'G';
      return {t0: x.words[0] - 0.12, t1: x.t1 + 0.35, text: DISPLAY[slot] ?? x.text, hl, times: x.words, bottom: 300, wrapAt: 19, fs: 50, bg: g ? C.ink : '#fff', fg: g ? C.cream : C.ink, hlBg: g ? '#EE6A55' : C.blue} as CapLine;
    })
    .sort((p, q) => p.t0 - q.t0);
  lines.forEach((l, i) => {
    const nx = lines[i + 1];
    if (nx) l.t1 = Math.min(l.t1, nx.t0 - 0.03);
    l.t1 = Math.min(l.t1, T.END - 0.05);
  });
  return lines;
};
const CAPS = buildCaps();

const TT: Tr['type'][] = ['wipeR', 'iris', 'wipeL', 'stripes', 'wipeU', 'wipeR', 'iris', 'wipeL', 'wipeR', 'wipeU', 'iris', 'stripes', 'wipeR'];
const TC = [C.blue, C.ink, C.blue, C.red, C.ink, C.red, C.blue, C.ink, C.blue, C.ink, C.blue, C.ink, C.blue];
// tagli netti dove la camera resta coerente (dialogo), transizioni grafiche sui cambi di blocco
const TRANS: Tr[] = SL.slice(1)
  .map((s, i) => ({t: W[s][0], type: TT[i], color: TC[i]}))
  .filter((_, i) => [0, 3, 4, 6, 7, 10, 11].includes(i));

export const Video20: React.FC = () => (
  <AbsoluteFill style={{background: '#EADBC6', fontFamily: FONT}}>
    <style>{`
      @font-face{font-family:'Inter';font-weight:900;src:url(${staticFile('fonts/Inter-Black.otf')});}
      @font-face{font-family:'Inter';font-weight:800;src:url(${staticFile('fonts/Inter-ExtraBold.otf')});}
      @font-face{font-family:'Inter';font-weight:700;src:url(${staticFile('fonts/Inter-Bold.otf')});}
    `}</style>
    <World3D />
    <Overlays />
    <Captions lines={CAPS} />
    <Transitions list={TRANS} />
    <Grain />
    <Audio src={staticFile('soundtrack20.wav')} />
  </AbsoluteFill>
);
export {Burst, mix};
