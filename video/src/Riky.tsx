import React from 'react';
import {C, OUT} from './brand';

export type Pt = [number, number];
/** hand = punta della mano (IK a 2 segmenti) · angles = [apertura laterale°, flessione gomito°] */
export type ArmSpec = {hand: Pt} | {angles: [number, number]};

export const SH_L: Pt = [318, 600];
export const SH_R: Pt = [502, 600];
const L1 = 100;
const L2 = 125;
const rad = (d: number) => (d * Math.PI) / 180;

export const armPoints = (side: 'L' | 'R', spec: ArmSpec) => {
  const sh = side === 'L' ? SH_L : SH_R;
  const inward = side === 'L' ? 1 : -1; // verso il corpo
  let elbow: Pt;
  let hand: Pt;
  if ('angles' in spec) {
    const [s, f] = spec.angles;
    const a = rad(inward * s);
    elbow = [sh[0] - Math.sin(a) * L1, sh[1] + Math.cos(a) * L1];
    const fr = rad(f);
    hand = [
      elbow[0] + inward * L2 * (0.22 * Math.sin(fr) - 0.14 * Math.cos(fr)),
      elbow[1] + L2 * Math.cos(fr),
    ];
  } else {
    const dx = spec.hand[0] - sh[0];
    const dy = spec.hand[1] - sh[1];
    const dist = Math.min(Math.hypot(dx, dy), L1 + L2 - 0.5);
    const phi = Math.atan2(dy, dx);
    const ca = Math.max(-1, Math.min(1, (L1 * L1 + dist * dist - L2 * L2) / (2 * L1 * dist)));
    const al = Math.acos(ca);
    const c1: Pt = [sh[0] + L1 * Math.cos(phi + al), sh[1] + L1 * Math.sin(phi + al)];
    const c2: Pt = [sh[0] + L1 * Math.cos(phi - al), sh[1] + L1 * Math.sin(phi - al)];
    elbow = c1[1] > c2[1] ? c1 : c2;
    hand = [sh[0] + dist * Math.cos(phi), sh[1] + dist * Math.sin(phi)];
  }
  return {sh, elbow, hand};
};

const Arm: React.FC<{side: 'L' | 'R'; spec: ArmSpec}> = ({side, spec}) => {
  const {sh, elbow, hand} = armPoints(side, spec);
  const ang = (Math.atan2(-(elbow[0] - sh[0]), elbow[1] - sh[1]) * 180) / Math.PI;
  return (
    <g>
      <g strokeLinecap="round" strokeLinejoin="round" fill="none">
        <polyline points={`${sh[0]},${sh[1]} ${elbow[0]},${elbow[1]} ${hand[0]},${hand[1]}`} stroke={C.ink} strokeWidth={30} />
        <polyline points={`${sh[0]},${sh[1]} ${elbow[0]},${elbow[1]} ${hand[0]},${hand[1]}`} stroke="#fff" strokeWidth={18} />
      </g>
      <circle cx={elbow[0]} cy={elbow[1]} r={13} fill="#fff" stroke={C.ink} strokeWidth={OUT} />
      <circle cx={hand[0]} cy={hand[1]} r={19} fill="#fff" stroke={C.ink} strokeWidth={OUT} />
      {/* manica che ruota col braccio */}
      <g transform={`translate(${sh[0]},${sh[1]}) rotate(${ang})`}>
        <path
          d="M -40 -6 Q -34 -34 0 -34 Q 34 -34 40 -6 L 36 80 Q 0 90 -36 80 Z"
          fill={C.ink}
          stroke={C.ink}
          strokeWidth={4}
          strokeLinejoin="round"
        />
      </g>
    </g>
  );
};

