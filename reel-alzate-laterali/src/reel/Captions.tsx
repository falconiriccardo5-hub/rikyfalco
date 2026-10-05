import React from "react";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { fontFamily } from "../fonts";
import { clamp, talkAmount } from "./anim";
import type { TimedLine } from "./timing";

export type Caption = {
  readonly from: number;
  readonly to: number;
  /** Words written in UPPERCASE are highlighted */
  readonly text: string;
  /** Frames of spoken audio, used to pace the word reveal */
  readonly speak?: number;
};

const isKeyword = (w: string) => {
  const letters = w.replace(/[^A-Za-zÀ-ÿ]/g, "");
  return letters.length > 1 && letters === letters.toUpperCase();
};

/** Mouth state driven by the loudness envelope of the voiceover. */
export const useSpeech = (lines: readonly TimedLine[]) => {
  const frame = useCurrentFrame();
  const line = lines.find((l) => frame >= l.start && frame < l.end);
  if (!line) return { mouth: "smile" as const, talk: 0 };
  const i = frame - line.start;
  const v = line.env.length ? (line.env[i] ?? 0) : talkAmount(frame);
  const smooth = line.env.length ? (v + (line.env[i - 1] ?? v)) / 2 : v;
  return { mouth: "talk" as const, talk: Math.min(1, smooth * 1.1) };
};

export const Captions: React.FC<{
  captions: readonly Caption[];
  accent?: string;
  y?: number;
}> = ({ captions, accent = "#FFD43B", y = 1330 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const c = captions.find((cap) => frame >= cap.from && frame < cap.to);
  if (!c) return null;
  const words = c.text.split(" ");
  const local = frame - c.from;
  const revealSpan = c.speak ? c.speak * 0.85 : Math.min((c.to - c.from) * 0.6, words.length * 6);
  const enter = spring({ frame: local, fps, config: { damping: 14, stiffness: 180 } });
  const exit = interpolate(frame, [c.to - 6, c.to], [1, 0], clamp);

  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      <div
        style={{
          position: "absolute",
          top: y,
          left: 80,
          right: 80,
          display: "flex",
          justifyContent: "center",
          opacity: exit * Math.min(1, enter * 1.5),
          transform: `translateY(${(1 - enter) * 40}px) scale(${0.9 + enter * 0.1})`,
        }}
      >
        <div
          style={{
            background: "#111111",
            borderRadius: 28,
            padding: "22px 34px",
            boxShadow: "0 12px 0 rgba(0,0,0,0.15)",
            display: "flex",
            flexWrap: "wrap",
            justifyContent: "center",
            columnGap: 18,
            rowGap: 4,
            maxWidth: 920,
          }}
        >
          {words.map((w, i) => {
            const at = (i / words.length) * revealSpan;
            const s = spring({ frame: local - at, fps, config: { damping: 12, stiffness: 220 } });
            const key = isKeyword(w);
            return (
              <span
                key={`${w}-${i}`}
                style={{
                  fontFamily,
                  fontWeight: 800,
                  fontSize: 58,
                  lineHeight: 1.18,
                  color: key ? accent : "#FFFFFF",
                  opacity: s,
                  display: "inline-block",
                  transform: `translateY(${(1 - s) * 18}px)`,
                }}
              >
                {w}
              </span>
            );
          })}
        </div>
      </div>
    </AbsoluteFill>
  );
};
