import React from "react";
import { AbsoluteFill, Easing, interpolate, useCurrentFrame } from "remotion";
import { W_COLORS } from "../../character/Woman";
import { fontFamily } from "../../fonts";
import { clamp, isBlinking } from "../../reel/anim";
import { Sfx, VoiceTrack } from "../../reel/audio";
import { Captions, useSpeech } from "../../reel/Captions";
import { Backdrop, Camera, INK, YELLOW } from "../../reel/ui";
import { BigText, PlacedWoman, linesOf } from "../parts";
import { TIMING2 } from "../timing";

const T = TIMING2.hook;
const PLACE = { x: 540, footY: 1700, width: 600 };

export const HookScene: React.FC = () => {
  const frame = useCurrentFrame();
  const speech = useSpeech(linesOf(T.lines, "lei"));
  const zoom = interpolate(frame, [0, T.duration], [1.65, 1.45], { ...clamp, easing: Easing.out(Easing.quad) });
  // she lifts the tiny dumbbell to look at it
  const lift = interpolate(frame, [0, 20], [0, 1], { ...clamp, easing: Easing.out(Easing.back(1.4)) });
  const bob = Math.sin(frame * 0.12) * 4;

  return (
    <AbsoluteFill>
      <Camera zoom={zoom} cy={820}>
        <Backdrop floorY={PLACE.footY} />
        <PlacedWoman
          {...PLACE}
          view="front"
          face="worried"
          speaking={speech.mouth === "talk"}
          talk={speech.talk}
          blink={isBlinking(frame, 40)}
          armR={{ upper: 10 + 6 * lift, fore: -6 - 144 * lift }}
          dumbbellR
          dumbbellScale={0.7}
          dumbbellColor={W_COLORS.pink}
          swing={Math.sin(frame * 0.15) * 3}
        />
        {/* floating question marks */}
        {[0, 1, 2].map((i) => {
          const t = frame - 14 - i * 9;
          const o = interpolate(t, [0, 6], [0, 1], clamp);
          return (
            <div
              key={i}
              style={{
                position: "absolute",
                left: 720 + i * 46,
                top: 560 - i * 50 + bob - t * 0.3,
                fontFamily,
                fontWeight: 800,
                fontSize: 70 + i * 14,
                color: i === 1 ? YELLOW : INK,
                WebkitTextStroke: i === 1 ? `3px ${INK}` : undefined,
                opacity: o,
                transform: `rotate(${(i - 1) * 14}deg) scale(${o})`,
              }}
            >
              ?
            </div>
          );
        })}
      </Camera>
      <BigText text="I PESI TI FARANNO DIVENTARE TROPPO GROSSA?" top={220} delay={2} size={80} bg={YELLOW} />
      <Captions captions={T.captions} />
      <VoiceTrack lines={T.lines} />
      <Sfx name="pop" at={2} volume={0.5} />
      <Sfx name="pop2" at={14} volume={0.35} />
      <Sfx name="pop2" at={23} volume={0.3} />
    </AbsoluteFill>
  );
};
