import {
  AgentKind,
  AssetKind,
  Prisma,
  RunStatus,
  ShotStatus,
  WorkflowStatus,
  type Workflow,
} from '@prisma/client';
import { prisma } from '../db';
import { logger } from '../logger';
import { OrchestratorError } from '../errors';
import { recordCost, toNumber } from '../cost';
import { cleanupWorkingCopy, ingestAsset } from '../storage';
import { runStrategist } from '../agents/strategist';
import { runScriptwriter } from '../agents/scriptwriter';
import { runDirector } from '../agents/director';
import { routeShot, type RoutingDecision } from '../agents/modelRouter';
import { runQualityControl } from '../agents/qualityControl';
import { shotSchema, strategySchema, scriptSchema, type ShotSpec } from '../agents/schemas';
import { runStage } from './generation';

const MAX_SHOT_REGENERATIONS = 2;
const PRIOR_CONTENT_LIMIT = 15;

async function loadContext(workflowId: string) {
  const workflow = await prisma.workflow.findUniqueOrThrow({
    where: { id: workflowId },
    include: { brandProfile: true },
  });

  const priorContent = await prisma.contentItem.findMany({
    where: { workspaceId: workflow.workspaceId },
    orderBy: { createdAt: 'desc' },
    take: PRIOR_CONTENT_LIMIT,
    select: { title: true, topic: true, hook: true, publishedAt: true },
  });

  return { workflow, brand: workflow.brandProfile, priorContent };
}

/** Wrap an agent call so every run is logged with input, output, timing and cost (spec §21). */
async function withAgentRun<T extends { costUsd: number; model: string }>(
  workflowId: string,
  agent: AgentKind,
  input: Prisma.InputJsonValue,
  fn: () => Promise<T>,
  extractOutput: (result: T) => Prisma.InputJsonValue,
): Promise<T> {
  const run = await prisma.agentRun.create({
    data: { workflowId, agent, input, status: RunStatus.RUNNING },
  });

  try {
    const result = await fn();
    await prisma.agentRun.update({
      where: { id: run.id },
      data: {
        status: RunStatus.SUCCEEDED,
        output: extractOutput(result),
        model: result.model,
        costUsd: new Prisma.Decimal(result.costUsd.toFixed(4)),
        completedAt: new Date(),
      },
    });
    await recordCost({
      workflowId,
      category: 'agent',
      amountUsd: result.costUsd,
      reference: agent,
    });
    return result;
  } catch (error) {
    await prisma.agentRun.update({
      where: { id: run.id },
      data: {
        status: RunStatus.FAILED,
        error: (error as Error).message,
        completedAt: new Date(),
      },
    });
    throw error;
  }
}

async function setStatus(workflowId: string, status: WorkflowStatus): Promise<void> {
  await prisma.workflow.update({ where: { id: workflowId }, data: { status } });
}

async function failWorkflow(workflow: Workflow, error: unknown): Promise<never> {
  const code =
    error instanceof OrchestratorError ? error.code : ('GENERATION_FAILED' as const);
  await prisma.workflow.update({
    where: { id: workflow.id },
    data: {
      status: WorkflowStatus.FAILED,
      errorCode: code,
      errorMessage: (error as Error).message.slice(0, 1000),
    },
  });
  logger.error('Workflow failed', { workflowId: workflow.id, code });
  throw error;
}

export interface RunOptions {
  /** Stop after storyboarding and cost estimation, before any spend. */
  estimateOnly?: boolean;
}

export interface RunResult {
  workflowId: string;
  status: WorkflowStatus;
  estimatedCostUsd: number;
  shots: number;
}

/**
 * The MVP pipeline (spec §24):
 *   BRIEF -> STRATEGIST -> SCRIPTWRITER -> DIRECTOR -> ROUTER -> HIGGSFIELD -> QC -> APPROVAL
 * It stops at AWAITING_APPROVAL. Publishing is never automatic.
 */
