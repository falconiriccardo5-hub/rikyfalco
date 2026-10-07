import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { clamp, isBlinking } from "../../reel/anim";
import { Sfx, VoiceTrack } from "../../reel/audio";
import { Captions, useSpeech } from "../../reel/Captions";
import { Backdrop, Camera, GREEN, PlacedCharacter, RED } from "../../reel/ui";
import { BigText, linesOf } from "../parts";
import { TIMING2 } from "../timing";

const T = TIMING2.goal;
const SECOND = T.lines[1].start;

export const GoalScene: React.FC = () => {
  const frame = useCurrentFrame();
  const riky = useSpeech(linesOf(T.lines, "riky"));
  // strike through "ENORME" when he says it
  const strike = interpolate(frame, [T.lines[0].end - 14, T.lines[0].end], [0, 1], clamp);

  return (
    <AbsoluteFill>
      <Camera zoom={interpolate(frame, [0, T.duration], [1, 1.06])} cy={1100}>
        <Backdrop floorY={4000} />
        <PlacedCharacter
          x={540}
          footY={2520}
          width={880}
          view="front"
          dumbbells={false}
          armAngleL={6}
          armAngleR={6}
          armPlane={0}
          mouth={riky.mouth}
          talk={riky.talk}
          blink={isBlinking(frame, 33)}
        />
      </Camera>
      <BigText text="IL TUO OBIETTIVO NON È DIVENTARE ENORME" top={200} delay={T.lines[0].start} size={72} bg="#fff" rotate={-1.5} />
      <svg width={1080} height={1920} style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
        <line x1={560} x2={560 + 360 * strike} y1={330} y2={318} stroke={RED} strokeWidth={14} strokeLinecap="round" opacity={strike > 0 ? 1 : 0} />
      </svg>
      <BigText text="È DIVENTARE PIÙ FORTE, STABILE E CAPACE" top={430} delay={SECOND} size={72} color="#fff" bg={GREEN} rotate={1.5} />
      <Captions captions={T.captions} accent="#69DB7C" />
      <VoiceTrack lines={T.lines} />
      <Sfx name="whoosh" at={0} volume={0.4} />
      <Sfx name="pop" at={T.lines[0].start} volume={0.45} />
      <Sfx name="swish" at={T.lines[0].end - 14} volume={0.4} />
      <Sfx name="good" at={SECOND} volume={0.5} />
    </AbsoluteFill>
  );
};
