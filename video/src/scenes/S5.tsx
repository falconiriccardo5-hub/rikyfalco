import React from 'react';
import {AbsoluteFill} from 'remotion';
import {Bg, FullSvg} from '../ui';
import {C, E, FONT, OUT, mix, prog, useT, useTalk} from '../brand';
import {Riky} from '../Riky';

export const S5A = {in0: 19.05, glass: 19.35, w0: 19.85, w1: 21.65, ul1: 21.95};
export const S5B = {t0: 22.1, step: 0.12};
const WORD = 'PROGRESSIONE';
const TX0 = 760; // inizio testo
const TW = 1030; // larghezza stimata del testo
const TY = 420; // baseline

export const S5a: React.FC = () => {
  const t = useT();
  const rIn = prog(t, S5A.in0, S5A.in0 + 0.5, E.out);
  const glass = prog(t, S5A.glass, S5A.glass + 0.35, E.back);
  const wp = prog(t, S5A.w0, S5A.w1, E.lin);
  const writing = t >= S5A.w0 && t < S5A.w1 + 0.05;
  const tipX = TX0 + TW * wp;
  const tipY = TY - 40 + (writing ? Math.sin(t * 38) * 14 : 0);
  // Riky segue la punta con il corpo
  const bx = Math.min(tipX - 190, 1500);
  const rx = mix(-200, writing || t > S5A.w1 ? Math.max(560, bx) : 560, rIn);
  const scale = 0.7;
  const fy = 885;
  const handLocal: [number, number] = [409 + (tipX - rx) / scale, 1304 + (tipY - fy) / scale];
  const walking = writing ? Math.abs(Math.sin(t * 11)) * 10 : 0;
  const talk = useTalk();
  const ulP = prog(t, S5A.ul1, S5A.ul1 + 0.3, E.out);
  const done = t > S5A.w1;
  return (
    <AbsoluteFill>
      <Bg />
      <FullSvg>
        <circle cx={900} cy={560} r={360} fill={C.blueL} opacity={0.35} />
        <Riky
          x={rx}
          y={fy}
          scale={scale}
          armR={writing || done ? {hand: handLocal} : {hand: [547, 822]}}
          armL={{hand: [273, 822]}}
          mouth={talk}
          smile={1}
          brow={writing ? 6 : 0}
          look={writing ? 14 : 0}
          tilt={writing ? 4 : 0}
          hop={walking}
          lean={writing ? 2 : 0}
        />
        {/* lavagna di vetro davanti al personaggio */}
        <g opacity={glass}>
          <rect x={mix(900, 380, glass)} y={190} width={mix(0, 1480, glass)} height={430} rx={26} fill="rgba(255,255,255,0.10)" stroke="#fff" strokeWidth={6} />
          <g stroke={C.ink} strokeWidth={6} fill="none" strokeLinecap="round">
            <path d="M 400 240 L 400 212 L 428 212" />
            <path d="M 1840 240 L 1840 212 L 1812 212" />
            <path d="M 400 570 L 400 598 L 428 598" />
            <path d="M 1840 570 L 1840 598 L 1812 598" />
          </g>
        </g>
        <defs>
          <clipPath id="wclip">
            <rect x={TX0 - 20} y={TY - 150} width={TW * wp + 20} height={220} />
          </clipPath>
        </defs>
        <text x={TX0} y={TY} fontFamily={FONT} fontWeight={900} fontSize={118} letterSpacing={-3} fill={C.blue} stroke="#fff" strokeWidth={14} paintOrder="stroke" clipPath="url(#wclip)">
          {WORD}
        </text>
        {/* sottolineatura a pennarello */}
        {ulP > 0 && (
          <path
            d={`M ${TX0 + TW} ${TY + 40} Q ${TX0 + TW * 0.5} ${TY + 70} ${TX0} ${TY + 36}`}
            fill="none"
            stroke={C.ink}
            strokeWidth={12}
            strokeLinecap="round"
            strokeDasharray={1100}
            strokeDashoffset={(1 - ulP) * 1100}
          />
        )}
        {writing && <circle cx={tipX} cy={tipY + 30} r={9} fill={C.ink} />}
      </FullSvg>
    </AbsoluteFill>
  );
};

export const S5b: React.FC = () => {
  const t = useT();
  const n = WORD.length;
  const TILE = 124;
  const pos = (i: number): [number, number] => [150 + i * 140, 720 - i * 38];
  const u = Math.max(0, Math.min(n - 1, (t - (S5B.t0 + 0.12)) / S5B.step));
  const i0 = Math.floor(u);
  const fr = u - i0;
  const [x0, y0] = pos(i0);
  const [x1, y1] = pos(Math.min(n - 1, i0 + 1));
  const e = E.inOut(Math.min(1, fr * 1.4));
  const rx = mix(x0, x1, e) + TILE / 2;
  const ry = mix(y0, y1, e) - Math.sin(Math.PI * Math.min(1, fr * 1.4)) * 50;
  const arrP = prog(t, 22.2, 23.6, E.inOut);
  const rkP = prog(t, S5B.t0, S5B.t0 + 0.3, E.back);
  const done = u >= n - 1;
  const fin = prog(t, S5B.t0 + n * S5B.step + 0.2, S5B.t0 + n * S5B.step + 0.5, E.back);
  return (
    <AbsoluteFill>
      <Bg color={C.blue} dot="rgba(255,255,255,0.16)" drift={26} />
      <FullSvg>
        {/* freccia di crescita */}
        <path d={`M 120 780 L ${120 + 1640 * arrP} ${780 - 540 * arrP}`} stroke={C.ink} strokeWidth={14} strokeLinecap="round" opacity={0.28} strokeDasharray="4 26" />
        {WORD.split('').map((ch, i) => {
          const t0 = S5B.t0 + i * S5B.step;
          const p = prog(t, t0, t0 + 0.28, E.back);
          if (t < t0) return null;
          const [x, y] = pos(i);
          const h = 880 - y + 60; // pilastro fino al suolo
          return (
            <g key={i} transform={`translate(${x},${y + mix(160, 0, p)}) scale(1)`} opacity={Math.min(1, p * 2)}>
              <rect x={6} y={TILE - 6} width={TILE - 12} height={h} fill={C.blueD} stroke={C.ink} strokeWidth={OUT} />
              <rect x={0} y={0} width={TILE} height={TILE} rx={22} fill={i === n - 1 && fin > 0 ? C.cream : C.cream} stroke={C.ink} strokeWidth={OUT} />
              <text x={TILE / 2} y={TILE * 0.74} textAnchor="middle" fontFamily={FONT} fontWeight={900} fontSize={92} fill={C.ink}>
                {ch}
              </text>
            </g>
          );
        })}
        {t >= S5B.t0 + 0.12 && <Riky x={rx} y={ry} scale={0.26} smile={1} mouth={done ? 0.6 : 0} armL={{angles: [30 + Math.sin(t * 18) * 10, 0]}} armR={{angles: [30 - Math.sin(t * 18) * 10, 0]}} shadow={false} sx={rkP} sy={rkP} />}
        {fin > 0 && (
          <g transform={`translate(1700,170) scale(${fin})`}>
            <path d="M 0 90 L 0 -40 M -50 10 L 0 -50 L 50 10" stroke={C.cream} strokeWidth={22} strokeLinecap="round" strokeLinejoin="round" fill="none" />
          </g>
        )}
      </FullSvg>
    </AbsoluteFill>
  );
};
