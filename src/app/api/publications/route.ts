import { z } from 'zod';
import { PublicationStatus, WorkflowStatus } from '@prisma/client';
import { prisma } from '@/lib/db';
import { fail, ok } from '@/lib/api';
import { requireUser, assertWorkspace } from '@/lib/security/auth';
import { assertSameOrigin, rateLimit } from '@/lib/security/rateLimit';
import { publicationKey } from '@/lib/idempotency';
import { getInstagramPublisher, PublisherNotConfiguredError } from '@/lib/publisher';
import { HttpError } from '@/lib/errors';

export const dynamic = 'force-dynamic';

const bodySchema = z.object({
  workflowId: z.string().min(1),
  platform: z.enum(['instagram']).default('instagram'),
});

/**
 * Create a publication record and hand it to the platform adapter.
 *
 * Two hard gates: the workflow must have been explicitly APPROVED (or
 * SCHEDULED, which only an approval produces), and an already-published
 * workflow is refused on its idempotency key rather than published twice
 * (spec §18). The Meta adapter itself is Phase 2, so this route currently
 * stops with a typed "not configured" error instead of pretending to publish.
 */
export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const user = await requireUser();
    rateLimit(`publications:create:${user.id}`, 10);

    const body = bodySchema.parse(await request.json());

    const workflow = await prisma.workflow.findUnique({
      where: { id: body.workflowId },
      include: { publications: true },
    });
    if (!workflow) throw new HttpError(404, 'Workflow not found.');
    assertWorkspace(user, workflow.workspaceId);

    if (
      workflow.status !== WorkflowStatus.APPROVED &&
      workflow.status !== WorkflowStatus.SCHEDULED
    ) {
      throw new HttpError(
        409,
        'This Reel has not been approved. Publication requires an explicit human approval.',
      );
    }

    const key = publicationKey(workflow.id, body.platform);
    const existing = workflow.publications.find((p) => p.idempotencyKey === key);

    if (existing?.status === PublicationStatus.PUBLISHED) {
      return ok({ ...existing, deduplicated: true });
    }

    const publication =
      existing ??
      (await prisma.publication.create({
        data: {
          workflowId: workflow.id,
          platform: body.platform,
          caption: workflow.caption ?? '',
          idempotencyKey: key,
          status: PublicationStatus.PENDING,
        },
      }));

    try {
      const publisher = getInstagramPublisher();
      const result = await publisher.publishReel({
        videoUrl: '',
        caption: publication.caption,
        idempotencyKey: key,
      });

      const updated = await prisma.publication.update({
        where: { id: publication.id },
        data: {
          status:
            result.status === 'PUBLISHED'
              ? PublicationStatus.PUBLISHED
              : PublicationStatus.IN_PROGRESS,
          externalId: result.externalId,
          permalink: result.permalink,
          publishedAt: result.status === 'PUBLISHED' ? new Date() : null,
        },
      });

      if (result.status === 'PUBLISHED') {
        await prisma.workflow.update({
          where: { id: workflow.id },
          data: { status: WorkflowStatus.PUBLISHED },
        });
      }

      return ok(updated, 201);
    } catch (error) {
      if (error instanceof PublisherNotConfiguredError) {
        await prisma.publication.update({
          where: { id: publication.id },
          data: { status: PublicationStatus.FAILED, error: error.message },
        });
        throw new HttpError(501, error.message);
      }
      throw error;
    }
  } catch (error) {
    return fail(error);
  }
}
