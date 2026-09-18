import { beforeEach, describe, expect, it } from 'vitest';
import { buildStageInput, clipsNeeded, routeShot } from '@/lib/agents/modelRouter';
import { findModel, resetCatalogCache, selectableModels } from '@/lib/higgsfield/catalog';
import { OrchestratorError } from '@/lib/errors';
import type { ShotSpec } from '@/lib/agents/schemas';

const shot: ShotSpec = {
  scene_id: 'scene-1',
  duration: 5,
  visual_goal: 'Open on the subject mid-stride',
  prompt: 'A woman in her forties walking through a sunlit gym corridor, cinematic',
  camera: 'medium',
  lens: '50mm',
  movement: 'slow dolly in',
  lighting: 'soft natural',
  environment: 'gym corridor',
  style: 'cinematic premium',
  negative_prompt: 'text, watermark, logo',
  aspect_ratio: '9:16',
  references: [],
};

beforeEach(() => {
  resetCatalogCache();
  delete process.env.HF_CATALOG_PATH;
  delete process.env.HF_ALLOW_UNVERIFIED_MODELS;
});

describe('catalog', () => {
  it('only offers endpoints verified against the official SDK', () => {
    expect(selectableModels().length).toBeGreaterThan(0);
    expect(selectableModels().every((m) => m.verified)).toBe(true);
  });
});

describe('routeShot', () => {
  it('routes text-only shots through a keyframe then an animation stage', () => {
    const decision = routeShot({ shot, aspectRatio: '9:16', budgetPerShotUsd: 2 });

    expect(decision.stages.map((s) => s.stage)).toEqual(['image', 'video']);
    expect(decision.stages[0].endpoint).toBe('/v1/text2image/soul');
    expect(decision.stages[1].endpoint).toBe('/v1/image2video/dop');
    expect(decision.estimatedCostUsd).toBeGreaterThan(0);
    expect(decision.reason).toMatch(/text-to-video/i);
  });

  it('skips the keyframe stage when a seed image is supplied', () => {
    const decision = routeShot({
      shot,
      aspectRatio: '9:16',
      budgetPerShotUsd: 2,
      seedImageUrl: 'https://example.com/frame.jpg',
    });

    expect(decision.stages).toHaveLength(1);
    expect(decision.stages[0].stage).toBe('video');
  });

  it('picks a cheaper model when the budget is tight rather than overspending', () => {
    const generous = routeShot({ shot, aspectRatio: '9:16', budgetPerShotUsd: 2 });
    const tight = routeShot({ shot, aspectRatio: '9:16', budgetPerShotUsd: 0.2 });

    expect(tight.estimatedCostUsd).toBeLessThan(generous.estimatedCostUsd);
    expect(tight.estimatedCostUsd).toBeLessThanOrEqual(0.2);
    // Both stages must still be affordable together, not just the video one.
    expect(tight.stages.map((s) => s.stage)).toEqual(['image', 'video']);
  });

  it('refuses to route when nothing fits the budget', () => {
    expect(() => routeShot({ shot, aspectRatio: '9:16', budgetPerShotUsd: 0.001 })).toThrow(
      OrchestratorError,
    );
  });

  it('prefers a model that supports audio when audio is required', () => {
    const decision = routeShot({
      shot: { ...shot, duration: 10 },
      aspectRatio: '9:16',
      budgetPerShotUsd: 5,
      needsAudio: true,
    });

    expect(findModel(decision.model)?.supportsAudio).toBe(true);
  });

  it('splits a long shot into chained clips', () => {
    const dop = findModel('dop-turbo')!;
    expect(clipsNeeded(dop, 5)).toBe(1);
    expect(clipsNeeded(dop, 12)).toBe(3);
  });
});

describe('buildStageInput', () => {
  it('builds a Soul text-to-image payload with the mapped frame size', () => {
    const decision = routeShot({ shot, aspectRatio: '9:16', budgetPerShotUsd: 2 });
    const input = buildStageInput(decision.stages[0], shot);

    expect(input).toMatchObject({
      prompt: shot.prompt,
      width_and_height: '1080x1920',
      batch_size: 1,
    });
  });

  it('builds a DoP image-to-video payload in the SDK-documented shape', () => {
    const decision = routeShot({ shot, aspectRatio: '9:16', budgetPerShotUsd: 2 });
    const videoStage = decision.stages.find((s) => s.stage === 'video')!;
    const input = buildStageInput(videoStage, shot, 'https://cdn.example/frame.jpg');

    // The model name is whatever the router chose from the catalog — the point
    // is the payload shape the SDK documents for /v1/image2video/dop.
    expect(input).toMatchObject({
      model: findModel(videoStage.modelId)!.defaults.model as string,
      prompt: shot.prompt,
      input_images: [{ type: 'image_url', image_url: 'https://cdn.example/frame.jpg' }],
    });
    expect(videoStage.endpoint).toBe('/v1/image2video/dop');
  });

  it('fails loudly when an animation stage has no input image', () => {
    const decision = routeShot({ shot, aspectRatio: '9:16', budgetPerShotUsd: 2 });
    expect(() => buildStageInput(decision.stages[1], shot)).toThrow(/needs an input image/i);
  });
});
