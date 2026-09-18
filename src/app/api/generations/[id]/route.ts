import { GenerationJobStatus } from '@prisma/client';
import { prisma } from '@/lib/db';
import { fail, ok } from '@/lib/api';
import { requireUser, assertWorkspace } from '@/lib/security/auth';
import { createHiggsfieldClient, isTerminal } from '@/lib/higgsfield/client';
import { HttpError } from '@/lib/errors';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

type Params = { params: Promise<{ id: string }> };

/**
 * Read one generation job. When the job is still open and we hold a request_id,
 * the provider is asked for the authoritative state — this is the reconciliation
 * path that keeps us from ever resubmitting a request that already landed.
 */
export async function GET(_request: Request, { params }: Params) {
  try {
    const user = await requireUser();
    const { id } = await params;

    const job = await prisma.generationJob.findUnique({
      where: { id },
      include: { shot: { include: { workflow: true } } },
    });
    if (!job) throw new HttpError(404, 'Generation job not found.');
    assertWorkspace(user, job.shot.workflow.workspaceId);

    const open = !(
      [GenerationJobStatus.COMPLETED, GenerationJobStatus.FAILED, GenerationJobStatus.NSFW] as GenerationJobStatus[]
    ).includes(job.status);

    if (open && job.requestId) {
      try {
        const remote = await createHiggsfieldClient().getStatus(job.requestId);
        if (isTerminal(remote.status)) {
          logger.info('Reconciled a generation job from the provider', { jobId: job.id });
        }
        return ok({ ...job, providerStatus: remote.status });
      } catch (error) {
        logger.warn('Could not reach the provider for job status', {
          jobId: job.id,
          error: (error as Error).message,
        });
      }
    }

    return ok(job);
  } catch (error) {
    return fail(error);
  }
}
