import React from "react";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { armPoints } from "../../character/Character";
import { fontFamily } from "../../fonts";
import { clamp, controlledRep, isBlinking, REST_ANGLE, TOP_ANGLE } from "../anim";
import { Captions, useSpeech } from "../Captions";
import { Sfx, VoiceTrack } from "../audio";
import { TIMING } from "../timing";
import { Backdrop, Camera, GREEN, PlacedCharacter, ViewChip, YELLOW, toStage } from "../ui";

const T = TIMING.side;
const CAPTIONS = T.captions;

const PLACE = { x: 470, footY: 1640, width: 600 };
const REP = { up: 50, hold: 14, down: 60, rest: 10 };

export const SideScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const speech = useSpeech(T.lines);
  const angle = frame < 12 ? REST_ANGLE : controlledRep(frame - 12, REP);
  const zoom = interpolate(frame, [0, 165], [1.12, 1.0]);
  const cx = interpolate(frame, [0, 165], [600, 540]);

  // hand trajectory in the scapular plane, sampled from the arm model
  const samples = Array.from({ length: 24 }).map((_, i) => {
    const a = REST_ANGLE + ((TOP_ANGLE - REST_ANGLE) * i) / 23;
    return toStage(armPoints("side", 1, a, 30).hand, PLACE);
  });
  const drawn = interpolate(frame, [70, 100], [0, 1], clamp);
  const n = Math.max(2, Math.round(samples.length * drawn));
  const path = samples
    .slice(0, n)
    .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x + 30} ${p.y}`)
    .join(" ");
  const tip = samples[n - 1];
  const prev = samples[n - 2];
  const ang = Math.atan2(tip.y - prev.y, tip.x - prev.x);
  const head = (o: number) =>
    `${tip.x + 30 - Math.cos(ang + o) * 30},${tip.y - Math.sin(ang + o) * 30}`;

  const shoulder = toStage(armPoints("side", 1, 0).shoulder, PLACE);
  const pop = spring({ frame: frame - 95, fps, config: { damping: 11 } });

  return (
    <AbsoluteFill>
      <Camera zoom={zoom} cx={cx} cy={1000}>
        <Backdrop floorY={PLACE.footY} />
        <svg width={1080} height={1920} style={{ position: "absolute", inset: 0 }}>
          {/* body line */}
          <line
            x1={shoulder.x}
            x2={shoulder.x}
            y1={shoulder.y - 40}
            y2={shoulder.y + 420}
            stroke="#A8A8A8"
            strokeWidth={5}
            strokeDasharray="16 12"
          />
        </svg>
        <PlacedCharacter
          {...PLACE}
          view="side"
          armAngle={angle}
          armPlane={30}
          mouth={speech.mouth}
          talk={speech.talk}
          blink={isBlinking(frame, 50)}
        />
        <svg width={1080} height={1920} style={{ position: "absolute", inset: 0 }}>
          {drawn > 0 ? (
            <g>
              <path d={path} stroke={GREEN} strokeWidth={8} fill="none" strokeDasharray="20 12" strokeLinecap="round" />
              <path
                d={`M ${head(0.5)} L ${tip.x + 30} ${tip.y} L ${head(-0.5)}`}
                stroke={GREEN}
                strokeWidth={8}
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </g>
          ) : null}
        </svg>
        <div
          style={{
            position: "absolute",
            left: 700,
            top: 820,
            transform: `scale(${pop}) rotate(4deg)`,
            transformOrigin: "left center",
            fontFamily,
            fontWeight: 800,
            fontSize: 46,
            background: YELLOW,
            padding: "8px 18px",
            borderRadius: 14,
            border: "4px solid #111",
            display: "flex",
            alignItems: "center",
            gap: 10,
          }}
        >
          AVANTI
          <svg width={44} height={30} viewBox="0 0 44 30">
            <path d="M 2 15 L 38 15 M 26 3 L 40 15 L 26 27" stroke="#111" strokeWidth={6} fill="none" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      </Camera>
      <ViewChip label="VISTA LATERALE" />
      <Captions captions={CAPTIONS} />
      <VoiceTrack lines={T.lines} />
      <Sfx name="whoosh" at={0} volume={0.45} />
      <Sfx name="chip" at={4} volume={0.4} />
      <Sfx name="pop2" at={95} volume={0.45} />
    </AbsoluteFill>
  );
};
