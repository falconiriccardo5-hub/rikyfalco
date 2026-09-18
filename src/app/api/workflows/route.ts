import { z } from 'zod';
import { Prisma, WorkflowStatus } from '@prisma/client';
import { prisma } from '@/lib/db';
import { fail, ok } from '@/lib/api';
import { requireUser } from '@/lib/security/auth';
import { assertSameOrigin, rateLimit } from '@/lib/security/rateLimit';
import { workflowKey } from '@/lib/idempotency';
import { HttpError } from '@/lib/errors';

export const dynamic = 'force-dynamic';

const createSchema = z.object({
  title: z.string().min(3).max(140),
  brief: z.string().min(20).max(4000),
  brandProfileId: z.string().optional(),
  target: z.string().max(200).optional(),
  goal: z.string().max(200).optional(),
  durationSec: z.number().int().min(5).max(90).default(20),
  style: z.string().max(200).optional(),
  cta: z.string().max(200).optional(),
  aspectRatio: z.enum(['9:16', '1:1', '16:9']).default('9:16'),
  referenceMedia: z.array(z.string().url()).max(5).default([]),
  maxBudgetUsd: z.number().positive().max(100).default(2),
  publishAt: z.string().datetime().optional(),
});

export async function GET() {
  try {
    const user = await requireUser();
    const workflows = await prisma.workflow.findMany({
      where: { workspaceId: user.workspaceId },
      orderBy: { createdAt: 'desc' },
      take: 50,
      include: { _count: { select: { shots: true } } },
    });
    return ok(workflows);
  } catch (error) {
    return fail(error);
  }
}

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const user = await requireUser();
    rateLimit(`workflows:create:${user.id}`);

    const body = createSchema.parse(await request.json());

    const brand = body.brandProfileId
      ? await prisma.brandProfile.findFirst({
          where: { id: body.brandProfileId, workspaceId: user.workspaceId },
        })
      : await prisma.brandProfile.findFirst({
          where: { workspaceId: user.workspaceId, isDefault: true },
        });

    if (!brand) throw new HttpError(400, 'No brand profile available for this workspace.');

    const workflow = await prisma.workflow.create({
      data: {
        workspaceId: user.workspaceId,
        brandProfileId: brand.id,
        title: body.title,
        brief: body.brief,
        targetOverride: body.target,
        goal: body.goal,
        durationSec: body.durationSec,
        styleOverride: body.style,
        ctaOverride: body.cta,
        aspectRatio: body.aspectRatio,
        referenceMedia: body.referenceMedia,
        maxBudgetUsd: new Prisma.Decimal(body.maxBudgetUsd.toFixed(4)),
        publishAt: body.publishAt ? new Date(body.publishAt) : null,
        status: WorkflowStatus.DRAFT,
        idempotencyKey: workflowKey(user.workspaceId, body.brief, new Date().toISOString()),
      },
    });

    await prisma.auditLog.create({
      data: {
        workspaceId: user.workspaceId,
        actor: user.email,
        action: 'workflow.create',
        target: workflow.id,
      },
    });

    return ok(workflow, 201);
  } catch (error) {
    return fail(error);
  }
}
