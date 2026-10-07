import React from "react";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { fontFamily } from "../../fonts";
import { clamp } from "../../reel/anim";
import { Sfx, VoiceTrack } from "../../reel/audio";
import { Captions } from "../../reel/Captions";
import { Backdrop, GREEN, INK, RED, YELLOW } from "../../reel/ui";
import { RikyBadge } from "../parts";
import { TIMING2 } from "../timing";

const T = TIMING2.factors;

const ICON = 104;
const Icons: Record<string, React.ReactNode> = {
  allenamento: (
    <svg width={ICON} height={ICON} viewBox="0 0 100 100">
      <rect x={30} y={44} width={40} height={12} rx={4} fill="#6E6E6E" stroke={INK} strokeWidth={5} />
      <rect x={12} y={28} width={18} height={44} rx={5} fill="#2A2A2A" stroke={INK} strokeWidth={5} />
      <rect x={70} y={28} width={18} height={44} rx={5} fill="#2A2A2A" stroke={INK} strokeWidth={5} />
    </svg>
  ),
  muscolo: (
    <svg width={ICON} height={ICON} viewBox="0 0 100 100">
      <path
        d="M 18 80 L 18 60 Q 18 46 32 44 L 46 42 Q 44 28 52 20 Q 62 12 70 22 Q 76 30 68 36 L 62 40 Q 86 44 84 64 Q 82 82 60 82 Z"
        fill="#fff"
        stroke={INK}
        strokeWidth={5}
        strokeLinejoin="round"
      />
      <path d="M 50 62 Q 62 54 72 62" stroke={INK} strokeWidth={4} fill="none" strokeLinecap="round" />
    </svg>
  ),
  alimentazione: (
    <svg width={ICON} height={ICON} viewBox="0 0 100 100">
      <circle cx={50} cy={56} r={30} fill="#fff" stroke={INK} strokeWidth={5} />
      <circle cx={50} cy={56} r={18} fill="#A8E6A1" stroke={INK} strokeWidth={4} />
      <path d="M 12 22 L 12 46 M 6 22 L 6 34 Q 6 40 12 40 Q 18 40 18 34 L 18 22 M 88 22 Q 96 34 88 46 L 88 22" stroke={INK} strokeWidth={4} fill="none" strokeLinecap="round" />
    </svg>
  ),
  calorie: (
    <svg width={ICON} height={ICON} viewBox="0 0 100 100">
      <path
        d="M 50 8 Q 74 34 74 58 Q 74 86 50 90 Q 26 86 26 58 Q 26 44 38 32 Q 38 46 46 50 Q 42 28 50 8 Z"
        fill="#FF8A3D"
        stroke={INK}
        strokeWidth={5}
        strokeLinejoin="round"
      />
      <path d="M 50 54 Q 62 66 58 78 Q 50 86 42 78 Q 40 68 50 54 Z" fill={YELLOW} stroke={INK} strokeWidth={4} />
    </svg>
  ),
  tempo: (
    <svg width={ICON} height={ICON} viewBox="0 0 100 100">
      <path d="M 26 10 L 74 10 M 26 90 L 74 90" stroke={INK} strokeWidth={6} strokeLinecap="round" />
      <path d="M 30 12 Q 30 40 50 50 Q 70 40 70 12 Z M 30 88 Q 30 60 50 50 Q 70 60 70 88 Z" fill="#fff" stroke={INK} strokeWidth={5} strokeLinejoin="round" />
      <path d="M 38 86 Q 50 66 62 86 Z M 42 22 L 58 22 L 50 34 Z" fill="#F2C14E" />
    </svg>
  ),
};

const STEPS = [
  { key: "allenamento", label: "ALLENAMENTO", note: "anni, specifico", color: "#DCE7FF" },
  { key: "muscolo", label: "MUSCOLO", note: "cresce piano", color: "#FFE3E3" },
  { key: "alimentazione", label: "ALIMENTAZIONE", note: "mirata", color: "#E3F7E1" },
  { key: "calorie", label: "CALORIE", note: "tante in più", color: "#FFE9D6" },
  { key: "tempo", label: "TEMPO", note: "tantissimo", color: "#FFF4C2" },
];

export const FactorsScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const span = T.lines[0].end - T.lines[0].start;
  const at = (i: number) => T.lines[0].start + Math.round((i / STEPS.length) * span * 0.85);

  return (
    <AbsoluteFill>
      <Backdrop tint="blue" floorY={4000} />
      <div
        style={{
          position: "absolute",
          top: 190,
          left: 0,
          right: 0,
          textAlign: "center",
          fontFamily,
          fontWeight: 800,
          fontSize: 52,
          color: INK,
          opacity: interpolate(frame, [0, 8], [0, 1], clamp),
        }}
      >
        PER DIVENTARE <span style={{ color: RED }}>ENORME</span> SERVONO:
      </div>
      {STEPS.map((step, i) => {
        const s = spring({ frame: frame - at(i), fps, config: { damping: 11, stiffness: 170 } });
        const y = 290 + i * 196;
        const left = i % 2 === 0 ? 110 : 250;
        const arrow = interpolate(frame - at(i + 1) + 4, [0, 8], [0, 1], clamp);
        return (
          <React.Fragment key={step.key}>
            {i < STEPS.length - 1 ? (
              <svg width={1080} height={80} style={{ position: "absolute", top: y + 150, left: 0, opacity: arrow }}>
                <path
                  d={`M ${left + 360} 6 Q ${(i % 2 === 0 ? 1 : -1) * 70 + 540} 40 ${(i % 2 === 0 ? 250 : 110) + 360} 74`}
                  stroke={INK}
                  strokeWidth={6}
                  fill="none"
                  strokeDasharray="14 10"
                  strokeLinecap="round"
                />
              </svg>
            ) : null}
            <div
              style={{
                position: "absolute",
                top: y,
                left,
                width: 720,
                height: 156,
                display: "flex",
                alignItems: "center",
                gap: 26,
                padding: "0 28px",
                background: step.color,
                border: `6px solid ${INK}`,
                borderRadius: 30,
                boxShadow: "0 10px 0 rgba(0,0,0,0.15)",
                transform: `scale(${s}) rotate(${(1 - s) * (i % 2 ? 6 : -6)}deg)`,
                opacity: frame >= at(i) ? 1 : 0,
              }}
            >
              <div
                style={{
                  width: 120,
                  height: 120,
                  borderRadius: 60,
                  background: "#fff",
                  border: `5px solid ${INK}`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {Icons[step.key]}
              </div>
              <div>
                <div style={{ fontFamily, fontWeight: 800, fontSize: 52, color: INK, lineHeight: 1 }}>{step.label}</div>
                <div style={{ fontFamily, fontWeight: 600, fontSize: 34, color: INK, opacity: 0.65 }}>{step.note}</div>
              </div>
              <div style={{ marginLeft: "auto", fontFamily, fontWeight: 800, fontSize: 56, color: GREEN }}>{i + 1}</div>
            </div>
          </React.Fragment>
        );
      })}
      <RikyBadge lines={T.lines} />
      <Captions captions={T.captions} y={1300} />
      <VoiceTrack lines={T.lines} />
      <Sfx name="whoosh" at={0} volume={0.4} />
      {STEPS.map((step, i) => (
        <Sfx key={step.key} name="pop" at={at(i)} volume={0.45} />
      ))}
    </AbsoluteFill>
  );
};
