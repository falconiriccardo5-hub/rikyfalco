import React from "react";
import { linearTiming, springTiming, TransitionSeries } from "@remotion/transitions";
import { fade } from "@remotion/transitions/fade";
import { slide } from "@remotion/transitions/slide";
import { wipe } from "@remotion/transitions/wipe";
import { useVideoConfig } from "remotion";
import { ExerciseScene } from "./scenes/ExerciseScene";
import { FactorsScene } from "./scenes/FactorsScene";
import { FantasyScene } from "./scenes/FantasyScene";
import { GoalScene } from "./scenes/GoalScene";
import { HookScene } from "./scenes/HookScene";
import { OutroScene2 } from "./scenes/OutroScene2";
import { ProgressScene } from "./scenes/ProgressScene";
import { RealityScene } from "./scenes/RealityScene";
import { TIMING2 } from "./timing";

const whip = springTiming({ config: { damping: 200 }, durationInFrames: 14 });

export const Reel2: React.FC = () => {
  const { fps } = useVideoConfig();
  return (
    <TransitionSeries>
      <TransitionSeries.Sequence name="Hook" durationInFrames={TIMING2.hook.duration} premountFor={fps}>
        <HookScene />
      </TransitionSeries.Sequence>
      <TransitionSeries.Transition presentation={fade()} timing={linearTiming({ durationInFrames: 10 })} />
      <TransitionSeries.Sequence name="Fantasia" durationInFrames={TIMING2.fantasy.duration} premountFor={fps}>
        <FantasyScene />
      </TransitionSeries.Sequence>
      <TransitionSeries.Transition presentation={fade()} timing={linearTiming({ durationInFrames: 14 })} />
      <TransitionSeries.Sequence name="Realtà" durationInFrames={TIMING2.reality.duration} premountFor={fps}>
        <RealityScene />
      </TransitionSeries.Sequence>
      <TransitionSeries.Transition presentation={slide({ direction: "from-right" })} timing={springTiming({ config: { damping: 200 }, durationInFrames: 12 })} />
      <TransitionSeries.Sequence name="Fattori" durationInFrames={TIMING2.factors.duration} premountFor={fps}>
        <FactorsScene />
      </TransitionSeries.Sequence>
      <TransitionSeries.Transition presentation={slide({ direction: "from-bottom" })} timing={whip} />
      <TransitionSeries.Sequence name="Esercizio" durationInFrames={TIMING2.exercise.duration} premountFor={fps}>
        <ExerciseScene />
      </TransitionSeries.Sequence>
      <TransitionSeries.Transition presentation={wipe({ direction: "from-left" })} timing={whip} />
      <TransitionSeries.Sequence name="Progressi" durationInFrames={TIMING2.progress.duration} premountFor={fps}>
        <ProgressScene />
      </TransitionSeries.Sequence>
      <TransitionSeries.Transition presentation={fade()} timing={linearTiming({ durationInFrames: 12 })} />
      <TransitionSeries.Sequence name="Obiettivo" durationInFrames={TIMING2.goal.duration} premountFor={fps}>
        <GoalScene />
      </TransitionSeries.Sequence>
      <TransitionSeries.Transition presentation={slide({ direction: "from-bottom" })} timing={whip} />
      <TransitionSeries.Sequence name="Chiusura" durationInFrames={TIMING2.outro.duration} premountFor={fps}>
        <OutroScene2 />
      </TransitionSeries.Sequence>
    </TransitionSeries>
  );
};
