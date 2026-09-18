import OpenAI from 'openai';
import { z } from 'zod';
import { env } from '../env';
import { OrchestratorError } from '../errors';

let client: OpenAI | null = null;

export function openai(): OpenAI {
  const { OPENAI_API_KEY } = env();
  if (!OPENAI_API_KEY) {
    throw new OrchestratorError(
      'AUTH_FAILED',
      'OPENAI_API_KEY is not set — the agent pipeline cannot run without it.',
    );
  }
  if (!client) client = new OpenAI({ apiKey: OPENAI_API_KEY });
  return client;
}

export function resetOpenAiClient(): void {
  client = null;
}

/** Rough USD cost per agent call, recorded as a CostEvent (spec §21). */
const COST_PER_1K_INPUT = 0.002;
const COST_PER_1K_OUTPUT = 0.008;

export function estimateLlmCost(promptTokens: number, completionTokens: number): number {
  return (promptTokens / 1000) * COST_PER_1K_INPUT + (completionTokens / 1000) * COST_PER_1K_OUTPUT;
}

export interface JsonCompletion<T> {
  data: T;
  model: string;
  costUsd: number;
  raw: string;
}

export interface ImagePart {
  /** Base64-encoded frame bytes. */
  base64: string;
  mimeType: string;
}

export interface JsonCompletionArgs<T> {
  system: string;
  user: string;
  schema: z.ZodType<T, z.ZodTypeDef, unknown>;
  model?: string;
  images?: ImagePart[];
  temperature?: number;
}

/**
 * One JSON-mode call, validated against a Zod schema. A single retry is issued
 * when the model returns JSON that fails validation, with the validation error
 * fed back — this is a correctness retry, not a blind one.
 */
export async function completeJson<T>({
  system,
  user,
  schema,
  model,
  images,
  temperature = 0.7,
}: JsonCompletionArgs<T>): Promise<JsonCompletion<T>> {
  const e = env();
  const chosenModel = model ?? (images?.length ? e.OPENAI_VISION_MODEL : e.OPENAI_TEXT_MODEL);

  const content: OpenAI.Chat.Completions.ChatCompletionContentPart[] = [{ type: 'text', text: user }];
  for (const image of images ?? []) {
    content.push({
      type: 'image_url',
      image_url: { url: `data:${image.mimeType};base64,${image.base64}` },
    });
  }

  const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
    { role: 'system', content: system },
    { role: 'user', content },
  ];

  let cost = 0;
  let lastError = '';

  for (let attempt = 1; attempt <= 2; attempt += 1) {
    const completion = await openai().chat.completions.create({
      model: chosenModel,
      temperature,
      response_format: { type: 'json_object' },
      messages,
    });

    cost += estimateLlmCost(
      completion.usage?.prompt_tokens ?? 0,
      completion.usage?.completion_tokens ?? 0,
    );

    const raw = completion.choices[0]?.message?.content ?? '';
    let parsedJson: unknown;
    try {
      parsedJson = JSON.parse(raw);
    } catch {
      lastError = 'Response was not valid JSON.';
      messages.push({ role: 'assistant', content: raw });
      messages.push({ role: 'user', content: `${lastError} Return a single valid JSON object.` });
      continue;
    }

    const result = schema.safeParse(parsedJson);
    if (result.success) {
      return { data: result.data, model: chosenModel, costUsd: cost, raw };
    }

    lastError = result.error.issues
      .map((issue) => `${issue.path.join('.') || '(root)'}: ${issue.message}`)
      .join('; ');
    messages.push({ role: 'assistant', content: raw });
    messages.push({
      role: 'user',
      content: `The JSON did not satisfy the schema. Fix these problems and return the corrected JSON object only: ${lastError}`,
    });
  }

  throw new OrchestratorError(
    'GENERATION_FAILED',
    `Agent output failed schema validation after a retry: ${lastError}`,
  );
}
