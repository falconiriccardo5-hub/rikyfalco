import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { fontFamily } from "../../fonts";
import { clamp, controlledPhase, isBlinking } from "../../reel/anim";
import { Sfx, VoiceTrack } from "../../reel/audio";
import { Captions, useSpeech } from "../../reel/Captions";
import { Backdrop, Camera, GREEN, INK, PlacedCharacter, ViewChip } from "../../reel/ui";
import { PlacedWoman, linesOf } from "../parts";
import { TIMING2 } from "../timing";

const T = TIMING2.exercise;
const HER = { x: 640, footY: 1640, width: 560 };
const RIKY = { x: 230, footY: 1640, width: 400 };
const REP = { up: 45, hold: 10, down: 60, rest: 12 };
const START = 12;
const CYCLE = REP.up + REP.hold + REP.down + REP.rest;

const PHASE = { up: "SALI LENTO", hold: "PAUSA", down: "SCENDI LENTO", rest: "PRONTA" } as const;

export const ExerciseScene: React.FC = () => {
  const frame = useCurrentFrame();
  const riky = useSpeech(linesOf(T.lines, "riky"));
  const f = frame - START;
  const { phase, p } = f < 0 ? { phase: "rest" as const, p: 0 } : controlledPhase(f, REP);
  const k = phase === "up" ? p : phase === "hold" ? 1 : phase === "down" ? 1 - p : 0;
  const eased = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
  const curl = { upper: 4 + 8 * eased, fore: -8 - 122 * eased };
  const fill = k;
  const barColor = phase === "down" ? "#1C7ED6" : GREEN;

  return (
    <AbsoluteFill>
      <Camera zoom={interpolate(frame, [0, T.duration], [1.0, 1.08])} cy={1050}>
        <Backdrop tint="green" floorY={HER.footY} />
        <PlacedCharacter
          {...RIKY}
          view="front"
          dumbbells={false}
          armAngleL={6}
          armAngleR={riky.mouth === "talk" ? 30 + Math.sin(frame * 0.2) * 8 : 6}
          armPlane={0}
          mouth={riky.mouth}
          talk={riky.talk}
          blink={isBlinking(frame, 15)}
        />
        <PlacedWoman
          {...HER}
          view="side"
          face="smile"
          blink={isBlinking(frame, 44)}
          armL={curl}
          armR={curl}
          dumbbellL
          dumbbellR
          dumbbellScale={0.9}
          swing={Math.sin(frame * 0.1) * 2}
        />
      </Camera>
      <ViewChip label="VISTA LATERALE" />
      <div style={{ position: "absolute", top: 300, left: 150, right: 150, opacity: interpolate(frame, [6, 14], [0, 1], clamp) }}>
        <div style={{ display: "flex", justifyContent: "space-between", fontFamily, fontWeight: 800, fontSize: 42, color: INK, marginBottom: 8 }}>
          <span>{PHASE[phase]}</span>
          <span style={{ color: barColor }}>PESO MODERATO</span>
        </div>
        <div style={{ height: 28, borderRadius: 14, border: `5px solid ${INK}`, background: "#fff", overflow: "hidden" }}>
          <div style={{ width: `${fill * 100}%`, height: "100%", background: barColor }} />
        </div>
      </div>
      <Captions captions={T.captions} accent="#69DB7C" />
      <VoiceTrack lines={T.lines} />
      <Sfx name="whoosh" at={0} volume={0.4} />
      <Sfx name="chip" at={4} volume={0.4} />
      {Array.from({ length: Math.ceil((T.duration - START) / CYCLE) }).flatMap((_, n) => {
        const c = START + n * CYCLE;
        return [c, c + REP.up + REP.hold]
          .filter((a) => a < T.duration)
          .map((a) => <Sfx key={a} name="tick" at={a} volume={0.35} />);
      })}
    </AbsoluteFill>
  );
};
