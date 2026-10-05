import React from "react";
import { AbsoluteFill, Easing, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { armPoints } from "../../character/Character";
import { fontFamily } from "../../fonts";
import { clamp, isBlinking } from "../anim";
import { Caption, Captions, useSpeech } from "../Captions";
import { Backdrop, Camera, INK, PlacedCharacter, RED, toStage } from "../ui";

const CAPTIONS: Caption[] = [
  { from: 6, to: 92, text: "Se le fai male rischi una lesione alla CUFFIA DEI ROTATORI" },
  { from: 116, to: 210, text: "SETTIMANE di stop tra visite, farmaci e fisioterapia" },
];

const PLACE = { x: 540, footY: 1640, width: 600 };

const CalendarIcon: React.FC = () => (
  <svg width={130} height={130} viewBox="0 0 130 130">
    <rect x={10} y={22} width={110} height={98} rx={14} fill="#fff" stroke={INK} strokeWidth={7} />
    <rect x={10} y={22} width={110} height={28} rx={10} fill={RED} stroke={INK} strokeWidth={7} />
    <path d="M 38 10 L 38 34 M 92 10 L 92 34" stroke={INK} strokeWidth={8} strokeLinecap="round" />
    {[0, 1, 2].map((r) =>
      [0, 1, 2].map((c) => (
        <path
          key={`${r}-${c}`}
          d={`M ${30 + c * 30 - 8} ${66 + r * 18 - 6} l 16 12 m 0 -12 l -16 12`}
          stroke={RED}
          strokeWidth={4}
          strokeLinecap="round"
        />
      )),
    )}
  </svg>
);

const PillsIcon: React.FC = () => (
  <svg width={130} height={130} viewBox="0 0 130 130">
    <g transform="rotate(-35 65 65)">
      <rect x={20} y={45} width={90} height={40} rx={20} fill="#fff" stroke={INK} strokeWidth={7} />
      <path d="M 65 45 L 65 85 L 40 85 A 20 20 0 0 1 40 45 Z" fill={RED} stroke={INK} strokeWidth={7} strokeLinejoin="round" />
    </g>
    <circle cx={98} cy={102} r={18} fill="#fff" stroke={INK} strokeWidth={7} />
    <path d="M 86 102 L 110 102" stroke={INK} strokeWidth={5} />
  </svg>
);

const DoctorIcon: React.FC = () => (
  <svg width={130} height={130} viewBox="0 0 130 130">
    <rect x={14} y={40} width={102} height={78} rx={14} fill="#fff" stroke={INK} strokeWidth={7} />
    <path d="M 46 40 L 46 24 Q 46 16 54 16 L 76 16 Q 84 16 84 24 L 84 40" fill="none" stroke={INK} strokeWidth={7} />
    <path d="M 65 58 L 65 100 M 44 79 L 86 79" stroke={RED} strokeWidth={14} strokeLinecap="round" />
  </svg>
);

const CARDS = [
  { icon: <CalendarIcon />, label: "SETTIMANE DI STOP", at: 118 },
  { icon: <PillsIcon />, label: "FARMACI", at: 134 },
  { icon: <DoctorIcon />, label: "VISITE MEDICHE", at: 150 },
];

export const RiskScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const speech = useSpeech(CAPTIONS);

  const shoulder = toStage(armPoints("front", 1, 0, 0).shoulder, PLACE);
  const zoomIn = interpolate(frame, [0, 40], [1, 1.9], { ...clamp, easing: Easing.inOut(Easing.cubic) });
  const pullBack = interpolate(frame, [96, 122], [0, 1], { ...clamp, easing: Easing.inOut(Easing.cubic) });
  const zoom = zoomIn + (0.9 - 1.9) * pullBack;
  const camX = interpolate(frame, [0, 40], [540, shoulder.x], clamp) * (1 - pullBack) + 540 * pullBack;
  const camY = interpolate(frame, [0, 40], [1000, shoulder.y + 40], clamp) * (1 - pullBack) + 790 * pullBack;

  const pulse = 0.65 + 0.35 * Math.sin(frame * 0.35);
  const alert = interpolate(frame, [20, 34], [0, 1], clamp) * pulse;
  const crack = interpolate(frame, [30, 44], [0, 1], clamp);
  const label = spring({ frame: frame - 40, fps, config: { damping: 12 } });

  return (
    <AbsoluteFill>
      <Camera zoom={zoom} cx={camX} cy={camY}>
        <Backdrop tint="red" floorY={PLACE.footY} />
        <PlacedCharacter
          {...PLACE}
          view="front"
          armAngle={6}
          armPlane={0}
          shoulderAlert={alert}
          mouth={speech.mouth === "talk" ? "talk" : "pain"}
          talk={speech.talk}
          blink={isBlinking(frame, 70)}
        />
        <svg width={1080} height={1920} style={{ position: "absolute", inset: 0 }}>
          {/* crack on the shoulder */}
          <path
            d={`M ${shoulder.x - 22} ${shoulder.y - 26} L ${shoulder.x - 4} ${shoulder.y - 6} L ${shoulder.x - 16} ${shoulder.y + 4} L ${shoulder.x + 8} ${shoulder.y + 28}`}
            stroke="#fff"
            strokeWidth={7}
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
            pathLength={1}
            strokeDasharray="1 1"
            strokeDashoffset={1 - crack}
          />
          {/* callout */}
          <g opacity={label * (1 - pullBack)}>
            <line
              x1={shoulder.x}
              y1={shoulder.y - 30}
              x2={shoulder.x + 70}
              y2={shoulder.y - 150}
              stroke={RED}
              strokeWidth={4}
            />
            <circle cx={shoulder.x} cy={shoulder.y - 30} r={6} fill={RED} />
          </g>
        </svg>
        <div
          style={{
            position: "absolute",
            left: shoulder.x + 30,
            top: shoulder.y - 250,
            opacity: label * (1 - pullBack),
            transform: `scale(${label})`,
            transformOrigin: "bottom left",
            background: RED,
            color: "#fff",
            fontFamily,
            fontWeight: 800,
            fontSize: 28,
            lineHeight: 1.1,
            padding: "10px 14px",
            borderRadius: 14,
            border: `4px solid ${INK}`,
            textAlign: "center",
            width: 250,
          }}
        >
          CUFFIA DEI ROTATORI
        </div>
      </Camera>
      <div
        style={{
          position: "absolute",
          top: 230,
          left: 70,
          right: 70,
          display: "flex",
          justifyContent: "space-between",
        }}
      >
        {CARDS.map((c) => {
          const s = spring({ frame: frame - c.at, fps, config: { damping: 10, stiffness: 170 } });
          return (
            <div
              key={c.label}
              style={{
                width: 296,
                background: "#fff",
                border: `6px solid ${INK}`,
                borderRadius: 26,
                padding: "18px 10px 16px",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 8,
                transform: `scale(${s}) translateY(${(1 - s) * 40}px)`,
                boxShadow: "0 10px 0 rgba(0,0,0,0.12)",
              }}
            >
              {c.icon}
              <div
                style={{
                  fontFamily,
                  fontWeight: 800,
                  fontSize: 30,
                  textAlign: "center",
                  lineHeight: 1.1,
                  color: INK,
                }}
              >
                {c.label}
              </div>
            </div>
          );
        })}
      </div>
      <Captions captions={CAPTIONS} accent="#FF6B5E" />
    </AbsoluteFill>
  );
};
