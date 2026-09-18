import { Worker } from 'bullmq';
import { logger } from '../lib/logger';
import { redisConnection, WORKFLOW_QUEUE, type WorkflowJobData } from '../lib/queue';
import { regenerateShot, runWorkflow } from '../lib/pipeline/orchestrator';

/**
 * Asynchronous production worker. Run it as a separate process from the web
 * app: generation and QC are long-running and outlive a serverless request.
 */
const worker = new Worker<WorkflowJobData>(
  WORKFLOW_QUEUE,
  async (job) => {
    logger.info('Worker picked up a job', { jobId: job.id, kind: job.data.kind });

    if (job.data.kind === 'regenerate-shot') {
      if (!job.data.shotId) throw new Error('regenerate-shot job is missing shotId');
      await regenerateShot(job.data.shotId);
      return { shotId: job.data.shotId };
    }

    return runWorkflow(job.data.workflowId);
  },
  {
    connection: redisConnection(),
    // One Reel at a time per worker: generation is provider-rate-limited and
    // concurrency here mostly buys duplicate-spend risk.
    concurrency: Number(process.env.WORKER_CONCURRENCY ?? 1),
  },
);

worker.on('completed', (job) => logger.info('Job completed', { jobId: job.id }));
worker.on('failed', (job, error) =>
  logger.error('Job failed', { jobId: job?.id, error: error.message }),
);

async function shutdown(signal: string) {
  logger.info('Shutting down worker', { signal });
  await worker.close();
  process.exit(0);
}

process.on('SIGTERM', () => void shutdown('SIGTERM'));
process.on('SIGINT', () => void shutdown('SIGINT'));

logger.info('Worker ready', { queue: WORKFLOW_QUEUE });
