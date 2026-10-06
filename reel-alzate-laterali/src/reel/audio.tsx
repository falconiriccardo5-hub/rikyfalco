import React from "react";
import { Audio } from "@remotion/media";
import { Sequence, staticFile } from "remotion";
import type { TimedLine } from "./timing";

export const VoiceTrack: React.FC<{ lines: TimedLine[] }> = ({ lines }) => (
  <>
    {lines.map((l) =>
      l.file ? (
        <Sequence key={l.file} name={`Voce ${l.file}`} from={l.start} durationInFrames={l.end - l.start + 4} layout="none">
          <Audio src={staticFile(l.file)} />
        </Sequence>
      ) : null,
    )}
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
