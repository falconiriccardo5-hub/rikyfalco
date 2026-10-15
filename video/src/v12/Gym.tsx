import React from 'react';
import {AbsoluteFill} from 'remotion';
import {Bg, FullSvg, Dumbbell} from '../ui';
import {C, OUT, useT} from '../brand';

/** Palestrina: parete crema a puntini, finestra, poster col brand, rastrelliera manubri, tappetino. */
export const GymRoom: React.FC<{tint?: string}> = ({tint = C.cream}) => {
  const t = useT();
  return (
    <>
      <Bg color={tint} />
      <FullSvg>
        {/* finestra */}
        <g transform="translate(110,110)">
          <rect width={330} height={360} rx={18} fill="#CFE0F5" stroke={C.ink} strokeWidth={OUT} />
          <circle cx={235} cy={95} r={42} fill="#FFE9A8" stroke={C.ink} strokeWidth={OUT - 2} />
          <path d="M 0 250 Q 80 205 165 250 T 330 240 L 330 360 L 0 360 Z" fill={C.blueL} opacity={0.65} />
          <line x1={165} y1={0} x2={165} y2={360} stroke={C.ink} strokeWidth={OUT} />
          <line x1={0} y1={180} x2={330} y2={180} stroke={C.ink} strokeWidth={OUT} />
          <rect x={-14} y={360} width={358} height={22} rx={8} fill={C.cream} stroke={C.ink} strokeWidth={OUT} />
        </g>
        {/* poster brand */}
        <g transform="translate(1640,95)">
          <rect width={250} height={330} rx={14} fill={C.paper} stroke={C.ink} strokeWidth={OUT} />
          <rect x={18} y={18} width={214} height={210} rx={8} fill={C.blue} />
          <Dumbbell x={125} y={122} s={1.25} color={C.cream} />
          <text x={125} y={275} textAnchor="middle" fontFamily="Inter" fontWeight={900} fontSize={42} fill={C.ink}>COACH</text>
          <text x={125} y={314} textAnchor="middle" fontFamily="Inter" fontWeight={900} fontSize={42} fill={C.blue}>RIKY</text>
        </g>
        {/* zoccolo parete blu */}
        <rect x={0} y={640} width={1920} height={130} fill={C.blue} />
        <rect x={0} y={634} width={1920} height={10} fill={C.ink} />
        <rect x={0} y={766} width={1920} height={8} fill={C.ink} />
        {/* pavimento */}
        <rect x={0} y={774} width={1920} height={310} fill="#2A2D33" />
        {Array.from({length: 10}).map((_, i) => (
          <line key={i} x1={i * 220} y1={774} x2={i * 220 - 60} y2={1080} stroke="#33373E" strokeWidth={4} />
        ))}
        {/* rastrelliera manubri a destra */}
        <g transform="translate(1530,470)">
          <rect x={0} y={150} width={330} height={16} rx={6} fill={C.steel} stroke={C.ink} strokeWidth={OUT} />
          <rect x={0} y={20} width={330} height={16} rx={6} fill={C.steel} stroke={C.ink} strokeWidth={OUT} />
          <rect x={14} y={36} width={16} height={116} fill={C.steel} stroke={C.ink} strokeWidth={OUT - 2} />
          <rect x={300} y={36} width={16} height={116} fill={C.steel} stroke={C.ink} strokeWidth={OUT - 2} />
          {[0, 1, 2, 3].map((i) => (
            <Dumbbell key={'a' + i} x={52 + i * 76} y={8} s={0.38 + i * 0.03} color={i % 2 ? C.ink : C.blue} />
          ))}
          {[0, 1, 2, 3].map((i) => (
            <Dumbbell key={'b' + i} x={52 + i * 76} y={138} s={0.46 + i * 0.03} color={i % 2 ? C.blue : C.ink} />
          ))}
          <rect x={0} y={166} width={330} height={0} />
          <rect x={30} y={166} width={14} height={110} fill={C.steel} stroke={C.ink} strokeWidth={OUT - 2} />
          <rect x={286} y={166} width={14} height={110} fill={C.steel} stroke={C.ink} strokeWidth={OUT - 2} />
        </g>
        {/* tappetino */}
        <rect x={250} y={830} width={1250} height={96} rx={20} fill={C.blueD} stroke={C.ink} strokeWidth={OUT} />
        <rect x={250} y={830} width={1250} height={18} rx={9} fill={C.blue} />
      </FullSvg>
    </>
  );
};

/** Panca piana (vista laterale). Coordinate locali: piano imbottitura y=70, pavimento y=250. */
export const Bench: React.FC = () => (
  <g stroke={C.ink} strokeWidth={OUT} strokeLinejoin="round">
    <path d="M -170 110 L -170 250 M 340 110 L 340 250" stroke={C.ink} strokeWidth={30} strokeLinecap="round" fill="none" />
    <path d="M -170 110 L -170 250 M 340 110 L 340 250" stroke={C.steel} strokeWidth={16} strokeLinecap="round" fill="none" />
    <rect x={-215} y={236} width={90} height={18} rx={6} fill={C.steel} />
    <rect x={295} y={236} width={90} height={18} rx={6} fill={C.steel} />
    <rect x={-260} y={70} width={740} height={48} rx={22} fill={C.ink} />
    <rect x={-244} y={76} width={708} height={10} rx={5} fill="#45484f" stroke="none" />
    <rect x={-260} y={112} width={740} height={8} fill={C.blue} stroke="none" />
  </g>
);
export {AbsoluteFill};
