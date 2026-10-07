import React from "react";
import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { Character } from "../character/Character";
import { Woman, WomanProps } from "../character/Woman";
import { fontFamily } from "../fonts";
import { clamp } from "../reel/anim";
import { useSpeech } from "../reel/Captions";
import type { TimedLine } from "../reel/timing";
import { INK, YELLOW } from "../reel/ui";

/** Woman drawn with her feet on (x, footY), `width` px wide (height = 2x). */
export const PlacedWoman: React.FC<WomanProps & { x: number; footY: number; width: number }> = ({
  x,
  footY,
  width,
  ...props
}) => {
  const s = width / 400;
  return (
    <div style={{ position: "absolute", left: x - width / 2, top: footY - 778 * s, width, height: width * 2 }}>
      <Woman {...props} />
    </div>
  );
};

export const linesOf = (lines: TimedLine[], speaker: "riky" | "lei") => lines.filter((l) => l.speaker === speaker);

/** Riky's face in a round badge, lip-synced, shown while he talks off-screen. */
export const RikyBadge: React.FC<{ lines: TimedLine[]; x?: number; y?: number; size?: number; delay?: number }> = ({
  lines,
  x = 70,
  y = 1545,
  size = 140,
  delay = 0,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const speech = useSpeech(linesOf(lines, "riky"));
  const s = spring({ frame: frame - delay, fps, config: { damping: 12 } });
  const talking = speech.mouth === "talk";
  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y,
        display: "flex",
        alignItems: "center",
        gap: 16,
        transform: `scale(${s})`,
        transformOrigin: "left center",
      }}
    >
      <div
        style={{
          width: size,
          height: size,
          borderRadius: size / 2,
          border: `7px solid ${INK}`,
          background: `conic-gradient(${YELLOW}, #FF8A3D, #E8352B, ${YELLOW})`,
          padding: 6,
          boxShadow: "0 10px 0 rgba(0,0,0,0.15)",
        }}
      >
        <div style={{ width: "100%", height: "100%", borderRadius: "50%", overflow: "hidden", position: "relative", background: "#F6F4EF" }}>
          <div style={{ position: "absolute", width: size * 1.75, height: size * 3.5, left: -size * 0.42, top: -size * 0.12 }}>
            <Character view="front" dumbbells={false} mouth={speech.mouth} talk={speech.talk} />
          </div>
        </div>
      </div>
      <div>
        <div
          style={{
            fontFamily,
            fontWeight: 800,
            fontSize: 34,
            color: "#fff",
            background: INK,
            padding: "6px 16px",
            borderRadius: 12,
          }}
        >
          COACH RIKY
        </div>
        <div style={{ display: "flex", gap: 6, marginTop: 10, height: 34, alignItems: "center" }}>
          {Array.from({ length: 7 }).map((_, i) => {
            const h = talking ? 8 + 26 * Math.abs(Math.sin(frame * 0.5 + i * 1.3)) * speech.talk : 6;
            return <div key={i} style={{ width: 8, height: h, borderRadius: 4, background: INK }} />;
          })}
        </div>
      </div>
    </div>
  );
};

/** Big storyboard text with a punchy pop-in. */
export const BigText: React.FC<{
  text: string;
  top: number;
  delay?: number;
  size?: number;
  color?: string;
  bg?: string;
  rotate?: number;
}> = ({ text, top, delay = 0, size = 92, color = INK, bg, rotate = -2 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame: frame - delay, fps, config: { damping: 10, stiffness: 170 } });
  if (frame < delay) return null;
  return (
    <div style={{ position: "absolute", top, left: 70, right: 70, display: "flex", justifyContent: "center" }}>
      <div
        style={{
          fontFamily,
          fontWeight: 800,
          fontSize: size,
          lineHeight: 1.02,
          color,
          textAlign: "center",
          letterSpacing: -1,
          background: bg,
          padding: bg ? "12px 26px" : 0,
          borderRadius: 22,
          border: bg ? `6px solid ${INK}` : undefined,
          transform: `scale(${s}) rotate(${rotate * s}deg)`,
          opacity: interpolate(frame - delay, [0, 4], [0, 1], clamp),
        }}
      >
        {text}
      </div>
    </div>
  );
};

/** Radial comic burst used for the "fantasy" scene. */
export const Burst: React.FC<{ colorA: string; colorB: string; spin?: number }> = ({ colorA, colorB, spin = 0 }) => {
  const rays = 24;
  return (
    <svg width={3240} height={5760} viewBox="-1620 -2880 3240 5760" style={{ position: "absolute", left: -1080, top: -1920 }}>
      <rect x={-1620} y={-2880} width={3240} height={5760} fill={colorA} />
      <g transform={`translate(0 -200) rotate(${spin})`}>
        {Array.from({ length: rays }).map((_, i) => {
          const a0 = (i / rays) * Math.PI * 2;
          const a1 = a0 + Math.PI / rays;
          return i % 2 === 0 ? (
            <path key={i} d={`M 0 0 L ${Math.cos(a0) * 4000} ${Math.sin(a0) * 4000} L ${Math.cos(a1) * 4000} ${Math.sin(a1) * 4000} Z`} fill={colorB} />
          ) : null;
        })}
      </g>
    </svg>
  );
};
