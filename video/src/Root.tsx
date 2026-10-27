import React from 'react';
import {Composition} from 'remotion';
import {Video11, DURATION} from './Video11';
import {Video12, DURATION12} from './v12/Video12';
import {Video13, DURATION13, VW, VH} from './v13/Video13';
import {Video14, DURATION14} from './v13/Video14';
import {Video15, DURATION15} from './v13/Video15';
import {Video16, DURATION16} from './v13/Video16';
import {Video17, DURATION17} from './v13/Video17';
import {Video18, DURATION18} from './v13/Video18';
import {Video19, DURATION19} from './v13/Video19';
import {GirlTest} from './v13/Test';
import {CarouselSlide, SW, SH} from './carousel/Slides';

export const Root: React.FC = () => (
  <>
  <Composition id="Video12" component={Video12} durationInFrames={DURATION12} fps={30} width={1920} height={1080} />
  <Composition id="Video11" component={Video11} durationInFrames={DURATION} fps={30} width={1920} height={1080} />
  <Composition id="Slide" component={CarouselSlide} durationInFrames={1} fps={30} width={SW} height={SH} defaultProps={{deck: 'scheda', index: 0}} />
  <Composition id="Video13" component={Video13} durationInFrames={DURATION13} fps={30} width={VW} height={VH} />
  <Composition id="Video14" component={Video14} durationInFrames={DURATION14} fps={30} width={VW} height={VH} />
  <Composition id="Video15" component={Video15} durationInFrames={DURATION15} fps={30} width={VW} height={VH} />
  <Composition id="Video16" component={Video16} durationInFrames={DURATION16} fps={30} width={VW} height={VH} />
  <Composition id="Video17" component={Video17} durationInFrames={DURATION17} fps={30} width={VW} height={VH} />
  <Composition id="Video18" component={Video18} durationInFrames={DURATION18} fps={30} width={VW} height={VH} />
  <Composition id="Video19" component={Video19} durationInFrames={DURATION19} fps={30} width={VW} height={VH} />
  <Composition id="GirlTest" component={GirlTest} durationInFrames={1} fps={30} width={1920} height={1080} />
  </>
);
