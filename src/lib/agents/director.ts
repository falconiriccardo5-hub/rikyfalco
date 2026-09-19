import { completeJson } from '../llm/openai';
import { drivers } from '../drivers';
import { localStoryboard } from './local';
import { selectableModels } from '../higgsfield/catalog';
import { type AgentContext, renderBrand } from './context';
import { storyboardSchema, type Script, type Storyboard, type Strategy } from './schemas';

const SYSTEM = `You are the CREATIVE DIRECTOR. You turn a script into production-ready shots for an
AI video generator, plus the Instagram caption.

Rules:
- One shot per scene, in scene order. Keep the scene's duration.
- "prompt" is a single dense paragraph optimised for a diffusion video model: subject, wardrobe,
  action, environment, light quality, lens character, camera move, mood. No dialogue, no text
  overlays, no brand names, no camera jargon the model cannot render.
- Never ask for legible on-screen text inside the generated footage: text is composited later.
  Put "text, watermark, logo, subtitles, captions" in every negative_prompt.
- Hold subject consistency across shots: repeat the same physical description of the subject in
  every prompt so the shots read as one person in one place.
- Respect the brand's visual style and forbidden styles.
- aspect_ratio must match the requested ratio for every shot.
- The caption is for Instagram: a strong first line, 2-4 short lines of value, the CTA, then 3-6
  relevant hashtags. Match the script's language.

Return a single JSON object: { shots: [ { scene_id, duration, visual_goal, prompt, camera, lens,
movement, lighting, environment, style, negative_prompt, aspect_ratio, references } ], caption }.`;

export interface DirectorResult {
  storyboard: Storyboard;
  costUsd: number;
  model: string;
}

export async function runDirector(
  context: AgentContext,
  strategy: Strategy,
  script: Script,
): Promise<DirectorResult> {
  if (drivers().agents === 'local') {
    const { data, model, costUsd } = localStoryboard(context, strategy, script);
    return { storyboard: data, model, costUsd };
  }

  const capabilities = selectableModels()
    .map((m) => `- ${m.id} (${m.capability}, ${m.qualityTier}, up to ${m.durationsSec.at(-1) ?? 'n/a'}s)`)
    .join('\n');

  const user = [
    '### BRAND PROFILE',
    renderBrand(context.brand),
    '',
    '### STRATEGY',
    JSON.stringify(strategy, null, 2),
    '',
    '### SCRIPT',
    JSON.stringify(script, null, 2),
    '',
    '### TARGET RENDERING MODELS (write prompts these can execute)',
    capabilities,
    '',
    '### CONSTRAINTS',
    `Aspect ratio: ${context.workflow.aspectRatio}`,
    `CTA: ${context.workflow.ctaOverride ?? strategy.cta}`,
    context.workflow.referenceMedia.length
      ? `Reference media (use as "references"): ${context.workflow.referenceMedia.join(', ')}`
      : 'No reference media supplied.',
  ].join('\n');

  const { data, costUsd, model } = await completeJson({
    system: SYSTEM,
    user,
    schema: storyboardSchema,
    temperature: 0.6,
  });

  // The aspect ratio is a hard product constraint, not a creative choice.
  const shots = data.shots.map((shot) => ({
    ...shot,
    aspect_ratio: context.workflow.aspectRatio,
  }));

  return { storyboard: { ...data, shots }, costUsd, model };
}
