import React from "react";
import { Audio } from "@remotion/media";
import { interpolate, Sequence, spring, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { fontFamily } from "./fonts";

export const W = 1080;
export const H = 1920;
export const INK = "#111111";
export const RED = "#E8352B";
export const GREEN = "#1FA855";
export const YELLOW = "#FFD43B";
export const PAPER = "#F6F4EF";
export const HANDLE = "@RiccardoFalconi_coach";

export const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

/** Spring that enters at `delay` and leaves `outLen` frames before `end`. */
export const useInOut = (delay: number, end: number, outLen = 8) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame: frame - delay, fps, config: { damping: 13, stiffness: 160 } });
  const out = interpolate(frame, [end - outLen, end], [1, 0], clamp);
  return { s, out, frame, fps };
};

/** White card with a thick ink border and a hard drop shadow (house style). */
export const Card: React.FC<{
  top: number;
  delay: number;
  end: number;
  children: React.ReactNode;
  padding?: string;
}> = ({ top, delay, end, children, padding = "28px 30px 32px" }) => {
  const { s, out } = useInOut(delay, end);
  return (
    <div
      style={{
        position: "absolute",
        top,
        left: 70,
        right: 70,
        background: "#fff",
        border: `7px solid ${INK}`,
        borderRadius: 36,
        padding,
        boxShadow: "0 14px 0 rgba(0,0,0,0.25)",
        transform: `scale(${s * (0.9 + out * 0.1)}) rotate(${(1 - s) * -6}deg)`,
        opacity: out,
      }}
    >
      {children}
    </div>
  );
};

export const isKeyword = (w: string) => {
  const letters = w.replace(/[^A-Za-zÀ-ÿ]/g, "");
  return letters.length > 1 && letters === letters.toUpperCase();
};

/** Text where UPPERCASE words get the yellow marker highlight. */
export const Highlighted: React.FC<{ text: string; size: number; color?: string }> = ({
  text,
  size,
  color = INK,
}) => (
  <>
    {text.split(" ").map((w, i) => {
      const key = isKeyword(w);
      return (
        <span
          key={i}
          style={{
            fontFamily,
            fontWeight: 800,
            fontSize: size,
            lineHeight: 1.25,
            color: key ? INK : color,
            background: key ? YELLOW : "transparent",
            borderRadius: 10,
            padding: key ? "0 10px" : 0,
            marginRight: size * 0.2,
            display: "inline-block",
          }}
        >
          {w}
        </span>
      );
    })}
  </>
);

export type SfxName =
  | "badge" | "card" | "celebrate" | "chip" | "clank" | "clank_light" | "click" | "crack"
  | "drop" | "error" | "good" | "heart" | "pop" | "pop2" | "rise" | "riser" | "swish"
  | "thud" | "tick" | "whoosh";

export const Sfx: React.FC<{ name: SfxName; at: number; volume?: number }> = ({ name, at, volume = 0.5 }) => (
  <Sequence name={`SFX ${name}`} from={at} durationInFrames={60} layout="none">
    <Audio src={staticFile(`sfx/${name}.wav`)} volume={volume} />
  </Sequence>
);

/** Footprint icon (no emoji: headless Chromium has no emoji font). */
export const Footprint: React.FC<{ size: number; color?: string }> = ({ size, color = INK }) => (
  <svg width={size} height={size} viewBox="0 0 100 100">
    <ellipse cx={46} cy={64} rx={20} ry={30} fill={color} />
    <circle cx={33} cy={24} r={9} fill={color} />
    <circle cx={50} cy={18} r={7} fill={color} />
    <circle cx={63} cy={22} r={6} fill={color} />
    <circle cx={72} cy={30} r={5} fill={color} />
    <circle cx={77} cy={40} r={4.5} fill={color} />
  </svg>
);
