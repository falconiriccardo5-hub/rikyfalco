import { prisma } from '@/lib/db';
import { fail, ok } from '@/lib/api';
import { requireUser, assertWorkspace } from '@/lib/security/auth';
import { HttpError } from '@/lib/errors';

export const dynamic = 'force-dynamic';

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  try {
    const user = await requireUser();
    const { id } = await params;

    const publication = await prisma.publication.findUnique({
      where: { id },
      include: { workflow: { select: { workspaceId: true, title: true, status: true } } },
    });
    if (!publication) throw new HttpError(404, 'Publication not found.');
    assertWorkspace(user, publication.workflow.workspaceId);

    return ok(publication);
  } catch (error) {
    return fail(error);
  }
}
