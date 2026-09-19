import type { BrandProfile } from '@prisma/client';
import type { AgentContext } from './context';
import {
  scriptSchema,
  storyboardSchema,
  strategySchema,
  type QcVision,
  type Script,
  type ShotSpec,
  type Storyboard,
  type Strategy,
} from './schemas';

/**
 * Local agent driver.
 *
 * Deterministic, offline stand-ins for the LLM agents. They honour the exact
 * same output contracts, so the pipeline, the database and the dashboard see
 * nothing different — only the text is composed by rules instead of a model.
 * This is what lets the whole product be exercised before any API is wired up.
 *
 * These are explicitly NOT a substitute for the real agents: they cannot
 * invent a strategy. They restate the brief in the right shape.
 */

/** Small, stable hash so the same brief always yields the same choices. */
function seedOf(input: string): number {
  let hash = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return Math.abs(hash);
}

function pick<T>(items: readonly T[], seed: number, offset = 0): T {
  return items[(seed + offset) % items.length];
}

function sentences(text: string): string[] {
  return text
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function firstSentence(text: string): string {
  return sentences(text)[0] ?? text.trim();
}

/** The brief may name the audience; otherwise the brand's primary one wins. */
export function resolveAudience(brief: string, brand: BrandProfile, override?: string | null): string {
  if (override?.trim()) return override.trim();

  const lower = brief.toLowerCase();
  const secondary = brand.secondaryAudience;

  const mentions = (audience: string | null): boolean => {
    if (!audience) return false;
    const tokens = audience
      .toLowerCase()
      .split(/[^a-zàèéìòù0-9]+/)
      .filter((t) => t.length > 3);
    return tokens.some((token) => lower.includes(token));
  };

  // The two audiences are never merged: the brief picks one, else the primary.
  if (mentions(secondary) && !mentions(brand.primaryAudience)) return secondary as string;
  return brand.primaryAudience;
}

/** A CTA written in the brief ("scrivi DIAFRAMMA") beats the brand default. */
export function resolveCta(brief: string, brand: BrandProfile, override?: string | null): string {
  if (override?.trim()) return override.trim();

  const keyword = brief.match(/\b(?:scrivi|commenta|manda|scrivimi)\s+["“]?([A-ZÀ-Ù][A-ZÀ-Ù0-9]{3,})\b/);
  if (keyword) return `Scrivi ${keyword[1]} in DM`;

  return brand.ctaOptions[0] ?? 'Scrivimi in DM';
}

/** "un Reel di 20 secondi" → 20. Falls back to the workflow's duration. */
export function resolveDuration(brief: string, fallbackSec: number): number {
  const match = brief.match(/(\d{1,3})\s*(?:secondi|second[oi]|s\b|sec\b)/i);
  if (!match) return fallbackSec;
  const parsed = Number(match[1]);
  return parsed >= 5 && parsed <= 90 ? parsed : fallbackSec;
}

/** The topic is the brief's subject clause, trimmed to something titleable. */
export function resolveTopic(brief: string): string {
  const about = brief.match(/\b(?:sul|sulla|sui|sulle|su|riguardo a|about)\s+(.{10,120}?)(?:[.,;]|$)/i);
  const raw = about ? about[1] : firstSentence(brief);
  const cleaned = raw.replace(/\s+/g, ' ').trim();
  return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
}

const ANGLES = [
  'Smontare la scorciatoia che tutti consigliano',
  'Il costo nascosto di un metodo popolare',
  'Perché il risultato non arriva nonostante la costanza',
  'La variabile che nessuno misura',
] as const;

const RETENTION = [
  'Apri con la contraddizione, sposta la promessa a metà, chiudi con la CTA sul picco di curiosità',
  'Domanda diretta nei primi 1,5 secondi, poi una prova concreta ogni 5 secondi',
  'Tensione iniziale, spiegazione in tre passaggi brevi, risoluzione e CTA',
] as const;

export interface LocalAgentResult<T> {
  data: T;
  model: string;
  costUsd: number;
}

const MODEL_NAME = 'local-deterministic-agent';

export function localStrategy(context: AgentContext): LocalAgentResult<Strategy> {
  const { workflow, brand, priorContent } = context;
  const seed = seedOf(workflow.brief);

  const topic = resolveTopic(workflow.brief);
  const audience = resolveAudience(workflow.brief, brand, workflow.targetOverride);
  const cta = resolveCta(workflow.brief, brand, workflow.ctaOverride);

  // Content memory: if this topic was covered, shift to a different angle.
  const seen = priorContent.some(
    (item) => item.topic.toLowerCase().slice(0, 24) === topic.toLowerCase().slice(0, 24),
  );
  const angle = pick(ANGLES, seed, seen ? 1 : 0);

  const strategy = {
    topic,
    audience,
    objective: workflow.goal?.trim() || 'Generare contatti qualificati in DM',
    core_problem: `Pubblico di riferimento: ${audience}. Il tempo investito va in un metodo che non sposta la composizione corporea.`,
    angle,
    hook: `${topic}: la parte che nessuno ti dice.`,
    promise: 'In venti secondi capisci cosa cambiare, senza slogan e senza estremismi.',
    cta,
    retention_strategy: pick(RETENTION, seed),
  };

  return { data: strategySchema.parse(strategy), model: MODEL_NAME, costUsd: 0 };
}

const SCENE_PLAN = [
  { share: 0.15, role: 'hook' },
  { share: 0.3, role: 'problem' },
  { share: 0.35, role: 'insight' },
  { share: 0.2, role: 'cta' },
] as const;

export function localScript(context: AgentContext, strategy: Strategy): LocalAgentResult<Script> {
  const target = resolveDuration(context.workflow.brief, context.workflow.durationSec);

  const durations = SCENE_PLAN.map((plan) => Math.max(2, Math.round(target * plan.share)));
  // Absorb the rounding drift into the longest scene so the total matches.
  const drift = target - durations.reduce((sum, d) => sum + d, 0);
  const longest = durations.indexOf(Math.max(...durations));
  durations[longest] += drift;

  const lines: Record<(typeof SCENE_PLAN)[number]['role'], { vo: string; visual: string; text: string }> = {
    hook: {
      vo: strategy.hook,
      visual: `Primo piano del soggetto che si ferma a metà gesto, luce naturale morbida, ambiente palestra sobrio`,
      text: 'Fermati un attimo',
    },
    problem: {
      vo: `${strategy.core_problem} Il tempo c'è, il metodo no.`,
      visual: 'Campo medio: il soggetto ripete lo stesso allenamento, sguardo verso il cronometro',
      text: 'Non è la costanza',
    },
    insight: {
      vo: `${strategy.angle}. ${strategy.promise}`,
      visual: 'Dettaglio tecnico del gesto corretto, camera lenta in avvicinamento, luce laterale',
      text: 'La variabile vera',
    },
    cta: {
      vo: strategy.cta,
      visual: 'Il soggetto guarda in camera, ambiente pulito, sfondo sfocato',
      text: strategy.cta,
    },
  };

  const scenes = SCENE_PLAN.map((plan, index) => ({
    scene: index + 1,
    duration: durations[index],
    voiceover: lines[plan.role].vo,
    visual: lines[plan.role].visual,
    on_screen_text: lines[plan.role].text,
  }));

  const script = {
    duration_seconds: target,
    voiceover: scenes.map((s) => s.voiceover).join(' '),
    scenes,
  };

  return { data: scriptSchema.parse(script), model: MODEL_NAME, costUsd: 0 };
}

const CAMERA = ['close-up', 'medium shot', 'medium close-up', 'wide shot'] as const;
const LENS = ['35mm', '50mm', '85mm'] as const;
const MOVEMENT = ['slow dolly in', 'subtle handheld drift', 'static on sticks', 'slow lateral track'] as const;

export function localStoryboard(
  context: AgentContext,
  strategy: Strategy,
  script: Script,
): LocalAgentResult<Storyboard> {
  const { workflow, brand } = context;
  const seed = seedOf(workflow.brief);

  // One consistent subject description repeated in every prompt: this is what
  // keeps the shots reading as one person in one place.
  const subject =
    strategy.audience.toLowerCase().includes('uom')
      ? 'a fit man in his early thirties, short dark hair, plain charcoal training top'
      : 'a fit woman in her early forties, dark hair tied back, plain charcoal training top';

  const shots: ShotSpec[] = script.scenes.map((scene, index) => ({
    scene_id: `scene-${scene.scene}`,
    duration: scene.duration,
    visual_goal: scene.visual,
    prompt:
      `${subject}, ${scene.visual.toLowerCase()}, ${brand.visualStyle.toLowerCase()}, ` +
      `shot on ${pick(LENS, seed, index)} with a ${pick(MOVEMENT, seed, index)}, ` +
      'soft natural window light, muted warm palette, shallow depth of field, ' +
      'photorealistic, cinematic grade, no on-screen text',
    camera: pick(CAMERA, seed, index),
    lens: pick(LENS, seed, index),
    movement: pick(MOVEMENT, seed, index),
    lighting: 'soft natural window light, gentle falloff',
    environment: 'premium minimal training space, uncluttered background',
    style: brand.visualStyle,
    negative_prompt:
      'text, watermark, logo, subtitles, captions, distorted hands, extra limbs, ' +
      `warped face, plastic skin, ${brand.forbiddenStyles.join(', ')}`,
    aspect_ratio: workflow.aspectRatio,
    references: workflow.referenceMedia,
  }));

  const hashtags = [
    ...new Set(
      [...brand.keywords.slice(0, 4), 'ricomposizione corporea'].map(
        (keyword) => `#${keyword.toLowerCase().replace(/[^a-z0-9àèéìòù]+/g, '')}`,
      ),
    ),
  ].join(' ');

  const caption = [
    strategy.hook,
    '',
    strategy.core_problem,
    strategy.promise,
    '',
    strategy.cta,
    '',
    hashtags,
  ].join('\n');

  return {
    data: storyboardSchema.parse({ shots, caption }),
    model: MODEL_NAME,
    costUsd: 0,
  };
}

/**
 * Simulated visual review. It cannot see anything — there is no footage to see
 * in local mode — so it reports a plausible pass and says so in its notes. The
 * deterministic file checks still run on top of this in the QC layer.
 */
export function localQcVision(shot: ShotSpec): LocalAgentResult<QcVision> {
  const seed = seedOf(shot.prompt + shot.scene_id);
  // A stable minority of shots fail, so the regeneration path is exercised.
  const score = 0.78 + ((seed % 20) / 100);

  return {
    data: {
      score: Number(score.toFixed(3)),
      issues: [],
      subject_consistent: true,
      brand_style_match: true,
      safe: true,
      notes:
        'Simulated review: the local QC driver does not inspect real frames. ' +
        'Set QC_DRIVER=ffmpeg with a vision model for an actual visual verdict.',
    },
    model: MODEL_NAME,
    costUsd: 0,
  };
}
