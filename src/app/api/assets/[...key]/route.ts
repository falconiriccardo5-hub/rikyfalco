import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { drivers } from '@/lib/drivers';
import { readLocalAsset } from '@/lib/storage/local';
import { requireUser, assertWorkspace } from '@/lib/security/auth';
import { fail } from '@/lib/api';
import { HttpError } from '@/lib/errors';

export const dynamic = 'force-dynamic';

type Params = { params: Promise<{ key: string[] }> };

/**
 * Serve an asset held by the local storage driver.
 *
 * Authorization is enforced here the way signed URLs enforce it for S3: the
 * asset must exist in the database and belong to the caller's workspace.
 */
export async function GET(_request: Request, { params }: Params) {
  try {
    if (drivers().storage !== 'local') {
      throw new HttpError(404, 'Local asset serving is disabled; assets are served from S3.');
    }

    const user = await requireUser();
    const { key } = await params;
    const storageKey = key.map(decodeURIComponent).join('/');

    const asset = await prisma.asset.findFirst({
      where: { storageKey },
      include: { shot: { include: { workflow: { select: { workspaceId: true } } } } },
    });
    if (!asset) throw new HttpError(404, 'Asset not found.');
    if (asset.shot) assertWorkspace(user, asset.shot.workflow.workspaceId);

    const { body, mimeType } = await readLocalAsset(storageKey);

    return new NextResponse(new Uint8Array(body), {
      headers: {
        'Content-Type': mimeType,
        'Content-Length': String(body.byteLength),
        'Cache-Control': 'private, max-age=300',
        'Content-Security-Policy': "default-src 'none'; style-src 'unsafe-inline'; sandbox",
      },
    });
  } catch (error) {
    return fail(error);
  }
}
