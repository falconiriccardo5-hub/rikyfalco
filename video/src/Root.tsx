import React from 'react';
import {Composition} from 'remotion';
import {Video11, DURATION} from './Video11';
import {Video12, DURATION12} from './v12/Video12';

export const Root: React.FC = () => (
  <>
  <Composition id="Video12" component={Video12} durationInFrames={DURATION12} fps={30} width={1920} height={1080} />
  <Composition id="Video11" component={Video11} durationInFrames={DURATION} fps={30} width={1920} height={1080} />
  </>
);
