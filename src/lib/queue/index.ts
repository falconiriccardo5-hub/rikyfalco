import { Queue, type JobsOptions } from 'bullmq';
import IORedis, { type Redis } from 'ioredis';
import { env } from '../env';

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

/**
 * BullMQ deduplicates on jobId, so an accidental double-enqueue of the same
 * workflow does not start two pipelines. Retries are disabled at this level:
 * the generation layer owns recovery, and a blind requeue could re-bill.
 */
export async function enqueueWorkflow(data: WorkflowJobData, opts: JobsOptions = {}) {
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
