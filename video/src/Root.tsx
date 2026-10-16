import React from 'react';
import {Composition} from 'remotion';
import {Video11, DURATION} from './Video11';
import {Video12, DURATION12} from './v12/Video12';
import {CarouselSlide, SW, SH} from './carousel/Slides';

export const Root: React.FC = () => (
  <>
  <Composition id="Video12" component={Video12} durationInFrames={DURATION12} fps={30} width={1920} height={1080} />
  <Composition id="Video11" component={Video11} durationInFrames={DURATION} fps={30} width={1920} height={1080} />
  <Composition id="Slide" component={CarouselSlide} durationInFrames={1} fps={30} width={SW} height={SH} defaultProps={{deck: 'scheda', index: 0}} />
  </>
);
