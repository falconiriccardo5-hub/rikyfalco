import React from 'react';
import {Composition} from 'remotion';
import {Video11, DURATION} from './Video11';

export const Root: React.FC = () => (
  <Composition id="Video11" component={Video11} durationInFrames={DURATION} fps={30} width={1920} height={1080} />
);
