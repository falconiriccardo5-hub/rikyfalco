import React from 'react';
import {AbsoluteFill} from 'remotion';
import {C, FONT} from '../brand';
import {FullSvg} from '../ui';
import {GirlSide} from './Girl';
export const GirlTest: React.FC = () => (
  <AbsoluteFill style={{background: '#fff'}}>
    <svg width={1920} height={1080} style={{position: 'absolute'}}>
      <GirlSide x={230} y={900} scale={0.85} h={0} />
      <GirlSide x={620} y={900} scale={0.85} h={0.5} />
      <GirlSide x={1010} y={900} scale={0.85} h={1} glute={1} />
      <GirlSide x={1400} y={900} scale={0.85} h={1} round={1} lumbar={1} plate={52} plateColor={C.red} />
      <GirlSide x={1750} y={900} scale={0.85} h={0} backHand={1} hurt={1} mouth={0.5} lumbar={1} />
    </svg>
  </AbsoluteFill>
);
