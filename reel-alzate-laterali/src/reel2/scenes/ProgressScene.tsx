import React from "react";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { fontFamily } from "../../fonts";
import { clamp, isBlinking } from "../../reel/anim";
import { Sfx, VoiceTrack } from "../../reel/audio";
import { Captions } from "../../reel/Captions";
import { Backdrop, GREEN, INK, YELLOW } from "../../reel/ui";
import { PlacedWoman, RikyBadge } from "../parts";
import { TIMING2 } from "../timing";

const T = TIMING2.progress;
const FOOT = 1230;
const STAGES = [
  { week: 1, x: 190, tone: 0, face: "smile" as const, at: 8 },
  { week: 8, x: 540, tone: 0.55, face: "smile" as const, at: 48 },
  { week: 16, x: 890, tone: 1, face: "proud" as const, at: 88 },
];

export const ProgressScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const line = interpolate(frame, [8, 110], [0, 1], clamp);

  return (
    <AbsoluteFill>
      <Backdrop floorY={FOOT} />
      <div style={{ position: "absolute", top: 190, left: 0, right: 0, textAlign: "center", fontFamily, fontWeight: 800, fontSize: 58, color: INK }}>
        PROGRESSI <span style={{ background: YELLOW, padding: "0 14px", borderRadius: 10 }}>REALI</span>
      </div>
      {/* timeline */}
      <svg width={1080} height={1920} style={{ position: "absolute", inset: 0 }}>
        <line x1={120} x2={120 + 840 * line} y1={FOOT + 40} y2={FOOT + 40} stroke={GREEN} strokeWidth={10} strokeLinecap="round" />
        {line > 0.98 ? <path d={`M 940 ${FOOT + 22} L 966 ${FOOT + 40} L 940 ${FOOT + 58}`} stroke={GREEN} strokeWidth={10} fill="none" strokeLinecap="round" strokeLinejoin="round" /> : null}
      </svg>
      {STAGES.map((st) => {
        const s = spring({ frame: frame - st.at, fps, config: { damping: 12 } });
        if (frame < st.at) return null;
        return (
          <React.Fragment key={st.week}>
            <div style={{ position: "absolute", left: 0, top: 0, width: 1080, height: 1920, transform: `scale(${s})`, transformOrigin: `${st.x}px ${FOOT}px` }}>
              <PlacedWoman
                x={st.x}
                footY={FOOT}
                width={330}
                view="front"
                face={st.face}
                tone={st.tone}
                blink={isBlinking(frame, st.week * 7)}
                armR={st.week === 16 ? { upper: 40, fore: -110 } : undefined}
              />
            </div>
            <div
              style={{
                position: "absolute",
                top: 360,
                left: st.x - 150,
                width: 300,
                textAlign: "center",
                transform: `translateY(${(1 - s) * -30}px)`,
                opacity: s,
              }}
            >
              <div
                style={{
                  display: "inline-block",
                  fontFamily,
                  fontWeight: 800,
                  fontSize: 36,
                  color: "#fff",
                  background: st.week === 16 ? GREEN : INK,
                  padding: "8px 18px",
                  borderRadius: 999,
                }}
              >
                SETTIMANA {st.week}
              </div>
            </div>
          </React.Fragment>
        );
      })}
      <RikyBadge lines={T.lines} />
      <Captions captions={T.captions} accent="#69DB7C" />
      <VoiceTrack lines={T.lines} />
      <Sfx name="whoosh" at={0} volume={0.4} />
      {STAGES.map((st) => (
        <Sfx key={st.week} name="pop2" at={st.at} volume={0.5} />
      ))}
      <Sfx name="good" at={STAGES[2].at + 6} volume={0.4} />
    </AbsoluteFill>
  );
};
