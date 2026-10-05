import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { armPoints } from "../../character/Character";
import { fontFamily } from "../../fonts";
import { clamp, controlledRep, isBlinking, REST_ANGLE, TOP_ANGLE } from "../anim";
import { Caption, Captions, useSpeech } from "../Captions";
import { ArcArrow, Backdrop, Camera, GREEN, PlacedCharacter, ViewChip, toStage } from "../ui";

const CAPTIONS: Caption[] = [
  { from: 4, to: 78, text: "Manubri in mano, braccia lungo i fianchi" },
  { from: 80, to: 165, text: "Sali fino all'altezza delle SPALLE, non oltre" },
];

const PLACE = { x: 540, footY: 1640, width: 600 };
const REP = { up: 45, hold: 14, down: 55, rest: 10 };

export const FrontScene: React.FC = () => {
  const frame = useCurrentFrame();
  const speech = useSpeech(CAPTIONS);
  const angle = frame < 20 ? REST_ANGLE : controlledRep(frame - 20, REP);
  const zoom = interpolate(frame, [0, 165], [1, 1.08]);
  const k = (angle - REST_ANGLE) / (TOP_ANGLE - REST_ANGLE);

  const shoulderY = toStage(armPoints("front", 1, 0, 0).shoulder, PLACE).y;
  const lineOpacity = interpolate(k, [0.6, 0.95], [0, 1], clamp);

  return (
    <AbsoluteFill>
      <Camera zoom={zoom} cy={1000}>
        <Backdrop floorY={PLACE.footY} />
        <svg width={1080} height={1920} style={{ position: "absolute", inset: 0 }}>
          {([-1, 1] as const).map((s) => {
            const sh = toStage(armPoints("front", s, 0, 0).shoulder, PLACE);
            const hand = toStage(armPoints("front", s, REST_ANGLE, 0).hand, PLACE);
            const r = Math.hypot(hand.x - sh.x, hand.y - sh.y) + 30;
            const p = frame < 20 ? interpolate(frame, [4, 20], [0, 1], clamp) : 1;
            return (
              <ArcArrow
                key={s}
                cx={sh.x}
                cy={sh.y}
                r={r}
                from={s === -1 ? 105 : 75}
                to={s === -1 ? 178 : 2}
                progress={p}
                color="#9A9A9A"
                width={6}
              />
            );
          })}
          <g opacity={lineOpacity}>
            <line x1={60} x2={1020} y1={shoulderY} y2={shoulderY} stroke={GREEN} strokeWidth={6} strokeDasharray="22 14" />
            <text x={540} y={shoulderY + 70} textAnchor="middle" fill={GREEN} style={{ fontFamily, fontWeight: 800, fontSize: 40 }}>
              STOP ALLE SPALLE
            </text>
          </g>
        </svg>
        <PlacedCharacter
          {...PLACE}
          view="front"
          armAngle={angle}
          armPlane={0}
          mouth={speech.mouth}
          talk={speech.talk}
          blink={isBlinking(frame, 10)}
        />
      </Camera>
      <ViewChip label="VISTA FRONTALE" />
      <Captions captions={CAPTIONS} />
    </AbsoluteFill>
  );
};
