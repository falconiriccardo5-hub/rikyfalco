import { prisma } from '@/lib/db';
import { fail, ok } from '@/lib/api';
import { requireUser, assertWorkspace } from '@/lib/security/auth';
import { costSnapshot } from '@/lib/cost';
import { assetUrl } from '@/lib/storage';
import { HttpError } from '@/lib/errors';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  try {
    const user = await requireUser();
    const { id } = await params;

    const workflow = await prisma.workflow.findUnique({
      where: { id },
      include: {
        brandProfile: true,
        agentRuns: { orderBy: { startedAt: 'asc' } },
        approvals: { orderBy: { createdAt: 'desc' } },
        publications: true,
        costEvents: { orderBy: { createdAt: 'asc' } },
        shots: {
          orderBy: { orderIndex: 'asc' },
          include: {
            assets: { orderBy: { createdAt: 'desc' } },
            generationJobs: { orderBy: { createdAt: 'asc' } },
          },
        },
      },
    });

    if (!workflow) throw new HttpError(404, 'Workflow not found.');
    assertWorkspace(user, workflow.workspaceId);

    // Media is only ever handed out behind a short-lived signed URL.
    const shots = await Promise.all(
      workflow.shots.map(async (shot) => ({
        ...shot,
        assets: await Promise.all(
          shot.assets.map(async (asset) => {
            try {
              return { ...asset, url: await assetUrl(asset.storageKey) };
            } catch (error) {
              logger.warn('Could not sign an asset URL', { assetId: asset.id, error: (error as Error).message });
              return { ...asset, url: null };
            }
          }),
        ),
      })),
    );

    return ok({ ...workflow, shots, cost: await costSnapshot(workflow.id) });
  } catch (error) {
    return fail(error);
  }
}
