import { completeJson } from '../llm/openai';
import { type AgentContext, renderBrand } from './context';
import { scriptSchema, type Script, type Strategy } from './schemas';

const SYSTEM = `You are the SCRIPTWRITER for short-form vertical video (Instagram Reels).

Rules:
- Total scene durations must sum to the requested duration (±1 second).
- Scene 1 is the hook and must be at most 3 seconds.
- The final scene carries the CTA verbatim.
- Voiceover is spoken Italian unless the brief is written in another language; match the brief's language.
- Roughly 2.4 spoken words per second — do not write voiceover that cannot be said in the scene's duration.
- "visual" describes what is on screen, in concrete, filmable terms (subject, action, setting).
- "on_screen_text" is short (max 6 words) and may be an empty string.
- Educational and premium in tone. No medical claims, no shaming, no extremism.

Return a single JSON object: { duration_seconds, voiceover, scenes: [{ scene, duration, voiceover,
visual, on_screen_text }] }. "voiceover" at the top level is the full script read end to end.`;

export interface ScriptwriterResult {
  script: Script;
  costUsd: number;
  model: string;
}

export async function runScriptwriter(
  context: AgentContext,
  strategy: Strategy,
): Promise<ScriptwriterResult> {
  const user = [
    '### BRAND PROFILE',
    renderBrand(context.brand),
    '',
    '### STRATEGY',
    JSON.stringify(strategy, null, 2),
    '',
    '### CONSTRAINTS',
    `Total duration: ${context.workflow.durationSec} seconds`,
    `Aspect ratio: ${context.workflow.aspectRatio}`,
    `CTA (must appear in the last scene): ${context.workflow.ctaOverride ?? strategy.cta}`,
    '',
    '### ORIGINAL BRIEF',
    context.workflow.brief,
  ].join('\n');

  const { data, costUsd, model } = await completeJson({
    system: SYSTEM,
    user,
    schema: scriptSchema,
    temperature: 0.7,
  });

  return { script: data, costUsd, model };
}

/** Scene durations drift; the storyboard needs a script that actually fits. */
export function scriptDurationDrift(script: Script, targetSec: number): number {
  const total = script.scenes.reduce((sum, scene) => sum + scene.duration, 0);
  return Math.abs(total - targetSec);
}
