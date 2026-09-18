import { z } from 'zod';
import { ApprovalDecision, ContentStatus, ShotStatus, WorkflowStatus } from '@prisma/client';
import { prisma } from '@/lib/db';
import { fail, ok } from '@/lib/api';
import { requireUser, assertWorkspace } from '@/lib/security/auth';
import { assertSameOrigin, rateLimit } from '@/lib/security/rateLimit';
import { HttpError } from '@/lib/errors';

export const dynamic = 'force-dynamic';

type Params = { params: Promise<{ id: string }> };

const bodySchema = z.object({ notes: z.string().max(1000).optional() }).default({});

/**
 * The approval gate (spec §15). APPROVE is the only transition that may ever
 * lead to publication, and it is never taken automatically. In this phase it
 * moves the workflow to APPROVED (or SCHEDULED when a publish date is set) and
 * stops there — the publisher is Phase 2.
 */
export async function POST(request: Request, { params }: Params) {
  try {
    assertSameOrigin(request);
    const user = await requireUser();
    const { id } = await params;
    rateLimit(`workflows:approve:${user.id}`, 30);

    const workflow = await prisma.workflow.findUnique({
      where: { id },
      include: { shots: true },
    });
    if (!workflow) throw new HttpError(404, 'Workflow not found.');
    assertWorkspace(user, workflow.workspaceId);

    if (workflow.status !== WorkflowStatus.AWAITING_APPROVAL) {
      throw new HttpError(
        409,
        `Only a workflow awaiting approval can be approved (this one is ${workflow.status}).`,
      );
    }

    const unpassed = workflow.shots.filter((shot) => shot.status !== ShotStatus.QC_PASSED);
    if (unpassed.length) {
      throw new HttpError(
        409,
        `${unpassed.length} shot(s) have not passed quality control. Regenerate them first.`,
      );
    }

    const raw = await request.text();
    const { notes } = bodySchema.parse(raw ? JSON.parse(raw) : undefined);

    const nextStatus = workflow.publishAt ? WorkflowStatus.SCHEDULED : WorkflowStatus.APPROVED;
    const strategy = (workflow.strategy ?? {}) as { topic?: string; hook?: string };

    await prisma.$transaction([
      prisma.approval.create({
        data: {
          workflowId: id,
          userId: user.id,
          decision: ApprovalDecision.APPROVED,
          notes,
        },
      }),
      prisma.workflow.update({ where: { id }, data: { status: nextStatus } }),
      // Content memory: record the approved Reel so future briefs can avoid it.
      prisma.contentItem.upsert({
        where: { workflowId: id },
        create: {
          workspaceId: workflow.workspaceId,
          workflowId: id,
          title: workflow.title,
          topic: strategy.topic ?? workflow.title,
          hook: strategy.hook ?? '',
          caption: workflow.caption,
          status: ContentStatus.IN_PRODUCTION,
        },
        update: { status: ContentStatus.IN_PRODUCTION, caption: workflow.caption },
      }),
      ...(workflow.publishAt
        ? [
            prisma.schedule.create({
              data: { workflowId: id, runAt: workflow.publishAt },
            }),
          ]
        : []),
      prisma.auditLog.create({
        data: {
          workspaceId: workflow.workspaceId,
          actor: user.email,
          action: 'workflow.approve',
          target: id,
        },
      }),
    ]);

    return ok({
      workflowId: id,
      status: nextStatus,
      note: 'Approved. Publishing is a Phase 2 capability and is not performed automatically.',
    });
  } catch (error) {
    return fail(error);
  }
}