export async function runWorkflow(
  workflowId: string,
  options: RunOptions = {},
): Promise<RunResult> {
  const { workflow, brand, priorContent } = await loadContext(workflowId);
  const context = { workflow, brand, priorContent };

  try {
    // 1. Strategy
    await setStatus(workflowId, WorkflowStatus.STRATEGY);
    const { strategy } = await withAgentRun(
      workflowId,
      AgentKind.STRATEGIST,
      { brief: workflow.brief, brandProfileId: brand.id },
      () => runStrategist(context),
      (r) => r.strategy,
    );
    await prisma.workflow.update({
      where: { id: workflowId },
      data: { strategy: strategy as Prisma.InputJsonValue },
    });

    // 2. Script
    await setStatus(workflowId, WorkflowStatus.SCRIPT);
    const { script } = await withAgentRun(
      workflowId,
      AgentKind.SCRIPTWRITER,
      strategy as Prisma.InputJsonValue,
      () => runScriptwriter(context, strategy),
      (r) => r.script,
    );
    await prisma.workflow.update({
      where: { id: workflowId },
      data: { script: script as Prisma.InputJsonValue },
    });

    // 3. Storyboard + caption
    await setStatus(workflowId, WorkflowStatus.STORYBOARD);
    const { storyboard } = await withAgentRun(
      workflowId,
      AgentKind.DIRECTOR,
      { strategy, script } as Prisma.InputJsonValue,
      () => runDirector(context, strategy, script),
      (r) => r.storyboard as unknown as Prisma.InputJsonValue,
    );

    await prisma.$transaction([
      prisma.shot.deleteMany({ where: { workflowId } }),
      prisma.workflow.update({
        where: { id: workflowId },
        data: { caption: storyboard.caption },
      }),
      ...storyboard.shots.map((shot, index) =>
        prisma.shot.create({
          data: {
            workflowId,
            sceneId: shot.scene_id,
            orderIndex: index,
            durationSec: Math.round(shot.duration),
            visualGoal: shot.visual_goal,
            prompt: shot.prompt,
            camera: shot.camera,
            lens: shot.lens,
            movement: shot.movement,
            lighting: shot.lighting,
            environment: shot.environment,
            style: shot.style,
            negativePrompt: shot.negative_prompt,
            aspectRatio: shot.aspect_ratio,
            references: shot.references,
            onScreenText: script.scenes[index]?.on_screen_text ?? null,
            voiceover: script.scenes[index]?.voiceover ?? null,
          },
        }),
      ),
    ]);

    // 4. Routing + cost estimate, before any generation spend
    await setStatus(workflowId, WorkflowStatus.ROUTING);
    const shots = await prisma.shot.findMany({
      where: { workflowId },
      orderBy: { orderIndex: 'asc' },
    });

    const budget = toNumber(workflow.maxBudgetUsd);
    const spentSoFar = toNumber(
      (await prisma.workflow.findUniqueOrThrow({ where: { id: workflowId } })).actualCost,
    );
    const budgetPerShot = Math.max(0, (budget - spentSoFar) / Math.max(1, shots.length));

    let estimatedTotal = 0;
    const routings = new Map<string, RoutingDecision>();

    await withAgentRun(
      workflowId,
      AgentKind.MODEL_ROUTER,
      { shots: shots.length, budgetPerShot } as Prisma.InputJsonValue,
      async () => {
        for (const shot of shots) {
          const spec = toShotSpec(shot);
          const decision = routeShot({
            shot: spec,
            aspectRatio: shot.aspectRatio,
            budgetPerShotUsd: budgetPerShot,
            seedImageUrl: shot.references[0],
          });
          routings.set(shot.id, decision);
          estimatedTotal += decision.estimatedCostUsd;
          await prisma.shot.update({
            where: { id: shot.id },
            data: {
              routing: decision as unknown as Prisma.InputJsonValue,
              status: ShotStatus.ROUTED,
            },
          });
        }
        return { costUsd: 0, model: 'deterministic-router' };
      },
      () => Object.fromEntries(routings) as unknown as Prisma.InputJsonValue,
    );

    await prisma.workflow.update({
      where: { id: workflowId },
      data: { estimatedCost: new Prisma.Decimal(estimatedTotal.toFixed(4)) },
    });

    if (estimatedTotal + spentSoFar > budget) {
      throw new OrchestratorError(
        'BUDGET_EXCEEDED',
        `Estimated $${estimatedTotal.toFixed(2)} exceeds the $${budget.toFixed(2)} budget for this workflow.`,
      );
    }

    if (options.estimateOnly) {
      // Pricing a Reel must not consume it: hand the workflow back in the
      // status it arrived in, or "Estimate cost" would leave it stuck in
      // ROUTING and the GENERATE button could never start it.
      await setStatus(workflowId, workflow.status);
      return {
        workflowId,
        status: workflow.status,
        estimatedCostUsd: estimatedTotal,
        shots: shots.length,
      };
    }

    // 5. Generate + QC, shot by shot
    await setStatus(workflowId, WorkflowStatus.GENERATING);
    for (const shot of shots) {
      const decision = routings.get(shot.id);
      if (!decision) continue;
      await produceShot(workflowId, shot.id, decision);
    }

    await setStatus(workflowId, WorkflowStatus.AWAITING_APPROVAL);
    logger.info('Workflow reached the approval gate', { workflowId });

    return {
      workflowId,
      status: WorkflowStatus.AWAITING_APPROVAL,
      estimatedCostUsd: estimatedTotal,
      shots: shots.length,
    };
  } catch (error) {
    return failWorkflow(workflow, error);
  }
}

