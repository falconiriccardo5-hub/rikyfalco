import {
  findModel,
  modelsByCapability,
  selectableModels,
  type ModelEntry,
} from '../higgsfield/catalog';
import { OrchestratorError } from '../errors';
import type { ShotSpec } from './schemas';

export type QualityTier = ModelEntry['qualityTier'];

export interface RoutingRequest {
  shot: ShotSpec;
  aspectRatio: string;
  /** Remaining budget for this shot, in USD. */
  budgetPerShotUsd: number;
  needsAudio?: boolean;
  /** A still to animate: makes image-to-video routing possible without a text2image stage. */
  seedImageUrl?: string;
  preferQuality?: QualityTier;
}

export interface RenderStage {
  stage: 'image' | 'video';
  modelId: string;
  endpoint: string;
  estimatedCostUsd: number;
}

export interface RoutingDecision {
  model: string;
  reason: string;
  estimated_cost: string;
  estimatedCostUsd: number;
  parameters: Record<string, unknown>;
  /** Ordered pipeline: text-to-image then image-to-video, or a single stage. */
  stages: RenderStage[];
}

const TIER_RANK: Record<QualityTier, number> = { draft: 0, standard: 1, high: 2, premium: 3 };

function supportsRatio(model: ModelEntry, ratio: string): boolean {
  return model.aspectRatios.length === 0 || model.aspectRatios.includes(ratio);
}

function coversDuration(model: ModelEntry, seconds: number): boolean {
  if (!model.durationsSec.length) return true;
  return Math.max(...model.durationsSec) >= Math.min(seconds, Math.max(...model.durationsSec));
}

/** Shots longer than the model's clip length are rendered as N chained clips. */
export function clipsNeeded(model: ModelEntry, seconds: number): number {
  if (!model.durationsSec.length) return 1;
  const longest = Math.max(...model.durationsSec);
  return Math.max(1, Math.ceil(seconds / longest));
}

function pickBest(
  candidates: ModelEntry[],
  request: RoutingRequest,
  budgetUsd: number,
): ModelEntry | null {
  const viable = candidates
    .filter((m) => supportsRatio(m, request.aspectRatio))
    .filter((m) => coversDuration(m, request.shot.duration))
    .filter((m) => !request.needsAudio || m.supportsAudio)
    .map((m) => ({ model: m, cost: m.estimatedCostUsd * clipsNeeded(m, request.shot.duration) }))
    .filter((c) => c.cost <= budgetUsd)
    .sort((a, b) => {
      const preferred = request.preferQuality;
      if (preferred) {
        const da = Math.abs(TIER_RANK[a.model.qualityTier] - TIER_RANK[preferred]);
        const db = Math.abs(TIER_RANK[b.model.qualityTier] - TIER_RANK[preferred]);
        if (da !== db) return da - db;
      }
      // Otherwise: highest quality that still fits, cheapest as the tie-break.
      const tier = TIER_RANK[b.model.qualityTier] - TIER_RANK[a.model.qualityTier];
      if (tier !== 0) return tier;
      return a.cost - b.cost;
    });

  return viable[0]?.model ?? null;
}

/**
 * Deterministic routing over the catalog (spec §6). No model ID is hardcoded:
 * candidates come from the catalog, filtered by capability, ratio, duration,
 * audio need and the per-shot budget.
 *
 * Because the catalog carries no *verified* text-to-video endpoint, a shot with
 * no seed image routes as text-to-image -> image-to-video. If an operator adds a
 * verified text-to-video model, that single-stage path wins automatically.
 */
