import { ShotStatus, WorkflowStatus } from '@prisma/client';
import { prisma } from '@/lib/db';
import { fail, ok } from '@/lib/api';
import { requireUser, assertWorkspace } from '@/lib/security/auth';
import { assertSameOrigin, rateLimit } from '@/lib/security/rateLimit';
import { enqueueWorkflow } from '@/lib/queue';
import { HttpError } from '@/lib/errors';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

type Params = { params: Promise<{ id: string }> };

/** Regenerate ONE shot. The rest of the Reel is untouched (spec §9). */
export async function POST(request: Request, { params }: Params) {
  try {
    assertSameOrigin(request);
    const user = await requireUser();
    const { id } = await params;
    rateLimit(`shots:regenerate:${user.id}`, 20);

    const shot = await prisma.shot.findUnique({
      where: { id },
      include: { workflow: true },
    });
    if (!shot) throw new HttpError(404, 'Shot not found.');
    assertWorkspace(user, shot.workflow.workspaceId);

    if (shot.workflow.status === WorkflowStatus.PUBLISHED) {
      throw new HttpError(409, 'A published Reel cannot be regenerated.');
    }

    await prisma.$transaction([
      prisma.shot.update({ where: { id }, data: { status: ShotStatus.PENDING } }),
      prisma.workflow.update({
        where: { id: shot.workflowId },
        data: { status: WorkflowStatus.GENERATING, errorCode: null, errorMessage: null },
      }),
      prisma.auditLog.create({
        data: {
          workspaceId: shot.workflow.workspaceId,
          actor: user.email,
          action: 'shot.regenerate',
          target: id,
        },
      }),
    ]);

    const job = await enqueueWorkflow({
      workflowId: shot.workflowId,
      kind: 'regenerate-shot',
      shotId: id,
    });

    return ok({ shotId: id, jobId: job.id }, 202);
  } catch (error) {
    return fail(error);
  }
}
