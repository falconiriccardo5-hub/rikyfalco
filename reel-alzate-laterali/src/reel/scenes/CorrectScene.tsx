import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { armPoints } from "../../character/Character";
import { fontFamily } from "../../fonts";
import { clamp, controlledPhase, controlledRep, REST_ANGLE, TOP_ANGLE } from "../anim";
import { Caption, Captions } from "../Captions";
import { Backdrop, Camera, GREEN, INK, PlacedCharacter, Stamp, ViewChip, toStage } from "../ui";

const CAPTIONS: Caption[] = [
  { from: 6, to: 78, text: "GIUSTO: sali LENTO e controllato" },
  { from: 80, to: 145, text: "fino all'altezza delle SPALLE…" },
  { from: 147, to: 225, text: "…poi FRENA la discesa" },
];

const PLACE = { x: 540, footY: 1660, width: 560 };
const REP = { up: 50, hold: 14, down: 78, rest: 12 };
const START = 20;

const PHASE_LABEL = {
  up: "SALI LENTO",
  hold: "PAUSA",
  down: "FRENA LA DISCESA",
  rest: "PRONTO",
} as const;

export const CorrectScene: React.FC = () => {
  const frame = useCurrentFrame();
  const f = frame - START;
  const angle = f < 0 ? REST_ANGLE : controlledRep(f, REP);
  const { phase, p } = f < 0 ? { phase: "rest" as const, p: 0 } : controlledPhase(f, REP);
  const k = (angle - REST_ANGLE) / (TOP_ANGLE - REST_ANGLE);
  const zoom = interpolate(frame, [0, 225], [1.0, 1.1]);

  const shoulderY = toStage(armPoints("back", 1, 0, 0).shoulder, PLACE).y;
  const fill = phase === "up" ? p : phase === "down" ? 1 - p : phase === "hold" ? 1 : 0;
  const seconds = phase === "up" ? Math.floor(p * 2) + 1 : phase === "down" ? Math.floor(p * 3) + 1 : null;
  const barColor = phase === "down" ? "#1C7ED6" : GREEN;

  return (
    <AbsoluteFill>
      <Camera zoom={zoom} cy={1010}>
        <Backdrop tint="green" floorY={PLACE.footY} />
        <svg width={1080} height={1920} style={{ position: "absolute", inset: 0 }}>
          <g opacity={interpolate(k, [0.5, 0.95], [0.25, 1], clamp)}>
            <line x1={60} x2={1020} y1={shoulderY} y2={shoulderY} stroke={GREEN} strokeWidth={6} strokeDasharray="22 14" />
          </g>
        </svg>
        <PlacedCharacter {...PLACE} view="back" armAngle={angle} armPlane={0} />
      </Camera>
      <ViewChip label="VISTA DA DIETRO" />
      <Stamp good label="CORRETTO" />
      {/* tempo meter */}
      <div
        style={{
          position: "absolute",
          top: 470,
          left: 150,
          right: 150,
          opacity: interpolate(frame, [14, 22], [0, 1], clamp),
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            fontFamily,
            fontWeight: 800,
            fontSize: 40,
            color: INK,
            marginBottom: 8,
          }}
        >
          <span>{PHASE_LABEL[phase]}</span>
          <span style={{ color: barColor }}>{seconds ? `${seconds}s` : ""}</span>
        </div>
        <div
          style={{
            height: 26,
            borderRadius: 13,
            border: `5px solid ${INK}`,
            background: "#fff",
            overflow: "hidden",
          }}
        >
          <div style={{ width: `${fill * 100}%`, height: "100%", background: barColor }} />
        </div>
      </div>
      <Captions captions={CAPTIONS} accent="#69DB7C" />
    </AbsoluteFill>
  );
};
