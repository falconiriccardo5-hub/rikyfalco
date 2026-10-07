import { buildTiming } from "../reel/timing";
import { SCRIPT } from "./script";
import VOICE from "./voice.json";

export const TIMING2 = buildTiming(SCRIPT, VOICE as Parameters<typeof buildTiming>[1]);

/** Transition lengths between consecutive scenes (must match Reel2.tsx). */
export const TRANSITIONS2 = [10, 14, 12, 14, 14, 12, 14];

export const TOTAL_FRAMES2 =
  SCRIPT.reduce((sum, s) => sum + TIMING2[s.id].duration, 0) - TRANSITIONS2.reduce((a, b) => a + b, 0);
