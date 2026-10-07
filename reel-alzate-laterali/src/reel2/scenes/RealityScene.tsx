import React from "react";
import { AbsoluteFill, Easing, interpolate, useCurrentFrame } from "remotion";
import { W_COLORS } from "../../character/Woman";
import { clamp, isBlinking } from "../../reel/anim";
import { Sfx, VoiceTrack } from "../../reel/audio";
import { Captions, useSpeech } from "../../reel/Captions";
import { Backdrop, Camera, PlacedCharacter, RED } from "../../reel/ui";
import { BigText, PlacedWoman, linesOf } from "../parts";
import { TIMING2 } from "../timing";

const T = TIMING2.reality;
const HER = { x: 330, footY: 1640, width: 520 };
const RIKY_END = { x: 790, footY: 1640, width: 500 };
// "non funziona così" starts roughly halfway through the line
const STAMP_AT = T.lines[0].start + Math.round((T.lines[0].end - T.lines[0].start) * 0.45);

export const RealityScene: React.FC = () => {
  const frame = useCurrentFrame();
  const riky = useSpeech(linesOf(T.lines, "riky"));
  const deflate = interpolate(frame, [0, 10], [1, 0], { ...clamp, easing: Easing.in(Easing.quad) });
  const puff = interpolate(frame, [0, 22], [0, 1], clamp);
  const enter = interpolate(frame, [4, 24], [0, 1], { ...clamp, easing: Easing.out(Easing.cubic) });
  const rikyX = interpolate(enter, [0, 1], [1400, RIKY_END.x]);
  const walk = enter < 1 ? Math.abs(Math.sin(frame * 0.7)) * 14 : 0;
  // she looks at the tiny dumbbell, then relaxes once Riky explains
  const relax = interpolate(frame, [STAMP_AT, STAMP_AT + 20], [0, 1], clamp);

  return (
    <AbsoluteFill>
      <Camera zoom={interpolate(frame, [0, T.duration], [1.02, 1.08])} cy={1000}>
        <Backdrop floorY={HER.footY} />
        <PlacedWoman
          {...HER}
          view="front"
          face={relax > 0.5 ? "smile" : "worried"}
          bulk={deflate}
          blink={isBlinking(frame, 25)}
          armR={{ upper: 16, fore: -150 }}
          dumbbellR
          dumbbellScale={0.7}
          dumbbellColor={W_COLORS.pink}
        />
        {/* smoke puff */}
        {puff < 1
          ? Array.from({ length: 9 }).map((_, i) => {
              const a = (i / 9) * Math.PI * 2;
              const r = 80 + puff * 260;
              const size = 160 * (1 - puff * 0.6);
              return (
                <div
                  key={i}
                  style={{
                    position: "absolute",
                    left: HER.x + Math.cos(a) * r - size / 2,
                    top: 1150 + Math.sin(a) * r * 1.3 - size / 2,
                    width: size,
                    height: size,
                    borderRadius: "50%",
                    background: "#E9E4F7",
                    border: "5px solid #111",
                    opacity: 1 - puff,
                  }}
                />
              );
            })
          : null}
        <PlacedCharacter
          {...RIKY_END}
          x={rikyX}
          footY={RIKY_END.footY - walk}
          view="front"
          dumbbells={false}
          armAngleL={enter < 1 ? 6 : 6}
          armAngleR={enter < 1 ? 6 : 6 + 34 * interpolate(frame, [STAMP_AT - 8, STAMP_AT], [0, 1], clamp)}
          armPlane={0}
          mouth={riky.mouth}
          talk={riky.talk}
          blink={isBlinking(frame, 60)}
        />
      </Camera>
      <BigText text="NON FUNZIONA COSÌ" top={260} delay={STAMP_AT} size={88} color="#fff" bg={RED} rotate={-4} />
      <Captions captions={T.captions} />
      <VoiceTrack lines={T.lines} />
      <Sfx name="poof" at={0} volume={0.6} />
      <Sfx name="whoosh" at={4} volume={0.45} />
      <Sfx name="stamp" at={STAMP_AT} volume={0.7} />
      <Sfx name="error" at={STAMP_AT + 1} volume={0.35} />
    </AbsoluteFill>
  );
};