export type RikyProps = {
  x?: number;
  y?: number;
  scale?: number;
  flip?: boolean;
  armL?: ArmSpec;
  armR?: ArmSpec;
  mouth?: number; // 0 chiusa · 1 aperta
  smile?: number; // -1 broncio · 0 piatta · 1 sorriso
  brow?: number; // px, + = sopracciglia alzate
  browTilt?: number; // + = arrabbiato / - = preoccupato
  lid?: number; // 0 occhi aperti · 1 chiusi
  look?: number; // sguardo orizzontale px
  tilt?: number; // inclinazione testa °
  bob?: number; // px verticale testa
  lean?: number; // inclinazione corpo ° (attorno ai piedi)
  sx?: number;
  sy?: number;
  hop?: number; // px di salto
  shadow?: boolean;
  front?: React.ReactNode; // disegnato sopra al personaggio (coordinate locali, es. bilanciere)
};

export const DEFAULT_L: ArmSpec = {hand: [273, 822]};
export const DEFAULT_R: ArmSpec = {hand: [547, 822]};

export const Riky: React.FC<RikyProps> = ({
  x = 960,
  y = 1000,
  scale = 1,
  flip = false,
  armL = DEFAULT_L,
  armR = DEFAULT_R,
  mouth = 0,
  smile = 1,
  brow = 0,
  browTilt = 0,
  lid = 0,
  look = 0,
  tilt = 0,
  bob = 0,
  lean = 0,
  sx = 1,
  sy = 1,
  hop = 0,
  shadow = true,
  front,
}) => {
  const sc = scale * (flip ? -1 : 1);
  const my = 428 + 20 * smile; // controllo curva bocca
  const mTop = 426 + (smile > 0 ? 10 : 0) + smile * 6;
  const eyeRy = 21 * (1 - lid * 0.9);
  return (
    <g transform={`translate(${x},${y - hop}) rotate(${lean}) scale(${sc * sx},${scale * sy}) translate(-409,-1304)`}>
      {shadow && (
        <g transform={`translate(409,${1304 + hop / sy}) scale(${1 - Math.min(0.4, hop / 600)},1)`}>
          <ellipse cx={0} cy={0} rx={182} ry={18} fill="rgba(17,17,17,0.14)" />
        </g>
      )}
      {/* gambe + scarpe */}
      <g stroke={C.ink} strokeWidth={OUT} strokeLinejoin="round">
        <rect x={342} y={1040} width={33} height={200} fill="#fff" />
        <rect x={446} y={1040} width={33} height={200} fill="#fff" />
        <path d="M305 1300 L305 1264 C305 1246 325 1237 342 1237 L378 1237 C395 1240 402 1260 402 1282 L402 1300 Z" fill="#fff" />
        <path d="M415 1300 L415 1282 C415 1260 422 1240 440 1237 L478 1237 C496 1237 516 1246 516 1264 L516 1300 Z" fill="#fff" />
        <path d="M307 1283 L402 1283 M415 1283 L516 1283" fill="none" />
        <path d="M322 1281 C335 1268 372 1268 388 1281 M436 1281 C450 1268 488 1268 502 1281" fill="none" strokeWidth={4} />
        <path d="M341 1250 l28 12 M369 1250 l-28 12 M451 1250 l28 12 M479 1250 l-28 12" fill="none" strokeWidth={4} strokeLinecap="round" />
      </g>
      {/* pantaloncini */}
      <g stroke={C.ink} strokeWidth={OUT} strokeLinejoin="round">
        <path d="M316 838 L505 838 L522 1016 L421 1022 L410 910 L397 1018 L297 1012 Z" fill={C.blue} />
        <path d="M288 1012 L398 1018 L397 1052 L287 1046 Z" fill={C.blueD} />
        <path d="M420 1022 L530 1014 L532 1048 L420 1054 Z" fill={C.blueD} />
        <path d="M410 842 L410 906" stroke={C.blueL} strokeWidth={4} strokeDasharray="8 8" fill="none" />
        <path d="M362 846 l0 6 M456 846 l0 6" stroke={C.blueL} strokeWidth={4} fill="none" />
      </g>
      {/* collo + torso */}
      <rect x={391} y={470} width={37} height={54} fill="#fff" stroke={C.ink} strokeWidth={OUT} />
      <g>
        <path d="M304 536 Q410 512 516 536 L518 838 Q410 858 302 838 Z" fill={C.ink} stroke={C.ink} strokeWidth={6} strokeLinejoin="round" />
        <path d="M378 517 Q410 534 440 517" stroke="#3a3a3a" strokeWidth={5} fill="none" strokeLinecap="round" />
        <path d="M348 726 Q366 770 360 822 M464 696 Q478 760 470 818" stroke="#3a3a3a" strokeWidth={4} fill="none" strokeLinecap="round" />
      </g>
      <Arm side="L" spec={armL} />
      <Arm side="R" spec={armR} />
      {front}
      {/* testa */}
      <g transform={`translate(0,${-bob}) rotate(${tilt} 410 490)`}>
        <ellipse cx={286} cy={381} rx={14} ry={25} fill="#fff" stroke={C.ink} strokeWidth={OUT} />
        <ellipse cx={534} cy={381} rx={14} ry={25} fill="#fff" stroke={C.ink} strokeWidth={OUT} />
        <path
          d="M290 340 C290 430 340 478 410 478 C480 478 528 430 526 350 C524 280 480 262 410 262 C340 262 290 280 290 340 Z"
          fill="#fff"
          stroke={C.ink}
          strokeWidth={OUT}
        />
        {/* sopracciglia */}
        <g stroke={C.ink} strokeWidth={5} fill="none" strokeLinecap="round">
          <path d={`M353 ${344 - brow + browTilt} Q372 ${326 - brow} 396 ${338 - brow - browTilt}`} />
          <path d={`M430 ${337 - brow - browTilt} Q452 ${322 - brow} 473 ${343 - brow + browTilt}`} />
        </g>
        {/* occhi */}
        <g fill={C.ink}>
          <ellipse cx={376 + look} cy={379 + 21 * lid * 0.9} rx={15} ry={Math.max(1.5, eyeRy)} />
          <ellipse cx={449 + look} cy={378 + 21 * lid * 0.9} rx={15} ry={Math.max(1.5, eyeRy)} />
        </g>
        {lid < 0.5 && (
          <g fill="#fff">
            <circle cx={381 + look} cy={372} r={5} />
            <circle cx={454 + look} cy={371} r={5} />
          </g>
        )}
        {/* bocca */}
        {mouth < 0.04 ? (
          <path d={`M391 428 Q418 ${my} 446 421`} stroke={C.ink} strokeWidth={6} fill="none" strokeLinecap="round" />
        ) : (
          <path
            d={`M391 ${mTop - 2} Q418 ${mTop + 8} 446 ${mTop - 5} Q418 ${mTop + 8 + mouth * 40} 391 ${mTop - 2} Z`}
            fill={C.ink}
            stroke={C.ink}
            strokeWidth={5}
            strokeLinejoin="round"
          />
        )}
        {/* capelli */}
        <path
          d="M308 405 C296 372 283 340 284 300 L256 290 C270 262 292 240 316 228 L296 200 C318 194 340 193 362 198 C375 180 398 168 425 168 C440 168 448 160 452 150 L462 140 C472 158 484 172 498 184 L535 177 C530 192 532 208 540 226 L564 245 C548 256 538 276 531 306 L529 338 C526 300 518 280 508 270 C495 262 488 266 480 268 C470 274 450 280 428 276 C418 296 388 312 350 309 C336 345 320 375 308 405 Z"
          fill={C.ink}
          stroke={C.ink}
          strokeWidth={5}
          strokeLinejoin="round"
        />
        <g stroke="#4a4a4a" strokeWidth={4} fill="none" strokeLinecap="round">
          <path d="M312 300 C316 275 330 258 345 250 C375 238 400 232 425 235" />
          <path d="M362 285 C385 275 410 262 425 240" />
          <path d="M464 207 C484 218 498 235 506 258" />
        </g>
      </g>
    </g>
  );
};
