import React from "react";
import { AbsoluteFill, Easing, interpolate, random, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { armPoints, Character } from "../../character/Character";
import { fontFamily } from "../../fonts";
import { clamp, isBlinking } from "../../reel/anim";
import { Sfx, VoiceTrack } from "../../reel/audio";
import { Captions, useSpeech } from "../../reel/Captions";
import { Backdrop, Camera, INK, PlacedCharacter, YELLOW, toStage } from "../../reel/ui";
import { BigText, PlacedWoman, linesOf } from "../parts";
import { TIMING2 } from "../timing";

const T = TIMING2.outro;
const RIKY = { x: 400, footY: 1660, width: 480 };
const DROP = 14;
const LAND = 28;
const CTA = T.lines[1].start;
const CLICK = CTA + 26;
const HANDLE = "@RiccardoFalconi_coach";

export const OutroScene2: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const riky = useSpeech(linesOf(T.lines, "riky"));
  const holding = frame < DROP;
  const card = spring({ frame: frame - CTA, fps, config: { damping: 12, stiffness: 140 } });
  const followed = frame >= CLICK;
  const press = interpolate(frame, [CLICK - 3, CLICK, CLICK + 5], [1, 0.9, 1], clamp);
  const wave = 140 + Math.sin(frame * 0.35) * 16;

  return (
    <AbsoluteFill>
      <Camera zoom={1.02} cy={1000}>
        <Backdrop floorY={RIKY.footY} />
        {/* dumbbells he puts down on the floor */}
        {([-1, 1] as const).map((s) => {
          const hand = toStage(armPoints("front", s, 6, 0).hand, RIKY);
          const y = interpolate(frame, [DROP, LAND], [hand.y, RIKY.footY - 26], { ...clamp, easing: Easing.in(Easing.quad) });
          const x = hand.x + s * interpolate(frame, [DROP, LAND], [0, 40], clamp);
          if (holding) return null;
          const r = 30;
          const pts = Array.from({ length: 6 })
            .map((_, i) => `${x + r * Math.cos((Math.PI / 3) * i)},${y + r * Math.sin((Math.PI / 3) * i)}`)
            .join(" ");
          return <polygon key={s} points={pts} fill="#2A2A2A" stroke={INK} strokeWidth={6} />;
        })}
        <PlacedCharacter
          {...RIKY}
          view="front"
          dumbbells={holding}
          armAngleL={6}
          armAngleR={frame > LAND + 6 ? 6 + 34 * interpolate(frame, [LAND + 6, LAND + 16], [0, 1], clamp) : 6}
          armPlane={0}
          mouth={riky.mouth}
          talk={riky.talk}
          blink={isBlinking(frame, 8)}
        />
        <PlacedWoman
          x={790}
          footY={RIKY.footY}
          width={440}
          view="front"
          face="proud"
          tone={1}
          blink={isBlinking(frame, 51)}
          armR={{ upper: wave, fore: -20 }}
          swing={Math.sin(frame * 0.2) * 4}
        />
      </Camera>
      {frame < CTA ? <BigText text="I PESI NON SONO IL NEMICO" top={230} delay={T.lines[0].start + 8} size={92} bg={YELLOW} /> : null}
      {frame >= CTA ? (
        <div
          style={{
            position: "absolute",
            top: 220,
            left: 80,
            right: 80,
            background: "#fff",
            border: `7px solid ${INK}`,
            borderRadius: 36,
            padding: "28px 30px 32px",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            transform: `scale(${card})`,
            boxShadow: "0 14px 0 rgba(0,0,0,0.15)",
          }}
        >
          <div
            style={{
              width: 140,
              height: 140,
              borderRadius: 70,
              border: `6px solid ${INK}`,
              background: `conic-gradient(${YELLOW}, #FF8A3D, #E8352B, ${YELLOW})`,
              padding: 6,
            }}
          >
            <div style={{ width: "100%", height: "100%", borderRadius: "50%", overflow: "hidden", position: "relative", background: "#F6F4EF" }}>
              <div style={{ position: "absolute", width: 240, height: 480, left: -58, top: -16 }}>
                <Character view="front" dumbbells={false} />
              </div>
            </div>
          </div>
          <div style={{ fontFamily, fontWeight: 800, fontSize: 56, color: INK, marginTop: 14 }}>{HANDLE}</div>
          <div
            style={{
              marginTop: 18,
              transform: `scale(${press})`,
              background: followed ? "#E9ECEF" : "#0095F6",
              color: followed ? INK : "#fff",
              fontFamily,
              fontWeight: 800,
              fontSize: 46,
              borderRadius: 18,
              padding: "12px 70px",
              display: "flex",
              alignItems: "center",
              gap: 14,
            }}
          >
            {followed ? "Segui già" : "Segui"}
            {followed ? (
              <svg width={38} height={38} viewBox="0 0 38 38">
                <path d="M 6 20 L 15 29 L 32 9" stroke={INK} strokeWidth={6} fill="none" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            ) : null}
          </div>
        </div>
      ) : null}
      {followed ? (
        <svg width={1080} height={1920} style={{ position: "absolute", inset: 0 }}>
          {Array.from({ length: 36 }).map((_, i) => {
            const t = (frame - CLICK) / fps;
            const a = random(`a${i}`) * Math.PI * 2;
            const v = 500 + random(`v${i}`) * 700;
            const x = 540 + Math.cos(a) * v * t;
            const y = 560 + Math.sin(a) * v * t + 900 * t * t;
            const colors = [YELLOW, "#0095F6", "#E8352B", "#1FA855", "#FF8FB8"];
            return (
              <rect
                key={i}
                x={x}
                y={y}
                width={18}
                height={10}
                fill={colors[i % colors.length]}
                transform={`rotate(${frame * 12 + i * 40} ${x + 9} ${y + 5})`}
                opacity={interpolate(t, [0.8, 1.4], [1, 0], clamp)}
              />
            );
          })}
        </svg>
      ) : null}
      <Captions captions={T.captions} />
      <VoiceTrack lines={T.lines} />
      <Sfx name="whoosh" at={0} volume={0.4} />
      <Sfx name="clank" at={LAND} volume={0.65} />
      <Sfx name="clank_light" at={LAND + 3} volume={0.4} />
      <Sfx name="pop" at={T.lines[0].start + 8} volume={0.45} />
      <Sfx name="card" at={CTA} volume={0.45} />
      <Sfx name="click" at={CLICK} volume={0.7} />
      <Sfx name="celebrate" at={CLICK + 2} volume={0.5} />
    </AbsoluteFill>
  );
};
