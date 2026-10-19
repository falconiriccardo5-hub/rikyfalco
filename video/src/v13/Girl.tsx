import React from 'react';
import {C, OUT, mix} from '../brand';

export type Pt = [number, number];

/** IK a due segmenti: restituisce il giunto intermedio (ginocchio / gomito). dir = +1 piega verso +x, -1 verso -x */
export const ik2 = (a: Pt, t: Pt, l1: number, l2: number, dir: 1 | -1): Pt => {
  let dx = t[0] - a[0];
  let dy = t[1] - a[1];
  let d = Math.hypot(dx, dy);
  d = Math.min(Math.max(d, Math.abs(l1 - l2) + 1), l1 + l2 - 0.5);
  const base = Math.atan2(dy, dx);
  const cosA = (l1 * l1 + d * d - l2 * l2) / (2 * l1 * d);
  const ang = Math.acos(Math.max(-1, Math.min(1, cosA)));
  const A = base + dir * ang * (dx >= 0 ? -1 : -1) * -1 * -1;
  // scegliamo l'angolo in modo che il giunto stia dal lato "dir" rispetto alla retta a→t
  const cand1: Pt = [a[0] + l1 * Math.cos(base + ang), a[1] + l1 * Math.sin(base + ang)];
  const cand2: Pt = [a[0] + l1 * Math.cos(base - ang), a[1] + l1 * Math.sin(base - ang)];
  void A;
  return dir > 0 ? (cand1[0] > cand2[0] ? cand1 : cand2) : cand1[0] < cand2[0] ? cand1 : cand2;
};

export type GirlProps = {
  x: number; // centro dei piedi
  y: number; // pavimento
  scale?: number;
  flip?: boolean;
  h?: number; // 0 in piedi · 1 massima flessione d'anca
  round?: number; // 0 schiena neutra · 1 schiena curva
  backHand?: number; // mano sulla zona lombare
  mouth?: number;
  hurt?: number; // smorfia
  smile?: number;
  lid?: number;
  plate?: number; // raggio disco manubrio
  plateColor?: string;
  glute?: number; // alone viola glutei/femorali
  lumbar?: number; // alone rosso zona lombare
  lumbarOk?: number; // alone viola "schiena ok"
  sway?: number; // oscillazione coda
  heel?: number; // 0..1 inclina il corpo indietro sui talloni
  noDb?: boolean;
  front?: React.ReactNode;
};

export const girlGeom = (h: number, round: number, backHand: number, heel = 0) => {
  const ankle: Pt = [0, -38];
  const hip: Pt = [-105 * h + heel * 26, -(38 + 362 - 17 * h)];
  const th = (h * 78 - heel * 6) * (Math.PI / 180);
  const L = 250;
  const sp: Pt = [hip[0] + L * Math.sin(th), hip[1] - L * Math.cos(th)];
  const knee = ik2(ankle, hip, 175, 190, 1);
  const hang: Pt = [sp[0] - 40 * h, sp[1] + 222];
  const back: Pt = [hip[0] - 62, hip[1] - 38];
  const hand: Pt = [mix(hang[0], back[0], backHand), mix(hang[1], back[1], backHand)];
  const elbow = ik2(sp, hand, 112, 118, -1);
  const thH = th * 0.92 + round * 0.12;
  const head: Pt = [sp[0] + 104 * Math.sin(thH), sp[1] - 104 * Math.cos(thH) + round * 22];
  return {ankle, hip, th, sp, knee, hand, elbow, head, thH, hang};
};

const Limb: React.FC<{pts: Pt[]; w: number; fill: string; ink?: string}> = ({pts, w, fill, ink = C.ink}) => {
  const p = pts.map((q) => q.join(',')).join(' ');
  return (
    <g strokeLinecap="round" strokeLinejoin="round" fill="none">
      <polyline points={p} stroke={ink} strokeWidth={w + OUT * 1.6} />
      <polyline points={p} stroke={fill} strokeWidth={w} />
    </g>
  );
};

