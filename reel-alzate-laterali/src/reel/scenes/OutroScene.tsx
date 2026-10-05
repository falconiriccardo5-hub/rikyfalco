import React from "react";
import { AbsoluteFill, Easing, interpolate, random, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { Character } from "../../character/Character";
import { fontFamily } from "../../fonts";
import { clamp, isBlinking } from "../anim";
import { Caption, Captions, useSpeech } from "../Captions";
import { Backdrop, Camera, INK, PlacedCharacter, YELLOW } from "../ui";

const CAPTIONS: Caption[] = [{ from: 4, to: 135, text: "SEGUIMI per altri consigli come questo!" }];

export const HANDLE = "@RiccardoFalconi_coach";

const PLACE = { x: 540, footY: 1700, width: 500 };
const CLICK = 72;
const BTN = { x: 540, y: 600 };

const Cursor: React.FC = () => (
  <svg width={70} height={84} viewBox="0 0 70 84">
    <path
      d="M 6 4 L 6 64 L 22 50 L 34 78 L 46 72 L 34 46 L 56 46 Z"
      fill="#fff"
      stroke={INK}
      strokeWidth={6}
      strokeLinejoin="round"
    />
  </svg>
);

export const OutroScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const speech = useSpeech(CAPTIONS);

  const card = spring({ frame: frame - 2, fps, config: { damping: 12, stiffness: 140 } });
  const followed = frame >= CLICK;
  const press = interpolate(frame, [CLICK - 3, CLICK, CLICK + 5], [1, 0.9, 1], clamp);
  const cursorT = interpolate(frame, [40, CLICK - 2], [0, 1], {
    ...clamp,
    easing: Easing.inOut(Easing.cubic),
  });
  const cursorOut = interpolate(frame, [CLICK + 15, CLICK + 30], [0, 1], clamp);
  const cursor = {
    x: interpolate(cursorT, [0, 1], [980, BTN.x + 60]) + cursorOut * 400,
    y: interpolate(cursorT, [0, 1], [1100, BTN.y + 10]),
  };
  const zoom = interpolate(frame, [0, 135], [1, 1.05]);
  const point = interpolate(frame, [6, 20], [6, 150], { ...clamp, easing: Easing.out(Easing.back(1.6)) });

  return (
    <AbsoluteFill>
      <Camera zoom={zoom} cy={1000}>
        <Backdrop floorY={PLACE.footY} />
        <PlacedCharacter
          {...PLACE}
          view="front"
          armAngleR={point}
          armAngleL={6}
          armPlane={0}
          dumbbells={false}
          mouth={speech.mouth}
          talk={speech.talk}
          blink={isBlinking(frame, 20)}
        />
      </Camera>
      {/* profile card */}
      <div
        style={{
          position: "absolute",
          top: 250,
          left: 80,
          right: 80,
          background: "#fff",
          border: `7px solid ${INK}`,
          borderRadius: 36,
          padding: "30px 30px 34px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          transform: `scale(${card}) rotate(${(1 - card) * -6}deg)`,
          boxShadow: "0 14px 0 rgba(0,0,0,0.15)",
        }}
      >
        <div
          style={{
            width: 150,
            height: 150,
            borderRadius: 75,
            border: `6px solid ${INK}`,
            background: `conic-gradient(${YELLOW}, #FF8A3D, #E8352B, ${YELLOW})`,
            padding: 6,
          }}
        >
          <div
            style={{
              width: "100%",
              height: "100%",
              borderRadius: "50%",
              overflow: "hidden",
              position: "relative",
              background: "#F6F4EF",
            }}
          >
            <div style={{ position: "absolute", width: 260, height: 520, left: -62, top: -18 }}>
              <Character view="front" dumbbells={false} />
            </div>
          </div>
        </div>
        <div style={{ fontFamily, fontWeight: 800, fontSize: 56, color: INK, marginTop: 18 }}>{HANDLE}</div>
        <div
          style={{
            marginTop: 22,
            transform: `scale(${press})`,
            background: followed ? "#E9ECEF" : "#0095F6",
            color: followed ? INK : "#fff",
            fontFamily,
            fontWeight: 800,
            fontSize: 46,
            borderRadius: 18,
            padding: "14px 70px",
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
      {/* confetti burst */}
      {followed ? (
        <svg width={1080} height={1920} style={{ position: "absolute", inset: 0 }}>
          {Array.from({ length: 36 }).map((_, i) => {
            const t = (frame - CLICK) / fps;
            const a = random(`a${i}`) * Math.PI * 2;
            const v = 500 + random(`v${i}`) * 700;
            const x = BTN.x + Math.cos(a) * v * t;
            const y = BTN.y + Math.sin(a) * v * t + 900 * t * t;
            const colors = [YELLOW, "#0095F6", "#E8352B", "#1FA855", INK];
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
      {cursorOut < 1 && frame > 36 ? (
        <div style={{ position: "absolute", left: cursor.x, top: cursor.y, transform: `scale(${press})` }}>
          <Cursor />
        </div>
      ) : null}
      <Captions captions={CAPTIONS} />
    </AbsoluteFill>
  );
};
