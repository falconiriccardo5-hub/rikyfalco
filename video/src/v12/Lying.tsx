import React from 'react';
import {C, OUT, mix} from '../brand';
import {Bench} from './Gym';

export type LyingProps = {
  x: number; // posizione schermo dell'origine locale
  y: number;
  scale?: number;
  h?: number; // 0 = manubri al petto · 1 = braccia distese
  arch?: number; // 0 piatto · 1 arco dorsale
  mouth?: number;
  smile?: number;
  brow?: number;
  browTilt?: number;
  lid?: number;
  hurt?: number; // 0..1 spalla rossa che pulsa
  shake?: number; // px
  dumbbell?: string;
  label?: string;
  showBench?: boolean;
  glow?: string; // evidenza arco / scapole
};

const S: [number, number] = [10, -40]; // spalla
const lerp = mix;
export const dumbbellLocal = (h: number): [number, number] => [lerp(88, 18, h), lerp(8, -146, h) - 140];

/** Riky sdraiato sulla panca, vista laterale, stesso stile del personaggio frontale. */
export const RikyLying: React.FC<LyingProps> = ({
  x,
  y,
  scale = 1.2,
  h = 1,
  arch = 0,
  mouth = 0,
  smile = 0.6,
  brow = 0,
  browTilt = 0,
  lid = 0,
  hurt = 0,
  shake = 0,
  dumbbell = C.blue,
  label = '',
  showBench = true,
  glow,
}) => {
  const g = arch * 38; // distacco lombare dalla panca
  const up = arch * 26; // petto sollevato
  const E: [number, number] = [lerp(88, 18, h), lerp(8, -146, h)];
  const H: [number, number] = [E[0], E[1] - 140];
  const ang = (Math.atan2(-(E[0] - S[0]), E[1] - S[1]) * 180) / Math.PI;
  const my = 428 + 20 * smile;
  const mTop = 426 + (smile > 0 ? 10 : 0) + smile * 6;
  const eyeRy = 21 * (1 - lid * 0.9);
  return (
    <g transform={`translate(${x + shake},${y}) scale(${scale})`}>
      {showBench && <Bench />}
      {/* gamba lontana non disegnata: coscia + stinco */}
      <g strokeLinecap="round" strokeLinejoin="round" fill="none">
        <polyline points="380,22 520,-34" stroke={C.ink} strokeWidth={90} />
        <polyline points="380,22 520,-34" stroke={C.blue} strokeWidth={78} />
        <polyline points="520,-34 548,-58 612,196" stroke={C.ink} strokeWidth={46} />
        <polyline points="520,-34 548,-58 612,196" stroke="#fff" strokeWidth={34} />
        <path d="M 508 -64 L 548 -16" stroke={C.blueD} strokeWidth={0} />
      </g>
      <rect x={474} y={-76} width={26} height={86} rx={6} fill={C.blueD} stroke={C.ink} strokeWidth={OUT - 2} transform="rotate(26 487 -33)" />
      {/* scarpa */}
      <g stroke={C.ink} strokeWidth={OUT} strokeLinejoin="round">
        <path d="M 572 214 L 626 214 C 676 214 704 232 704 250 L 566 250 Z" fill="#fff" />
        <path d="M 570 243 L 704 243" fill="none" />
        <path d="M 592 224 l 24 10 M 616 224 l -24 10" strokeWidth={4} strokeLinecap="round" fill="none" />
      </g>
      {/* bacino + shorts */}
      <path d="M 292 -34 L 432 -12 L 446 62 L 304 72 Z" fill={C.blue} stroke={C.ink} strokeWidth={OUT} strokeLinejoin="round" />
      {/* torso (maglia nera) con arco */}
      <path
        d={`M -36 70 L -36 -52 C 10 ${-78 - up}, 80 ${-92 - up}, 142 ${-70 - up * 0.8} C 205 ${-50 - up * 0.2}, 262 -42, 332 -32 L 346 70 C 304 70, 286 ${70 - g}, 238 ${70 - g} C 192 ${70 - g}, 154 70, 104 70 Z`}
        fill={C.ink}
        stroke={C.ink}
        strokeWidth={6}
        strokeLinejoin="round"
      />
      <path d={`M 60 ${-60 - up} C 110 ${-50 - up}, 150 ${-34 - up * 0.4}, 190 -22`} stroke="#3a3a3a" strokeWidth={4} fill="none" strokeLinecap="round" />
      {/* spazio sotto la schiena (evidenza arco) */}
      {glow && arch > 0.05 && (
        <path d={`M 132 70 C 160 ${70 - g * 0.9}, 220 ${70 - g * 0.9}, 262 70`} stroke={glow} strokeWidth={7} fill="none" strokeLinecap="round" strokeDasharray="2 14" />
      )}
      {/* collo + testa (volto frontale ruotato) */}
      <rect x={-98} y={-26} width={74} height={56} rx={8} fill="#fff" stroke={C.ink} strokeWidth={OUT} />
      <g transform="translate(-152,-10) rotate(-90) scale(0.64) translate(-409,-372)">
        <ellipse cx={286} cy={381} rx={14} ry={25} fill="#fff" stroke={C.ink} strokeWidth={OUT} />
        <ellipse cx={534} cy={381} rx={14} ry={25} fill="#fff" stroke={C.ink} strokeWidth={OUT} />
        <path d="M290 340 C290 430 340 478 410 478 C480 478 528 430 526 350 C524 280 480 262 410 262 C340 262 290 280 290 340 Z" fill="#fff" stroke={C.ink} strokeWidth={OUT + 2} />
        <g stroke={C.ink} strokeWidth={6} fill="none" strokeLinecap="round">
          <path d={`M353 ${344 - brow + browTilt} Q372 ${326 - brow} 396 ${338 - brow - browTilt}`} />
          <path d={`M430 ${337 - brow - browTilt} Q452 ${322 - brow} 473 ${343 - brow + browTilt}`} />
        </g>
        <g fill={C.ink}>
          <ellipse cx={376} cy={379 + 21 * lid * 0.9} rx={15} ry={Math.max(1.5, eyeRy)} />
          <ellipse cx={449} cy={378 + 21 * lid * 0.9} rx={15} ry={Math.max(1.5, eyeRy)} />
        </g>
        {lid < 0.5 && (
          <g fill="#fff">
            <circle cx={381} cy={372} r={5} />
            <circle cx={454} cy={371} r={5} />
          </g>
        )}
        {mouth < 0.04 ? (
          <path d={`M391 428 Q418 ${my} 446 421`} stroke={C.ink} strokeWidth={7} fill="none" strokeLinecap="round" />
        ) : (
          <path d={`M391 ${mTop - 2} Q418 ${mTop + 8} 446 ${mTop - 5} Q418 ${mTop + 8 + mouth * 40} 391 ${mTop - 2} Z`} fill={C.ink} stroke={C.ink} strokeWidth={5} strokeLinejoin="round" />
        )}
        <path
          d="M308 405 C296 372 283 340 284 300 L256 290 C270 262 292 240 316 228 L296 200 C318 194 340 193 362 198 C375 180 398 168 425 168 C440 168 448 160 452 150 L462 140 C472 158 484 172 498 184 L535 177 C530 192 532 208 540 226 L564 245 C548 256 538 276 531 306 L529 338 C526 300 518 280 508 270 C495 262 488 266 480 268 C470 274 450 280 428 276 C418 296 388 312 350 309 C336 345 320 375 308 405 Z"
          fill={C.ink}
          stroke={C.ink}
          strokeWidth={5}
          strokeLinejoin="round"
        />
      </g>
      {/* spalla che fa male */}
      {hurt > 0 && (
        <g transform={`translate(${S[0] + 6},${S[1] - 6})`}>
          <circle r={46 + hurt * 26} fill="#E5484D" opacity={0.18 + 0.2 * hurt} />
          <circle r={30 + hurt * 12} fill="#E5484D" opacity={0.35 + 0.3 * hurt} />
        </g>
      )}
      {/* braccio vicino: avambraccio + braccio + manica */}
      <g strokeLinecap="round" strokeLinejoin="round" fill="none">
        <polyline points={`${S[0]},${S[1]} ${E[0]},${E[1]} ${H[0]},${H[1]}`} stroke={C.ink} strokeWidth={36} />
        <polyline points={`${S[0]},${S[1]} ${E[0]},${E[1]} ${H[0]},${H[1]}`} stroke="#fff" strokeWidth={24} />
      </g>
      <circle cx={E[0]} cy={E[1]} r={15} fill="#fff" stroke={C.ink} strokeWidth={OUT} />
      <g transform={`translate(${S[0]},${S[1]}) rotate(${ang})`}>
        <path d="M -44 -8 Q -38 -40 0 -40 Q 38 -40 44 -8 L 40 78 Q 0 90 -40 78 Z" fill={C.ink} stroke={C.ink} strokeWidth={4} strokeLinejoin="round" />
      </g>
      {/* manubrio (testata laterale) */}
      <g transform={`translate(${H[0]},${H[1]})`}>
        <circle r={62} fill={C.ink} stroke={C.ink} strokeWidth={OUT} />
        <circle r={46} fill={dumbbell} stroke={C.cream} strokeWidth={4} />
        <polygon points="0,-26 23,-13 23,13 0,26 -23,13 -23,-13" fill={C.ink} />
        {label && (
          <text y={9} textAnchor="middle" fontFamily="Inter" fontWeight={900} fontSize={24} fill={C.cream}>{label}</text>
        )}
      </g>
    </g>
  );
};

