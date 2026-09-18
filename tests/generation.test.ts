import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { HiggsfieldClient, V2Response } from '@/lib/higgsfield/client';
import type { RenderStage } from '@/lib/agents/modelRouter';
import type { ShotSpec } from '@/lib/agents/schemas';

/**
 * The invariant under test: a submission whose outcome is already recorded is
 * reconciled through the status endpoint, never re-POSTed. A second POST would
 * bill a second generation.
 */

const jobRow = {
  id: 'job-1',
  shotId: 'shot-1',
  requestId: null as string | null,
  status: 'CREATED',
  resultUrl: null as string | null,
};

const upsert = vi.fn(async () => jobRow);
const update = vi.fn(async () => jobRow);

vi.mock('@/lib/db', () => ({
  prisma: { generationJob: { upsert: (...a: unknown[]) => upsert(...(a as [])), update: (...a: unknown[]) => update(...(a as [])) } },
}));

vi.mock('@/lib/cost', () => ({
  assertWithinBudget: vi.fn(async () => {}),
  recordCost: vi.fn(async () => {}),
  toNumber: (v: unknown) => Number(v ?? 0),
}));

const { runStage } = await import('@/lib/pipeline/generation');

const stage: RenderStage = {
  stage: 'video',
  modelId: 'dop-turbo',
  endpoint: '/v1/image2video/dop',
  estimatedCostUsd: 0.18,
};

const shot: ShotSpec = {
  scene_id: 'scene-1',
  duration: 5,
  visual_goal: 'goal',
  prompt: 'a cinematic shot',
  camera: '',
  lens: '',
  movement: '',
  lighting: '',
  environment: '',
  style: '',
  negative_prompt: '',
  aspect_ratio: '9:16',
  references: [],
};

function completed(): V2Response {
  return {
    status: 'completed',
    request_id: 'req-9',
    status_url: 's',
    cancel_url: 'c',
    video: { url: 'https://cdn/out.mp4' },
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  jobRow.requestId = null;
  jobRow.status = 'CREATED';
  jobRow.resultUrl = null;
});

describe('runStage', () => {
  it('submits once and returns the completed media URL', async () => {
    const client: HiggsfieldClient = {
      isConfigured: () => true,
      submit: vi.fn(async () => completed()),
      getStatus: vi.fn(async () => completed()),
    };

    const result = await runStage({
      workflowId: 'wf-1',
      shotId: 'shot-1',
      shot,
      stage,
      attempt: 1,
      seedImageUrl: 'https://cdn/frame.jpg',
      client,
    });

    expect(client.submit).toHaveBeenCalledTimes(1);
    expect(result.url).toBe('https://cdn/out.mp4');
  });

  it('never re-submits an attempt that already reached the provider', async () => {
    // The row already carries a request_id: a previous POST landed, outcome unknown.
    jobRow.requestId = 'req-existing';

    const client: HiggsfieldClient = {
      isConfigured: () => true,
      submit: vi.fn(async () => completed()),
      getStatus: vi.fn(async () => completed()),
    };

    const result = await runStage({
      workflowId: 'wf-1',
      shotId: 'shot-1',
      shot,
      stage,
      attempt: 1,
      seedImageUrl: 'https://cdn/frame.jpg',
      client,
    });

    expect(client.submit).not.toHaveBeenCalled();
    expect(client.getStatus).toHaveBeenCalledWith('req-existing');
    expect(result.url).toBe('https://cdn/out.mp4');
  });

  it('surfaces a provider moderation rejection instead of silently retrying', async () => {
    const nsfw: V2Response = {
      status: 'nsfw',
      request_id: 'req-9',
      status_url: 's',
      cancel_url: 'c',
    };
    const client: HiggsfieldClient = {
      isConfigured: () => true,
      submit: vi.fn(async () => nsfw),
      getStatus: vi.fn(async () => nsfw),
    };

    await expect(
      runStage({
        workflowId: 'wf-1',
        shotId: 'shot-1',
        shot,
        stage,
        attempt: 1,
        seedImageUrl: 'https://cdn/frame.jpg',
        client,
      }),
    ).rejects.toMatchObject({ code: 'GENERATION_FAILED' });

    expect(client.submit).toHaveBeenCalledTimes(1);
  });
});
