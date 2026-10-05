import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { armPoints } from "../../character/Character";
import { REST_ANGLE, swungRep } from "../anim";
import { Caption, Captions } from "../Captions";
import { Backdrop, Camera, PlacedCharacter, RED, Stamp, ViewChip, toStage } from "../ui";

const CAPTIONS: Caption[] = [
  { from: 6, to: 70, text: "ERRORE: lanciare il peso" },
  { from: 72, to: 140, text: "Slancio col busto e SPALLE alzate" },
  { from: 142, to: 210, text: "e poi giù a PESO MORTO" },
];

const PLACE = { x: 540, footY: 1660, width: 560 };
const START = 18;

/** Rotates a viewBox point around the character's feet (lean). */
const leanPoint = (p: { x: number; y: number }, lean: number) => {
  const a = (-lean * Math.PI) / 180;
  const ox = 200;
  const oy = 770;
  const dx = p.x - ox;
  const dy = p.y - oy;
  return { x: ox + dx * Math.cos(a) - dy * Math.sin(a), y: oy + dx * Math.sin(a) + dy * Math.cos(a) };
};

export const WrongScene: React.FC = () => {
  const frame = useCurrentFrame();
  const f = frame - START;
  const rep = f < 0 ? { angle: REST_ANGLE, lean: 0, shrug: 0, fast: 0, t: 0 } : swungRep(f);
  const prev = f < 2 ? rep : swungRep(f - 2);
  const prev2 = f < 4 ? rep : swungRep(f - 4);

  const trails = [prev2, prev].map((r, i) => ({ r, opacity: 0.18 + i * 0.18 }));

  return (
    <AbsoluteFill>
      <Camera zoom={1.02} cy={1000} shake={rep.fast * 0.8} rotate={rep.fast * Math.sin(frame) * 0.6}>
        <Backdrop tint="red" floorY={PLACE.footY} />
        <svg width={1080} height={1920} style={{ position: "absolute", inset: 0 }}>
          {/* motion trails behind the dumbbells */}
          {rep.fast && f > 0
            ? trails.map(({ r, opacity }, i) =>
                ([-1, 1] as const).map((s) => {
                  const h = toStage(leanPoint(armPoints("back", s, r.angle, 0, r.shrug).hand, r.lean), PLACE);
                  return <circle key={`${i}-${s}`} cx={h.x} cy={h.y} r={30} fill={RED} opacity={opacity} />;
                }),
              )
            : null}
          {rep.fast && f > 0
            ? ([-1, 1] as const).map((s) => {
                const pts = [0, 1, 2, 3, 4].map((k) => {
                  const r = swungRep(Math.max(0, f - k));
                  return toStage(leanPoint(armPoints("back", s, r.angle, 0, r.shrug).hand, r.lean), PLACE);
                });
                return (
                  <path
                    key={s}
                    d={pts.map((p, i) => `${i ? "L" : "M"} ${p.x} ${p.y}`).join(" ")}
                    stroke={RED}
                    strokeWidth={10}
                    fill="none"
                    strokeLinecap="round"
                    opacity={0.6}
                  />
                );
              })
            : null}
        </svg>
        <PlacedCharacter
          {...PLACE}
          view="back"
          armAngle={rep.angle}
          armPlane={0}
          shrug={rep.shrug}
          lean={rep.lean}
          shoulderAlert={rep.shrug * 0.7}
        />
        {/* shrug arrows above the traps */}
        <svg width={1080} height={1920} style={{ position: "absolute", inset: 0 }}>
          {rep.shrug > 0.3
            ? ([-1, 1] as const).map((s) => {
                const sh = toStage(leanPoint(armPoints("back", s, 0, 0, rep.shrug).shoulder, rep.lean), PLACE);
                const x = sh.x - s * 34;
                const y = sh.y - 80 - rep.shrug * 20;
                return (
                  <path
                    key={s}
                    d={`M ${x} ${y + 50} L ${x} ${y} M ${x - 20} ${y + 20} L ${x} ${y} L ${x + 20} ${y + 20}`}
                    stroke={RED}
                    strokeWidth={9}
                    fill="none"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    opacity={rep.shrug}
                  />
                );
              })
            : null}
        </svg>
      </Camera>
      <ViewChip label="VISTA DA DIETRO" />
      <Stamp good={false} label="SBAGLIATO" />
      <Captions captions={CAPTIONS} accent="#FF6B5E" />
    </AbsoluteFill>
  );
};