/** Vista dall'alto: busto + due braccia con apertura dei gomiti (theta = angolo rispetto al busto). */
export const TopView: React.FC<{theta: number; good: boolean; w?: number}> = ({theta, good}) => {
  const L = 150;
  const th = (theta * Math.PI) / 180;
  const col = good ? C.blue : C.red;
  const sTop: [number, number] = [220, 168];
  const sBot: [number, number] = [220, 352];
  const eTop: [number, number] = [sTop[0] + L * Math.cos(th), sTop[1] - L * Math.sin(th)];
  const eBot: [number, number] = [sBot[0] + L * Math.cos(th), sBot[1] + L * Math.sin(th)];
  const arc = (s: [number, number], dir: number) => {
    const r = 74;
    const p1: [number, number] = [s[0] + r, s[1]];
    const p2: [number, number] = [s[0] + r * Math.cos(th), s[1] + dir * r * Math.sin(th)];
    return `M ${p1[0]} ${p1[1]} A ${r} ${r} 0 0 ${dir > 0 ? 1 : 0} ${p2[0]} ${p2[1]}`;
  };
  return (
    <svg width={760} height={520} viewBox="0 0 760 520">
      {/* panca dall'alto */}
      <rect x={60} y={150} width={620} height={220} rx={28} fill="#2A2D33" stroke={C.ink} strokeWidth={OUT} />
      {/* busto */}
      <rect x={168} y={162} width={330} height={196} rx={40} fill={C.ink} stroke={C.ink} strokeWidth={OUT} />
      <path d="M 520 190 L 640 214 L 640 306 L 520 330 Z" fill={C.blue} stroke={C.ink} strokeWidth={OUT} strokeLinejoin="round" />
      {/* testa dall'alto */}
      <circle cx={108} cy={260} r={58} fill="#fff" stroke={C.ink} strokeWidth={OUT} />
      <path d="M 54 262 A 54 54 0 0 1 108 206 A 54 54 0 0 1 150 232 C 128 226 104 232 92 262 Z" fill={C.ink} />
      <circle cx={126} cy={246} r={5} fill={C.ink} />
      <circle cx={126} cy={274} r={5} fill={C.ink} />
      <path d="M 138 250 Q 150 260 138 272" stroke={C.ink} strokeWidth={5} fill="none" strokeLinecap="round" />
      {/* settore angolo */}
      <line x1={sTop[0]} y1={sTop[1]} x2={sTop[0] + 120} y2={sTop[1]} stroke="#9aa0a8" strokeWidth={4} strokeDasharray="8 8" />
      <line x1={sBot[0]} y1={sBot[1]} x2={sBot[0] + 120} y2={sBot[1]} stroke="#9aa0a8" strokeWidth={4} strokeDasharray="8 8" />
      <path d={arc(sTop, -1)} stroke={col} strokeWidth={8} fill="none" strokeLinecap="round" />
      <path d={arc(sBot, 1)} stroke={col} strokeWidth={8} fill="none" strokeLinecap="round" />
      {/* braccia */}
      {[[sTop, eTop], [sBot, eBot]].map(([s, e], i) => (
        <g key={i} strokeLinecap="round">
          <line x1={s[0]} y1={s[1]} x2={e[0]} y2={e[1]} stroke={C.ink} strokeWidth={34} />
          <line x1={s[0]} y1={s[1]} x2={e[0]} y2={e[1]} stroke="#fff" strokeWidth={22} />
          <circle cx={e[0]} cy={e[1]} r={30} fill={C.ink} stroke={C.cream} strokeWidth={4} />
          <circle cx={e[0]} cy={e[1]} r={19} fill={col} />
        </g>
      ))}
      {/* spalle */}
      {[sTop, sBot].map((s, i) => (
        <circle key={i} cx={s[0]} cy={s[1]} r={good ? 14 : 22} fill={good ? '#fff' : C.red} opacity={good ? 1 : 0.85} stroke={C.ink} strokeWidth={OUT - 2} />
      ))}
    </svg>
  );
};
