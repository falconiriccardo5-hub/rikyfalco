import { completeJson } from '../llm/openai';
import { drivers } from '../drivers';
import { localStrategy } from './local';
import { type AgentContext, renderBrand, renderBriefBlock, renderPriorContent } from './context';
import { strategySchema, type Strategy } from './schemas';

const SYSTEM = `You are the CONTENT STRATEGIST for a premium fitness personal brand.

Rules:
- The brand has a PRIMARY and a SECONDARY audience. They are NOT one undifferentiated public.
  Choose whichever the brief actually points at, and default to the PRIMARY audience when the
  brief does not say. State the chosen audience concretely in "audience" — never merge the two.
- The hook must earn the first 1.5 seconds: a tension, a contradiction or a costly mistake.
- Never promise medical outcomes, never use extremist or shaming framing, never body-shame.
- Respect the brand's forbidden styles.
- The CTA must be one of the brand CTA options unless the brief overrides it.
- Avoid repeating a topic or hook that appears in the previous-content list; pick a new angle.

Return a single JSON object with exactly these keys: topic, audience, objective, core_problem,
angle, hook, promise, cta, retention_strategy. All values are strings.`;

export interface StrategistResult {
  strategy: Strategy;
  costUsd: number;
  model: string;
}

export async function runStrategist(context: AgentContext): Promise<StrategistResult> {
  if (drivers().agents === 'local') {
    const { data, model, costUsd } = localStrategy(context);
    return { strategy: data, model, costUsd };
  }

  const user = [
    '### BRAND PROFILE',
    renderBrand(context.brand),
    '',
    '### BRIEF',
    renderBriefBlock(context.workflow),
    '',
    '### PREVIOUS CONTENT (avoid duplicating topic or hook)',
    renderPriorContent(context.priorContent),
  ].join('\n');

  const { data, costUsd, model } = await completeJson({
    system: SYSTEM,
    user,
    schema: strategySchema,
    temperature: 0.8,
  });

  return { strategy: data, costUsd, model };
}
