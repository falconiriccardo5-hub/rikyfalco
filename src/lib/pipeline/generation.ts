import { GenerationJobStatus, Prisma } from '@prisma/client';
import { prisma } from '../db';
import { logger } from '../logger';
import { OrchestratorError } from '../errors';
import { assertWithinBudget, recordCost } from '../cost';
import { generationKey } from '../idempotency';
import {
  createHiggsfieldClient,
  pollUntilTerminal,
  resultUrl,
  type HiggsfieldClient,
  type V2Response,
} from '../higgsfield/client';
import { createLocalGenerationClient } from '../higgsfield/localClient';
import { drivers } from '../drivers';
import { buildStageInput, type RenderStage } from '../agents/modelRouter';
import type { ShotSpec } from '../agents/schemas';

export interface RunStageArgs {
  workflowId: string;
  shotId: string;
  shot: ShotSpec;
  stage: RenderStage;
  attempt: number;
  seedImageUrl?: string;
  client?: HiggsfieldClient;
}

export interface StageResult {
  jobId: string;
  status: GenerationJobStatus;
  url: string | null;
  requestId: string | null;
}

function mapStatus(status: V2Response['status']): GenerationJobStatus {
  switch (status) {
    case 'queued':
      return GenerationJobStatus.QUEUED;
    case 'in_progress':
      return GenerationJobStatus.IN_PROGRESS;
    case 'completed':
      return GenerationJobStatus.COMPLETED;
    case 'nsfw':
      return GenerationJobStatus.NSFW;
    default:
      return GenerationJobStatus.FAILED;
  }
}

/**
 * Run one render stage against Higgsfield.
 *
 * The submission is NOT retried blindly. The GenerationJob row is written
 * before the POST, keyed by (shot, stage, attempt). If the POST times out with
 * an unknown outcome, the recorded request_id — if any — is reconciled through
 * the status endpoint on the next pass, so a request that did land is never
 * submitted twice (spec §7).
 */
export async function runStage(args: RunStageArgs): Promise<StageResult> {
  const { workflowId, shotId, shot, stage, attempt, seedImageUrl } = args;
  const local = drivers().generation === 'local';
  const client = args.client ?? (local ? createLocalGenerationClient() : createHiggsfieldClient());
  // Nothing is in flight with the local driver, so polling it on the provider's
  // cadence would only add dead time to the request.
  const pollOptions = local ? { intervalMs: 50, maxMs: 30_000 } : undefined;
  const key = generationKey(shotId, stage.stage, attempt);

  await assertWithinBudget(workflowId, stage.estimatedCostUsd);

  const input = buildStageInput(stage, shot, seedImageUrl);

  // Claim the attempt first: the unique key makes a concurrent duplicate impossible.
  const job = await prisma.generationJob.upsert({
    where: { idempotencyKey: key },
    create: {
      shotId,
      endpoint: stage.endpoint,
      modelId: stage.modelId,
      stage: stage.stage,
      input: input as Prisma.InputJsonValue,
      idempotencyKey: key,
      attempt,
      estimatedCost: new Prisma.Decimal(stage.estimatedCostUsd.toFixed(4)),
      status: GenerationJobStatus.CREATED,
    },
    update: {},
  });

  // Recovery path: this attempt already reached the provider. Read, do not resend.
  if (job.requestId) {
    logger.info('Reconciling an existing generation request instead of resubmitting', {
      jobId: job.id,
      requestId: job.requestId,
    });
    return finalize(
      job.id,
      workflowId,
      await pollUntilTerminal(client, job.requestId, pollOptions),
      stage,
    );
  }

  if (job.status === GenerationJobStatus.COMPLETED && job.resultUrl) {
    return {
      jobId: job.id,
      status: job.status,
      url: job.resultUrl,
      requestId: job.requestId ?? null,
    };
  }

  let submitted: V2Response;
  try {
    submitted = await client.submit({ endpoint: stage.endpoint, input });
  } catch (error) {
    await prisma.generationJob.update({
      where: { id: job.id },
      data: { status: GenerationJobStatus.FAILED, error: (error as Error).message },
    });
    throw error;
  }

  await prisma.generationJob.update({
    where: { id: job.id },
    data: {
      requestId: submitted.request_id,
      statusUrl: submitted.status_url,
      status: mapStatus(submitted.status),
      submittedAt: new Date(),
    },
  });

  const terminal = submitted.request_id
    ? await pollUntilTerminal(client, submitted.request_id, pollOptions)
    : submitted;

  return finalize(job.id, workflowId, terminal, stage);
}

async function finalize(
  jobId: string,
  workflowId: string,
  response: V2Response,
  stage: RenderStage,
): Promise<StageResult> {
  const status = mapStatus(response.status);
  const url = response.status === 'completed' ? resultUrl(response) : null;

  await prisma.generationJob.update({
    where: { id: jobId },
    data: {
      status,
      resultUrl: url,
      completedAt: new Date(),
      ...(response.status === 'completed'
        ? { actualCost: new Prisma.Decimal(stage.estimatedCostUsd.toFixed(4)) }
        : {}),
      ...(response.status === 'nsfw' ? { error: 'Rejected by provider moderation (nsfw).' } : {}),
      ...(response.status === 'failed' ? { error: 'Provider reported a failed generation.' } : {}),
    },
  });

  if (response.status === 'completed') {
    // Only a completed generation is billed; failed and nsfw are refunded upstream.
    await recordCost({
      workflowId,
      category: 'generation',
      amountUsd: stage.estimatedCostUsd,
      reference: jobId,
    });
  }

  if (response.status !== 'completed') {
    throw new OrchestratorError(
      'GENERATION_FAILED',
      `The generation provider returned "${response.status}" for ${stage.modelId}.`,
      { requestId: response.request_id },
    );
  }

  if (!url) {
    throw new OrchestratorError(
      'GENERATION_FAILED',
      `The generation provider reported completion without a media URL for ${stage.modelId}.`,
    );
  }

  return { jobId, status, url, requestId: response.request_id };
}
