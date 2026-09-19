import { randomUUID } from 'node:crypto';
import { Queue, type JobsOptions } from 'bullmq';
import IORedis, { type Redis } from 'ioredis';
import { env } from '../env';
import { drivers } from '../drivers';
import { logger } from '../logger';

export const WORKFLOW_QUEUE = 'workflow';

export interface WorkflowJobData {
  workflowId: string;
  kind: 'run' | 'regenerate-shot';
  shotId?: string;
}

let connection: Redis | null = null;
let queue: Queue<WorkflowJobData> | null = null;

export function redisConnection(): Redis {
  if (!connection) {
    connection = new IORedis(env().REDIS_URL, { maxRetriesPerRequest: null });
  }
  return connection;
}

export function workflowQueue(): Queue<WorkflowJobData> {
  if (!queue) {
    queue = new Queue<WorkflowJobData>(WORKFLOW_QUEUE, { connection: redisConnection() });
  }
  return queue;
}

/** In-flight inline jobs, so the dashboard can tell work is running. */
const inlineJobs = new Set<string>();

export function inlineJobCount(): number {
  return inlineJobs.size;
}

/**
 * Run the pipeline in this process, without Redis.
 *
 * The call is intentionally not awaited: the HTTP route answers immediately and
 * the dashboard follows the workflow's status, exactly as it does with the
 * worker. Failures are already persisted on the workflow by the orchestrator,
 * so nothing is lost by detaching here.
 */
async function runInline(data: WorkflowJobData): Promise<{ id: string }> {
  const id = `inline:${randomUUID()}`;
  inlineJobs.add(id);

  // Imported lazily: the orchestrator pulls in the whole agent stack, which the
  // Redis path does not need.
  const { runWorkflow, regenerateShot } = await import('../pipeline/orchestrator');

  void (async () => {
    try {
      if (data.kind === 'regenerate-shot') {
        if (!data.shotId) throw new Error('regenerate-shot job is missing shotId');
        await regenerateShot(data.shotId);
      } else {
        await runWorkflow(data.workflowId);
      }
      logger.info('Inline job completed', { id, kind: data.kind });
    } catch (error) {
      logger.error('Inline job failed', { id, error: (error as Error).message });
    } finally {
      inlineJobs.delete(id);
    }
  })();

  return { id };
}

/**
 * BullMQ deduplicates on jobId, so an accidental double-enqueue of the same
 * workflow does not start two pipelines. Retries are disabled at this level:
 * the generation layer owns recovery, and a blind requeue could re-bill.
 */
export async function enqueueWorkflow(data: WorkflowJobData, opts: JobsOptions = {}) {
  if (drivers().queue === 'inline') return runInline(data);

  const jobId =
    data.kind === 'regenerate-shot'
      ? `regen:${data.shotId}:${Date.now()}`
      : `run:${data.workflowId}`;

  return workflowQueue().add(data.kind, data, {
    jobId,
    attempts: 1,
    removeOnComplete: { age: 86_400, count: 500 },
    removeOnFail: { age: 604_800 },
    ...opts,
  });
}

export async function closeQueue(): Promise<void> {
  await queue?.close();
  queue = null;
  connection?.disconnect();
  connection = null;
}
