import React from "react";
import { linearTiming, springTiming, TransitionSeries } from "@remotion/transitions";
import { fade } from "@remotion/transitions/fade";
import { slide } from "@remotion/transitions/slide";
import { wipe } from "@remotion/transitions/wipe";
import { useVideoConfig } from "remotion";
import { TIMING } from "./timing";
import { CorrectScene } from "./scenes/CorrectScene";
import { FrontScene } from "./scenes/FrontScene";
import { IntroScene } from "./scenes/IntroScene";
import { OutroScene } from "./scenes/OutroScene";
import { RiskScene } from "./scenes/RiskScene";
import { SideScene } from "./scenes/SideScene";
import { TopViewScene } from "./scenes/TopViewScene";
import { WrongScene } from "./scenes/WrongScene";

const whip = springTiming({ config: { damping: 200 }, durationInFrames: 14 });

export const Reel: React.FC = () => {
  const { fps } = useVideoConfig();
  return (
    <TransitionSeries>
      <TransitionSeries.Sequence name="Intro" durationInFrames={TIMING.intro.duration} premountFor={fps}>
        <IntroScene />
      </TransitionSeries.Sequence>
      <TransitionSeries.Transition presentation={fade()} timing={linearTiming({ durationInFrames: 12 })} />
      <TransitionSeries.Sequence name="Fronte" durationInFrames={TIMING.front.duration} premountFor={fps}>
        <FrontScene />
      </TransitionSeries.Sequence>
      <TransitionSeries.Transition presentation={slide({ direction: "from-right" })} timing={whip} />
      <TransitionSeries.Sequence name="Lato" durationInFrames={TIMING.side.duration} premountFor={fps}>
        <SideScene />
      </TransitionSeries.Sequence>
      <TransitionSeries.Transition presentation={slide({ direction: "from-bottom" })} timing={whip} />
      <TransitionSeries.Sequence name="Dall'alto" durationInFrames={TIMING.top.duration} premountFor={fps}>
        <TopViewScene />
      </TransitionSeries.Sequence>
      <TransitionSeries.Transition presentation={slide({ direction: "from-left" })} timing={whip} />
      <TransitionSeries.Sequence name="Sbagliato" durationInFrames={TIMING.wrong.duration} premountFor={fps}>
        <WrongScene />
      </TransitionSeries.Sequence>
      <TransitionSeries.Transition presentation={wipe({ direction: "from-left" })} timing={whip} />
      <TransitionSeries.Sequence name="Corretto" durationInFrames={TIMING.correct.duration} premountFor={fps}>
        <CorrectScene />
      </TransitionSeries.Sequence>
      <TransitionSeries.Transition presentation={fade()} timing={linearTiming({ durationInFrames: 12 })} />
      <TransitionSeries.Sequence name="Rischi" durationInFrames={TIMING.risk.duration} premountFor={fps}>
        <RiskScene />
      </TransitionSeries.Sequence>
      <TransitionSeries.Transition presentation={slide({ direction: "from-bottom" })} timing={whip} />
      <TransitionSeries.Sequence name="Segui" durationInFrames={TIMING.outro.duration} premountFor={fps}>
        <OutroScene />
      </TransitionSeries.Sequence>
    </TransitionSeries>
  );
};
