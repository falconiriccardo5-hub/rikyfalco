import Link from 'next/link';
import { prisma } from '@/lib/db';
import { assetUrl } from '@/lib/storage';

export const dynamic = 'force-dynamic';

export default async function AssetsPage() {
  const rows = await prisma.asset.findMany({
    orderBy: { createdAt: 'desc' },
    take: 60,
    include: {
      shot: {
        select: {
          orderIndex: true,
          sceneId: true,
          workflowId: true,
          workflow: { select: { title: true } },
        },
      },
    },
  });

  const assets = await Promise.all(
    rows.map(async (asset) => {
      let url: string | null = null;
      try {
        url = await assetUrl(asset.storageKey);
      } catch {
        url = null; // Storage unavailable — the page still lists the record.
      }
      return { asset, url };
    }),
  );

  const totalBytes = rows.reduce((sum, asset) => sum + (asset.bytes ?? 0), 0);

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Assets</h1>
        <p className="mt-1 text-sm text-muted">
          {rows.length} asset{rows.length === 1 ? '' : 's'} ·{' '}
          {(totalBytes / 1024).toFixed(0)} KB · served only to their own workspace.
        </p>
      </header>

      {assets.length === 0 && (
        <p className="panel p-5 text-sm text-muted">
          No assets yet. Generate a Reel from the{' '}
          <Link href="/studio/new" className="text-accent hover:underline">
            Content Studio
          </Link>
          .
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {assets.map(({ asset, url }) => (
          <div key={asset.id} className="panel overflow-hidden">
            <div className="aspect-[9/16] border-b border-line bg-ink">
              {url && asset.mimeType.startsWith('video/') ? (
                <video src={url} controls className="h-full w-full object-cover" />
              ) : url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={url}
                  alt={`Asset for scene ${asset.shot?.sceneId ?? 'unknown'}`}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full items-center justify-center text-[11px] text-muted">
                  unavailable
                </div>
              )}
            </div>

            <div className="space-y-1.5 p-4">
              <div className="flex items-center justify-between gap-2">
                <span className="chip border-line bg-raised text-neutral-400">{asset.kind}</span>
                <span className="text-[11px] tabular-nums text-muted">
                  {asset.bytes ? `${(asset.bytes / 1024).toFixed(0)} KB` : '—'}
                </span>
              </div>
              <p className="text-xs text-muted">
                {asset.width ?? '?'}×{asset.height ?? '?'}
                {asset.durationSec ? ` · ${asset.durationSec.toFixed(1)}s` : ''} · {asset.mimeType}
              </p>
              {asset.shot && (
                <Link
                  href={`/workflows/${asset.shot.workflowId}#shot-${asset.shotId}`}
                  className="block truncate text-xs text-accent hover:underline"
                >
                  {asset.shot.workflow.title} · scene {asset.shot.sceneId}
                </Link>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