function toShotSpec(shot: {
  sceneId: string;
  durationSec: number;
  visualGoal: string;
  prompt: string;
  camera: string | null;
  lens: string | null;
  movement: string | null;
  lighting: string | null;
  environment: string | null;
  style: string | null;
  negativePrompt: string | null;
  aspectRatio: string;
  references: string[];
}): ShotSpec {
  return shotSchema.parse({
    scene_id: shot.sceneId,
    duration: shot.durationSec,
    visual_goal: shot.visualGoal,
    prompt: shot.prompt,
    camera: shot.camera ?? '',
    lens: shot.lens ?? '',
    movement: shot.movement ?? '',
    lighting: shot.lighting ?? '',
    environment: shot.environment ?? '',
    style: shot.style ?? '',
    negative_prompt: shot.negativePrompt ?? '',
    aspect_ratio: shot.aspectRatio,
    references: shot.references,
  });
}

/**
 * Generate one shot and run QC on it. On a QC failure only THIS shot is
 * regenerated — the rest of the Reel is left alone (spec §9).
 */
export async function produceShot(
  workflowId: string,
  shotId: string,
  decision: RoutingDecision,
): Promise<void> {
  const workflow = await prisma.workflow.findUniqueOrThrow({
    where: { id: workflowId },
    include: { brandProfile: true },
  });

  for (let attempt = 1; attempt <= MAX_SHOT_REGENERATIONS + 1; attempt += 1) {
    const shot = await prisma.shot.findUniqueOrThrow({ where: { id: shotId } });
    const spec = toShotSpec(shot);

    await prisma.shot.update({
      where: { id: shotId },
      data: { status: ShotStatus.GENERATING },
    });

    let seedImageUrl: string | undefined = shot.references[0];
    let videoUrl: string | null = null;
    let lastJobId: string | null = null;

    for (const stage of decision.stages) {
      const result = await runStage({
        workflowId,
        shotId,
        shot: spec,
        stage,
        attempt,
        seedImageUrl,
      });
      lastJobId = result.jobId;
      if (stage.stage === 'image') seedImageUrl = result.url ?? undefined;
      else videoUrl = result.url;
    }

    if (!videoUrl) {
      throw new OrchestratorError('GENERATION_FAILED', `No video produced for shot ${shotId}.`);
    }

    // Store the asset in our own bucket before reviewing or publishing it.
    const stored = await ingestAsset({
      sourceUrl: videoUrl,
      keyPrefix: `workflows/${workflowId}/shots/${shotId}`,
      label: `Scene ${shot.sceneId} · ${shot.durationSec}s`,
      detail: decision.model,
      aspectRatio: shot.aspectRatio,
    });

    try {
      const qc = await runQualityControl({
        filePath: stored.localPath,
        shot: spec,
        brand: workflow.brandProfile,
        expectedDurationSec: shot.durationSec,
        expectedAspectRatio: shot.aspectRatio,
      });

      await recordCost({
        workflowId,
        category: 'qc',
        amountUsd: qc.costUsd,
        reference: shotId,
      });

      await prisma.asset.create({
        data: {
          shotId,
          generationJobId: lastJobId,
          kind: stored.mimeType.startsWith('video/') ? AssetKind.VIDEO : AssetKind.IMAGE,
          storageKey: stored.storageKey,
          mimeType: stored.mimeType,
          bytes: stored.bytes,
          checksum: stored.checksum,
          sourceUrl: videoUrl,
          width: qc.probe.width,
          height: qc.probe.height,
          durationSec: qc.probe.durationSec,
        },
      });

      await prisma.shot.update({
        where: { id: shotId },
        data: {
          qcReport: qc.report as unknown as Prisma.InputJsonValue,
          qcScore: qc.report.score,
          status: qc.report.approved ? ShotStatus.QC_PASSED : ShotStatus.QC_FAILED,
        },
      });

      if (qc.report.approved) return;

      logger.warn('QC rejected a shot; regenerating that shot only', {
        shotId,
        attempt,
        score: qc.report.score,
      });
      await prisma.shot.update({
        where: { id: shotId },
        data: { regenCount: { increment: 1 } },
      });
    } finally {
      await cleanupWorkingCopy(stored.localPath);
    }
  }

  throw new OrchestratorError(
    'QC_FAILED',
    `Shot ${shotId} did not pass quality control after ${MAX_SHOT_REGENERATIONS + 1} attempts.`,
  );
}

/** Regenerate a single shot on demand (POST /api/shots/:id/regenerate). */
export async function regenerateShot(shotId: string): Promise<void> {
  const shot = await prisma.shot.findUniqueOrThrow({ where: { id: shotId } });
  const decision = shot.routing
    ? (shot.routing as unknown as RoutingDecision)
    : routeShot({
        shot: toShotSpec(shot),
        aspectRatio: shot.aspectRatio,
        budgetPerShotUsd: Number.MAX_SAFE_INTEGER,
      });

  await produceShot(shot.workflowId, shotId, decision);

  // Re-open the gate only when every shot is good again.
  const remaining = await prisma.shot.count({
    where: { workflowId: shot.workflowId, status: { not: ShotStatus.QC_PASSED } },
  });
  if (remaining === 0) {
    await setStatus(shot.workflowId, WorkflowStatus.AWAITING_APPROVAL);
  }
}

export const __testables = { toShotSpec, strategySchema, scriptSchema };
