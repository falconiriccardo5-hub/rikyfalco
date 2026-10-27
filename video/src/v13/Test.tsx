import React from 'react';
import {AbsoluteFill} from 'remotion';
import {C, FONT} from '../brand';
import {FullSvg} from '../ui';
import {GirlSide} from './Girl';
export const GirlTest: React.FC = () => (
  <AbsoluteFill style={{background: '#fff'}}>
    <svg width={1920} height={1080} style={{position: 'absolute'}}>
      <GirlSide x={230} y={900} scale={0.85} bar />
      <GirlSide x={620} y={900} scale={0.85} sq={0.5} bar />
      <GirlSide x={1010} y={900} scale={0.85} sq={1} bar quads={1} />
      <GirlSide x={1400} y={900} scale={0.85} sq={1} bar heelUp={1} lumbar={1} />
      <GirlSide x={1750} y={900} scale={0.85} sq={1} bar round={1} brace={1} />
    </svg>
  </AbsoluteFill>
);