export function routeShot(request: RoutingRequest): RoutingDecision {
  const budget = request.budgetPerShotUsd;

  if (request.needsAudio) {
    const audioModel = pickBest(modelsByCapability('audio-video'), request, budget);
    if (audioModel) {
      return single(audioModel, request, 'Shot requires synchronised audio.');
    }
  }

  if (!request.seedImageUrl) {
    const t2v = pickBest(
      selectableModels().filter((m) => m.capability === 'text-to-video'),
      request,
      budget,
    );
    if (t2v) {
      return single(
        t2v,
        request,
        'A verified text-to-video model covers this shot in a single stage.',
      );
    }
  }

  // Two-stage path: still frame, then animate it.
  //
  // The two stages are chosen jointly, not greedily: the cheapest viable
  // keyframe is reserved out of the budget before the animation model is
  // picked. Choosing the best animation first can eat the whole budget and
  // leave nothing for the frame it needs, failing a shot that a cheaper
  // pairing would have covered.
  const keyframeReserve = request.seedImageUrl
    ? 0
    : Math.min(
        ...modelsByCapability('text-to-image')
          .filter((m) => selectableModels().includes(m))
          .filter((m) => m.sizeByAspectRatio?.[request.aspectRatio])
          .map((m) => m.estimatedCostUsd),
        Number.POSITIVE_INFINITY,
      );

  const i2v = pickBest(
    modelsByCapability('image-to-video').filter((m) => selectableModels().includes(m)),
    request,
    Number.isFinite(keyframeReserve) ? budget - keyframeReserve : budget,
  );
  if (!i2v) {
    throw new OrchestratorError(
      'BUDGET_EXCEEDED',
      `No image-to-video model fits ${request.aspectRatio} / ${request.shot.duration}s within $${budget.toFixed(2)} per shot.`,
    );
  }

  const clips = clipsNeeded(i2v, request.shot.duration);
  const videoCost = i2v.estimatedCostUsd * clips;

  if (request.seedImageUrl) {
    return {
      model: i2v.id,
      reason: `A reference still was supplied, so the shot animates directly with ${i2v.label}${clips > 1 ? ` across ${clips} chained clips` : ''}.`,
      estimated_cost: `$${videoCost.toFixed(4)}`,
      estimatedCostUsd: videoCost,
      parameters: { ...i2v.defaults, clips },
      stages: [
        { stage: 'video', modelId: i2v.id, endpoint: i2v.endpoint, estimatedCostUsd: videoCost },
      ],
    };
  }

  const t2iBudget = Math.max(0, budget - videoCost);
  const t2i = pickBest(modelsByCapability('text-to-image'), request, t2iBudget);
  if (!t2i) {
    throw new OrchestratorError(
      'BUDGET_EXCEEDED',
      `No text-to-image model fits within the $${t2iBudget.toFixed(2)} left for the keyframe stage.`,
    );
  }

  const total = t2i.estimatedCostUsd + videoCost;
  return {
    model: `${t2i.id}+${i2v.id}`,
    reason: `No verified text-to-video endpoint covers this shot, so the keyframe is rendered with ${t2i.label} and animated with ${i2v.label}${clips > 1 ? ` across ${clips} chained clips` : ''}. Chosen for ${request.aspectRatio} at ${request.shot.duration}s within the per-shot budget.`,
    estimated_cost: `$${total.toFixed(4)}`,
    estimatedCostUsd: total,
    parameters: { image: t2i.defaults, video: { ...i2v.defaults, clips } },
    stages: [
      {
        stage: 'image',
        modelId: t2i.id,
        endpoint: t2i.endpoint,
        estimatedCostUsd: t2i.estimatedCostUsd,
      },
      { stage: 'video', modelId: i2v.id, endpoint: i2v.endpoint, estimatedCostUsd: videoCost },
    ],
  };
}

function single(model: ModelEntry, request: RoutingRequest, reason: string): RoutingDecision {
  const clips = clipsNeeded(model, request.shot.duration);
  const cost = model.estimatedCostUsd * clips;
  return {
    model: model.id,
    reason,
    estimated_cost: `$${cost.toFixed(4)}`,
    estimatedCostUsd: cost,
    parameters: { ...model.defaults, clips },
    stages: [{ stage: 'video', modelId: model.id, endpoint: model.endpoint, estimatedCostUsd: cost }],
  };
}

/** Build the provider payload for one stage, from the shot and the chosen model. */
export function buildStageInput(
  stage: RenderStage,
  shot: ShotSpec,
  seedImageUrl?: string,
): Record<string, unknown> {
  const model = findModel(stage.modelId);
  if (!model) {
    throw new OrchestratorError('GENERATION_FAILED', `Unknown model in routing: ${stage.modelId}`);
  }

  if (model.capability === 'text-to-image') {
    const size = model.sizeByAspectRatio?.[shot.aspect_ratio];
    if (!size) {
      throw new OrchestratorError(
        'GENERATION_FAILED',
        `Model ${model.id} has no frame size mapped for ${shot.aspect_ratio}.`,
      );
    }
    return {
      prompt: shot.prompt,
      width_and_height: size,
      quality: (model.defaults.quality as string) ?? '1080p',
      batch_size: (model.defaults.batch_size as number) ?? 1,
      enhance_prompt: true,
      ...(shot.references[0]
        ? { image_reference: { type: 'image_url', image_url: shot.references[0] } }
        : {}),
    };
  }

  if (model.capability === 'image-to-video' || model.capability === 'motion-transfer') {
    const image = seedImageUrl ?? shot.references[0];
    if (!image) {
      throw new OrchestratorError(
        'GENERATION_FAILED',
        `Model ${model.id} needs an input image but none was produced for scene ${shot.scene_id}.`,
      );
    }
    return {
      model: (model.defaults.model as string) ?? model.id,
      prompt: shot.prompt,
      input_images: [{ type: 'image_url', image_url: image }],
      enhance_prompt: (model.defaults.enhance_prompt as boolean) ?? true,
    };
  }

  // Remaining capabilities are driven entirely by catalog defaults + prompt.
  return { ...model.defaults, prompt: shot.prompt };
}