/** Ragazza (stessa grafica di Riky: contorno nero, crema/bianco, viola) in vista laterale, rivolta a destra. */
export const GirlSide: React.FC<GirlProps> = ({
  x,
  y,
  scale = 1,
  flip = false,
  h = 0,
  round = 0,
  backHand = 0,
  mouth = 0,
  hurt = 0,
  smile = 0.4,
  lid = 0,
  plate = 34,
  plateColor = C.blue,
  glute = 0,
  lumbar = 0,
  lumbarOk = 0,
  sway = 0,
  heel = 0,
  noDb = false,
  front,
}) => {
  const g = girlGeom(h, round, backHand, heel);
  const {ankle, hip, th, sp, knee, hand, elbow, head, thH} = g;
  const tdeg = (th * 180) / Math.PI;
  const hdeg = (thH * 180) / Math.PI;
  // curva schiena: punto di controllo spostato indietro/su
  const mid: Pt = [(hip[0] + sp[0]) / 2, (hip[1] + sp[1]) / 2];
  const nx = -Math.cos(th); // normale rivolta "verso la schiena"
  const ny = -Math.sin(th);
  const bulge = 8 + round * 70;
  const ctrl: Pt = [mid[0] + nx * bulge * 1.0, mid[1] + ny * bulge * 1.0];
  const torso = `M ${hip[0]} ${hip[1]} Q ${ctrl[0]} ${ctrl[1]} ${sp[0]} ${sp[1]}`;
  const lum: Pt = [mix(hip[0], sp[0], 0.2) + nx * (50 + bulge * 0.4), mix(hip[1], sp[1], 0.2) + ny * (50 + bulge * 0.4)];
  const hang = !noDb;
  const eyeRy = 11 * (1 - lid * 0.9);
  return (
    <g transform={`translate(${x},${y}) scale(${flip ? -scale : scale},${scale})`}>
      <ellipse cx={20} cy={4} rx={150} ry={16} fill="rgba(17,17,17,0.14)" />
      {/* gamba lontana (leggermente più indietro) */}
      <g transform="translate(-16,0)" opacity={0.92}>
        <Limb pts={[ankle, knee, hip]} w={44} fill={C.ink} />
      </g>
      {/* scarpe */}
      <g stroke={C.ink} strokeWidth={OUT} strokeLinejoin="round">
        <path d="M -52 -46 L 18 -46 C 64 -44 112 -22 116 0 L -56 0 Z" fill="#fff" />
        <path d="M -56 -9 L 116 -9" fill="none" />
        <path d="M -50 -26 C -20 -14 28 -16 52 -34" fill="none" stroke={C.blue} strokeWidth={9} />
      </g>
      {/* gamba vicina (leggings neri con riga viola) */}
      <Limb pts={[ankle, knee, hip]} w={46} fill={C.ink} />
      <polyline points={[ankle, knee, hip].map((q) => `${q[0] + 6},${q[1]}`).join(' ')} stroke={C.blue} strokeWidth={5} fill="none" strokeLinecap="round" strokeLinejoin="round" opacity={0.9} />
      {/* glutei */}
      <circle cx={hip[0] - 22} cy={hip[1] + 6} r={64} fill={C.ink} stroke={C.ink} strokeWidth={OUT} />
      {glute > 0.02 && (
        <>
          <circle cx={hip[0] - 22} cy={hip[1] + 6} r={70 + glute * 18} fill={C.blue} opacity={0.22 + 0.28 * glute} />
          <polyline points={[hip, knee].map((q) => `${q[0] - 30},${q[1]}`).join(' ')} stroke={C.blue} strokeWidth={14} opacity={0.45 * glute + 0.1} fill="none" strokeLinecap="round" />
        </>
      )}
      {/* braccio lontano */}
      <g opacity={0.92} transform="translate(14,0)">
        <Limb pts={[sp, elbow, hand]} w={30} fill="#E9E7E1" />
      </g>
      {/* torso: top viola */}
      <path d={torso} stroke={C.ink} strokeWidth={114} fill="none" strokeLinecap="round" />
      <path d={torso} stroke={C.blue} strokeWidth={102} fill="none" strokeLinecap="round" />
      <path d={torso} stroke="#8A5BEA" strokeWidth={14} fill="none" strokeLinecap="round" transform={`translate(${-nx * 30},${-ny * 30})`} opacity={0.65} />
      {/* alone zona lombare */}
      {lumbar > 0.02 && (
        <g>
          <circle cx={lum[0]} cy={lum[1]} r={52 + lumbar * 22} fill={C.red} opacity={0.2 + 0.3 * lumbar} />
          <circle cx={lum[0]} cy={lum[1]} r={32 + lumbar * 10} fill={C.red} opacity={0.4 + 0.35 * lumbar} />
        </g>
      )}
      {lumbarOk > 0.02 && (
        <g>
          <circle cx={lum[0]} cy={lum[1]} r={50 + lumbarOk * 16} fill={C.blueL} opacity={0.25 + 0.3 * lumbarOk} />
        </g>
      )}
      {/* collo + testa */}
      <Limb pts={[sp, [sp[0] + 50 * Math.sin(thH), sp[1] - 50 * Math.cos(thH)]]} w={36} fill="#fff" />
      {/* coda di cavallo (dietro la testa) */}
      <g transform={`translate(${head[0]},${head[1]}) rotate(${hdeg * 0.5})`}>
        <path
          d={`M -50 -44 C -110 -50 ${-150 + sway * 24} ${-10 + sway * 12} ${-132 + sway * 34} ${70 + sway * 10} C ${-116 + sway * 24} 40 ${-84} 10 -46 -6 Z`}
          fill={C.ink}
          stroke={C.ink}
          strokeWidth={5}
          strokeLinejoin="round"
        />
        {/* testa */}
        <path d="M -58 6 C -62 -52 -22 -76 22 -72 C 52 -68 66 -40 64 -10 C 66 6 70 14 62 24 C 54 28 52 34 50 48 C 46 66 20 76 -10 70 C -44 62 -58 36 -58 6 Z" fill="#fff" stroke={C.ink} strokeWidth={OUT + 1} strokeLinejoin="round" />
        {/* orecchio */}
        <ellipse cx={-16} cy={10} rx={8} ry={14} fill="#fff" stroke={C.ink} strokeWidth={4} />
        {/* sopracciglio, occhio */}
        <path d={`M 22 ${-14 - hurt * 4} Q 36 ${-24 + hurt * 2} 54 ${-14 + hurt * 10}`} stroke={C.ink} strokeWidth={6} fill="none" strokeLinecap="round" />
        <ellipse cx={38} cy={0 + 11 * lid * 0.9} rx={9} ry={Math.max(1.5, eyeRy)} fill={C.ink} />
        {lid < 0.5 && <circle cx={41} cy={-4} r={3} fill="#fff" />}
        {/* bocca */}
        {mouth < 0.05 ? (
          <path d={`M 34 40 Q 46 ${40 + 14 * smile - hurt * 10} 58 ${34 + 4 * smile - hurt * 6}`} stroke={C.ink} strokeWidth={6} fill="none" strokeLinecap="round" />
        ) : (
          <path d={`M 34 38 Q 46 44 58 34 Q 48 ${46 + mouth * 26} 34 38 Z`} fill={C.ink} stroke={C.ink} strokeWidth={4} strokeLinejoin="round" />
        )}
        {/* capelli: calotta + frangia */}
        <path d="M -62 10 C -72 -62 -22 -92 28 -84 C 62 -78 72 -52 66 -34 C 40 -50 14 -44 -4 -20 C -14 -2 -30 8 -46 10 C -52 22 -58 20 -62 10 Z" fill={C.ink} stroke={C.ink} strokeWidth={5} strokeLinejoin="round" />
        {/* scrunchie viola */}
        <ellipse cx={-62} cy={-30} rx={13} ry={20} fill={C.blue} stroke={C.ink} strokeWidth={4} transform="rotate(-12 -62 -30)" />
      </g>
      {/* braccio vicino */}
      <Limb pts={[sp, elbow, hand]} w={34} fill="#fff" />
      <circle cx={elbow[0]} cy={elbow[1]} r={15} fill="#fff" stroke={C.ink} strokeWidth={OUT - 1} />
      {/* manubrio */}
      {hang && (
        <g transform={`translate(${hand[0]},${hand[1]})`}>
          <circle r={plate + 6} fill={C.ink} />
          <circle r={plate} fill={plateColor} stroke={C.cream} strokeWidth={4} />
          <circle r={plate * 0.34} fill={C.ink} />
        </g>
      )}
      {/* mano */}
      <circle cx={hand[0]} cy={hand[1]} r={hang ? 0 : 14} fill="#fff" stroke={C.ink} strokeWidth={OUT - 2} />
      {front}
    </g>
  );
};
