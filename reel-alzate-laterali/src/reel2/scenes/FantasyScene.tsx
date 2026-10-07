import React from "react";
import { AbsoluteFill, Easing, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { W_COLORS } from "../../character/Woman";
import { fontFamily } from "../../fonts";
import { clamp, isBlinking } from "../../reel/anim";
import { Sfx, VoiceTrack } from "../../reel/audio";
import { Captions, useSpeech } from "../../reel/Captions";
import { Backdrop, Camera, INK, YELLOW } from "../../reel/ui";
import { Burst, PlacedWoman, linesOf } from "../parts";
import { TIMING2 } from "../timing";

const T = TIMING2.fantasy;
const PLACE = { x: 540, footY: 1640, width: 560 };
export const BOOM_AT = 34;

export const FantasyScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const speech = useSpeech(linesOf(T.lines, "lei"));
  const boomed = frame >= BOOM_AT;

  // curl the tiny dumbbell, then BOOM
  const curl = interpolate(frame, [4, 26], [0, 1], { ...clamp, easing: Easing.inOut(Easing.cubic) });
  const bulk = spring({ frame: frame - BOOM_AT, fps, config: { damping: 7, stiffness: 120 } });
  const flex = spring({ frame: frame - BOOM_AT - 4, fps, config: { damping: 9 } });
  const flash = interpolate(frame, [BOOM_AT - 2, BOOM_AT, BOOM_AT + 8], [0, 1, 0], clamp);
  const punch = boomed ? interpolate(frame, [BOOM_AT, BOOM_AT + 10], [1.25, 1.0], { ...clamp, easing: Easing.out(Easing.cubic) }) : 1;
  const zoom = (boomed ? 0.95 + (frame - BOOM_AT) * 0.0012 : interpolate(frame, [0, BOOM_AT], [1.2, 1.35], clamp)) * punch;
  const shake = interpolate(frame, [BOOM_AT, BOOM_AT + 18], [1.2, 0], clamp);
  const boomText = spring({ frame: frame - BOOM_AT, fps, config: { damping: 8, stiffness: 200 } });

  const armR = boomed
    ? { upper: 20 + 72 * flex, fore: -150 + 236 * flex }
    : { upper: 10 + 4 * curl, fore: -8 - 130 * curl };
  const armL = boomed ? { upper: 12 + 80 * flex, fore: -6 + 92 * flex } : { upper: 12, fore: -6 };
  const shocked = frame >= T.lines[1]?.start;

  return (
    <AbsoluteFill>
      <Camera zoom={zoom} cy={boomed ? 1000 : 860} shake={shake}>
        {boomed ? <Burst colorA="#7B3FE4" colorB="#9B6BF2" spin={frame * 0.4} /> : <Backdrop floorY={PLACE.footY} />}
        {boomed ? (
          <svg width={1080} height={1920} style={{ position: "absolute", inset: 0 }}>
            <line x1={-1000} x2={2080} y1={PLACE.footY} y2={PLACE.footY} stroke={INK} strokeWidth={5} />
          </svg>
        ) : null}
        <PlacedWoman
          {...PLACE}
          view="front"
          face={boomed ? (shocked ? "shock" : "flex") : "smile"}
          speaking={speech.mouth === "talk" && !(boomed && !shocked)}
          talk={speech.talk}
          blink={!boomed && isBlinking(frame, 12)}
          bulk={boomed ? bulk : 0}
          armL={armL}
          armR={armR}
          dumbbellR
          dumbbellScale={0.7}
          dumbbellColor={W_COLORS.pink}
          swing={Math.sin(frame * 0.3) * (boomed ? 8 : 3)}
        />
        {/* power lines */}
        {boomed
          ? Array.from({ length: 10 }).map((_, i) => {
              const a = (i / 10) * Math.PI * 2;
              const r0 = 380 + ((frame * 14 + i * 40) % 160);
              return (
                <div
                  key={i}
                  style={{
                    position: "absolute",
                    left: 540 + Math.cos(a) * r0,
                    top: 1000 + Math.sin(a) * r0 * 1.2,
                    width: 70,
                    height: 10,
                    borderRadius: 5,
                    background: YELLOW,
                    border: `3px solid ${INK}`,
                    transform: `rotate(${(a * 180) / Math.PI}deg)`,
                    opacity: interpolate(frame - BOOM_AT, [0, 30], [1, 0.5], clamp),
                  }}
                />
              );
            })
          : null}
      </Camera>
      {boomed ? (
        <div
          style={{
            position: "absolute",
            top: 230,
            left: 0,
            right: 0,
            textAlign: "center",
            fontFamily,
            fontWeight: 800,
            fontSize: 200,
            color: YELLOW,
            WebkitTextStroke: `10px ${INK}`,
            paintOrder: "stroke",
            transform: `scale(${boomText}) rotate(${-8 + Math.sin(frame * 0.6) * 2}deg)`,
            textShadow: "0 14px 0 rgba(0,0,0,0.25)",
          }}
        >
          BOOM!
        </div>
      ) : null}
      <AbsoluteFill style={{ background: "#fff", opacity: flash }} />
      <Captions captions={T.captions} />
      <VoiceTrack lines={T.lines} />
      <Sfx name="whoosh" at={0} volume={0.4} />
      <Sfx name="riser" at={6} volume={0.45} />
      <Sfx name="boom" at={BOOM_AT - 1} volume={0.5} />
      <Sfx name="thud" at={BOOM_AT} volume={0.4} />
      <Sfx name="powerup" at={BOOM_AT + 4} volume={0.45} />
    </AbsoluteFill>
  );
};
