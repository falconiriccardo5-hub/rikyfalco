import { SCRIPT, type SceneScript, type Speaker } from "./script";
import VOICE from "./voice.json";
import type { Caption } from "./Captions";

export type TimedLine = {
  start: number;
  end: number;
  file: string;
  env: number[];
  speaker: Speaker;
};

export type SceneTiming = {
  duration: number;
  lines: TimedLine[];
  captions: Caption[];
};

const GAP = 6;
const CAPTION_TAIL = 14;
const SCENE_TAIL = 18;

type VoiceLine = { file: string; frames: number; env: number[]; speaker?: Speaker };

/** Places each voice line on the scene timeline and derives captions + scene lengths. */
export const buildTiming = (
  script: SceneScript[],
  voiceData: Record<string, VoiceLine[]>,
): Record<string, SceneTiming> =>
  Object.fromEntries(
    script.map((scene) => {
      const audio = voiceData[scene.id] ?? [];
      const lines: TimedLine[] = [];
      let cursor = 0;
      scene.lines.forEach((l, i) => {
        const a = audio[i];
        const frames = a?.frames ?? 60;
        const start = Math.max(l.at ?? 0, cursor);
        lines.push({
          start,
          end: start + frames,
          file: a?.file ?? "",
          env: a?.env ?? [],
          speaker: l.speaker ?? "riky",
        });
        cursor = start + frames + GAP;
      });
      const captions: Caption[] = scene.lines.map((l, i) => {
        const next = lines[i + 1]?.start ?? Infinity;
        return {
          from: lines[i].start,
          to: Math.min(lines[i].end + CAPTION_TAIL, next - 1),
          text: l.text,
          speak: lines[i].end - lines[i].start,
        };
      });
      const last = lines[lines.length - 1];
      const duration = Math.max(scene.minFrames, (last?.end ?? 0) + SCENE_TAIL);
      return [scene.id, { duration, lines, captions }];
    }),
  );

export const TIMING = buildTiming(SCRIPT, VOICE as Record<string, VoiceLine[]>);

/** Transition lengths between consecutive scenes (must match Reel.tsx). */
export const TRANSITIONS = [12, 14, 14, 14, 14, 12, 14];

export const TOTAL_FRAMES =
  SCRIPT.reduce((sum, s) => sum + TIMING[s.id].duration, 0) -
  TRANSITIONS.reduce((a, b) => a + b, 0);
