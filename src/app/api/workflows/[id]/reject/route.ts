import { z } from 'zod';
import { ApprovalDecision, WorkflowStatus } from '@prisma/client';
import { prisma } from '@/lib/db';
import { fail, ok } from '@/lib/api';
import { requireUser, assertWorkspace } from '@/lib/security/auth';
import { assertSameOrigin, rateLimit } from '@/lib/security/rateLimit';
import { HttpError } from '@/lib/errors';

export const dynamic = 'force-dynamic';

type Params = { params: Promise<{ id: string }> };

const bodySchema = z.object({ reason: z.string().max(1000).optional() }).default({});

export async function POST(request: Request, { params }: Params) {
  try {
    assertSameOrigin(request);
    const user = await requireUser();
    const { id } = await params;
    rateLimit(`workflows:reject:${user.id}`, 30);

    const workflow = await prisma.workflow.findUnique({ where: { id } });
    if (!workflow) throw new HttpError(404, 'Workflow not found.');
    assertWorkspace(user, workflow.workspaceId);

    if (workflow.status !== WorkflowStatus.AWAITING_APPROVAL) {
      throw new HttpError(409, `Workflow is ${workflow.status} and is not at the approval gate.`);
    }

    const raw = await request.text();
    const { reason } = bodySchema.parse(raw ? JSON.parse(raw) : undefined);

    await prisma.$transaction([
      prisma.approval.create({
        data: {
          workflowId: id,
          userId: user.id,
          decision: ApprovalDecision.REJECTED,
          notes: reason,
        },
      }),
      prisma.workflow.update({ where: { id }, data: { status: WorkflowStatus.REJECTED } }),
      prisma.auditLog.create({
        data: {
          workspaceId: workflow.workspaceId,
          actor: user.email,
          action: 'workflow.reject',
          target: id,
          metadata: reason ? { reason } : undefined,
        },
      }),
    ]);

    return ok({ workflowId: id, status: WorkflowStatus.REJECTED });
  } catch (error) {
    return fail(error);
  }
}
