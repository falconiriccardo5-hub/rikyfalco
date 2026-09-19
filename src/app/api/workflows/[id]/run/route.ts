import { z } from 'zod';
import { WorkflowStatus } from '@prisma/client';
import { prisma } from '@/lib/db';
import { fail, ok } from '@/lib/api';
import { requireUser, assertWorkspace } from '@/lib/security/auth';
import { assertSameOrigin, rateLimit } from '@/lib/security/rateLimit';
import { enqueueWorkflow } from '@/lib/queue';
import { runWorkflow } from '@/lib/pipeline/orchestrator';
import { HttpError } from '@/lib/errors';

export const dynamic = 'force-dynamic';
// On a serverless host the pipeline finishes inside this request (see the queue
// driver), so the function needs room to do it.
export const maxDuration = 300;

type Params = { params: Promise<{ id: string }> };

const bodySchema = z
  .object({
    /** Route the shots and price the Reel without spending anything. */
    estimateOnly: z.boolean().default(false),
  })
  .default({ estimateOnly: false });

const RESTARTABLE: WorkflowStatus[] = [WorkflowStatus.DRAFT, WorkflowStatus.FAILED];

export async function POST(request: Request, { params }: Params) {
  try {
    assertSameOrigin(request);
    const user = await requireUser();
    const { id } = await params;
    rateLimit(`workflows:run:${user.id}`, 20);

    const workflow = await prisma.workflow.findUnique({ where: { id } });
    if (!workflow) throw new HttpError(404, 'Workflow not found.');
    assertWorkspace(user, workflow.workspaceId);

    const raw = await request.text();
    const { estimateOnly } = bodySchema.parse(raw ? JSON.parse(raw) : undefined);

    if (estimateOnly) {
      // Runs inline: it is cheap and the user is waiting on the number.
      const result = await runWorkflow(id, { estimateOnly: true });
      return ok(result);
    }

    if (!RESTARTABLE.includes(workflow.status)) {
      throw new HttpError(409, `Workflow is ${workflow.status} and cannot be started again.`);
    }

    await prisma.workflow.update({
      where: { id },
      data: { status: WorkflowStatus.STRATEGY, errorCode: null, errorMessage: null },
    });

    const job = await enqueueWorkflow({ workflowId: id, kind: 'run' });

    await prisma.auditLog.create({
      data: {
        workspaceId: workflow.workspaceId,
        actor: user.email,
        action: 'workflow.run',
        target: id,
      },
    });

    return ok({ workflowId: id, jobId: job.id, status: WorkflowStatus.STRATEGY }, 202);
  } catch (error) {
    return fail(error);
  }
}
