import React from "react";
import { AbsoluteFill, Easing, interpolate, useCurrentFrame } from "remotion";
import { armPoints } from "../../character/Character";
import { clamp, isBlinking } from "../anim";
import { Captions, useSpeech } from "../Captions";
import { Sfx, VoiceTrack } from "../audio";
import { TIMING } from "../timing";
import { Backdrop, Camera, PlacedCharacter, Title, toStage } from "../ui";

const T = TIMING.intro;
const CAPTIONS = T.captions;

const PLACE = { x: 540, footY: 1640, width: 560 };
const DROP_START = 72;
const DROP_END = 90;

export const IntroScene: React.FC = () => {
  const frame = useCurrentFrame();
  const speech = useSpeech(T.lines);

  // close-up on the face, then pull back to full body
  const zoom = interpolate(frame, [0, 50, 85], [1.75, 1.6, 1], {
    ...clamp,
    easing: Easing.inOut(Easing.cubic),
  });
  const cy = interpolate(frame, [0, 50, 85], [760, 780, 960], {
    ...clamp,
    easing: Easing.inOut(Easing.cubic),
  });

  // wave hello with the right arm
  const waveIn = interpolate(frame, [2, 12, 50, 62], [0, 1, 1, 0], clamp);
  const waveAngle = 6 + waveIn * (140 + 14 * Math.sin(frame * 0.45));

  const hasDumbbells = frame >= DROP_END;

  return (
    <AbsoluteFill>
      <Camera zoom={zoom} cy={cy}>
        <Backdrop floorY={PLACE.footY} />
        <PlacedCharacter
          {...PLACE}
          view="front"
          armAngleR={waveAngle}
          armAngleL={6}
          armPlane={0}
          dumbbells={hasDumbbells}
          mouth={speech.mouth}
          talk={speech.talk}
          blink={isBlinking(frame, 30)}
        />
        {/* dumbbells falling into the hands */}
        {!hasDumbbells && frame >= DROP_START ? (
          <svg width={1080} height={1920} style={{ position: "absolute", inset: 0 }}>
            {([-1, 1] as const).map((s) => {
              const hand = toStage(armPoints("front", s, 6, 0).hand, PLACE);
              const y = interpolate(frame, [DROP_START, DROP_END], [-200, hand.y], {
                ...clamp,
                easing: Easing.in(Easing.quad),
              });
              const r = 22 * (PLACE.width / 400);
              const pts = Array.from({ length: 6 })
                .map((_, i) => {
                  const a = (Math.PI / 3) * i + frame * 0.3 * s;
                  return `${hand.x + r * Math.cos(a)},${y + r * Math.sin(a)}`;
                })
                .join(" ");
              return <polygon key={s} points={pts} fill="#2A2A2A" stroke="#111" strokeWidth={6} />;
            })}
          </svg>
        ) : null}
      </Camera>
      {frame >= 60 ? <Title text="ALZATE LATERALI" sub="fatte BENE" delay={60} top={260} /> : null}
      <Captions captions={CAPTIONS} />
      <VoiceTrack lines={T.lines} />
      <Sfx name="pop" at={60} />
      <Sfx name="swish" at={74} volume={0.35} />
      <Sfx name="clank" at={DROP_END} volume={0.6} />
    </AbsoluteFill>
  );
};
