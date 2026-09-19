import { AgentKind } from '@prisma/client';

/**
 * The agent registry: one declarative entry per agent in the pipeline.
 *
 * The dashboard renders this rather than a hand-written page, so the Agents
 * section cannot drift from the pipeline. Adding an agent means adding an entry
 * here and a stage in the orchestrator — nothing else to keep in sync.
 */
export interface AgentDefinition {
  kind: AgentKind;
  order: number;
  name: string;
  role: string;
  /** What it is responsible for, in one sentence. */
  responsibility: string;
  inputs: string[];
  outputKeys: string[];
  /** Rules the agent must respect, surfaced for review. */
  guardrails: string[];
  /** Which driver decides how this agent runs. */
  driver: 'agents' | 'router' | 'qc';
  deterministic: boolean;
}

export const AGENT_REGISTRY: AgentDefinition[] = [
  {
    kind: AgentKind.STRATEGIST,
    order: 1,
    name: 'Content Strategist',
    role: 'Turns a raw brief into a positioned content angle.',
    responsibility:
      'Reads the brief, the brand profile and previous content, then fixes topic, audience, angle, hook, promise and CTA.',
    inputs: ['brief', 'brand profile', 'previous content', 'goal'],
    outputKeys: [
      'topic',
      'audience',
      'objective',
      'core_problem',
      'angle',
      'hook',
      'promise',
      'cta',
      'retention_strategy',
    ],
    guardrails: [
      'Picks ONE audience — primary or secondary — and never merges the two.',
      'Defaults to the primary audience when the brief does not point at either.',
      'Avoids a topic or hook already used in recent content.',
      'No medical claims, no shaming, no extremist framing.',
    ],
    driver: 'agents',
    deterministic: false,
  },
  {
    kind: AgentKind.SCRIPTWRITER,
    order: 2,
    name: 'Scriptwriter',
    role: 'Turns the angle into a timed, speakable script.',
    responsibility:
      'Breaks the Reel into scenes with durations, voiceover and on-screen text that fit the requested length.',
    inputs: ['strategy', 'duration', 'CTA', 'brand tone'],
    outputKeys: ['duration_seconds', 'voiceover', 'scenes[]'],
    guardrails: [
      'Scene durations sum to the requested duration (±1s).',
      'Scene 1 is the hook and lasts at most 3 seconds.',
      'The CTA appears verbatim in the final scene.',
      'Voiceover must be sayable inside its scene (~2.4 words/second).',
    ],
    driver: 'agents',
    deterministic: false,
  },
  {
    kind: AgentKind.DIRECTOR,
    order: 3,
    name: 'Creative Director',
    role: 'Turns the script into production-ready shots and the caption.',
    responsibility:
      'Writes one generation-ready prompt per scene, with camera, lens, movement, lighting and negative prompt, plus the Instagram caption.',
    inputs: ['strategy', 'script', 'brand visual style', 'available models'],
    outputKeys: ['shots[]', 'caption'],
    guardrails: [
      'Repeats one consistent subject description across every shot.',
      'Never asks the model for legible on-screen text; text is composited later.',
      'Forces the workflow aspect ratio on every shot.',
      'Respects the brand forbidden styles in every negative prompt.',
    ],
    driver: 'agents',
    deterministic: false,
  },
  {
    kind: AgentKind.MODEL_ROUTER,
    order: 4,
    name: 'Model Router',
    role: 'Chooses the rendering model and stages for each shot.',
    responsibility:
      'Filters the model catalog by capability, aspect ratio, duration, audio need and per-shot budget, then prices the run.',
    inputs: ['shot spec', 'aspect ratio', 'per-shot budget', 'seed image', 'model catalog'],
    outputKeys: ['model', 'reason', 'estimated_cost', 'parameters', 'stages[]'],
    guardrails: [
      'No hardcoded model IDs: candidates come from the catalog.',
      'Only endpoints verified against the official SDK are selectable.',
      'Keyframe and animation stages are chosen jointly, so a tight budget yields a cheaper pair rather than a failure.',
      'Refuses to route rather than exceed the budget.',
    ],
    driver: 'router',
    deterministic: true,
  },
  {
    kind: AgentKind.QUALITY_CONTROL,
    order: 5,
    name: 'Quality Control',
    role: 'Reviews each rendered shot and decides whether it ships.',
    responsibility:
      'Measures the file, samples frames, has a vision model review them, and merges both into one verdict.',
    inputs: ['rendered shot', 'shot spec', 'brand profile', 'expected duration and ratio'],
    outputKeys: ['approved', 'score', 'issues[]', 'regeneration_required'],
    guardrails: [
      'Duration, resolution and aspect ratio are measured from the file, never estimated by a model.',
      'A measured failure overrides the visual score.',
      'A high-severity issue blocks the shot whatever the score.',
      'A rejection regenerates that shot only, never the whole Reel.',
    ],
    driver: 'qc',
    deterministic: false,
  },
];

export function agentDefinition(kind: AgentKind): AgentDefinition | undefined {
  return AGENT_REGISTRY.find((agent) => agent.kind === kind);
}
