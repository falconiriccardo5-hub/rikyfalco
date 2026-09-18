import Link from 'next/link';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

export default async function AssetsPage() {
  const assets = await prisma.asset.findMany({
    orderBy: { createdAt: 'desc' },
    take: 60,
    include: { shot: { select: { workflowId: true, orderIndex: true } } },
  });

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Assets</h1>
        <p className="mt-1 text-sm text-muted">
          Stored in our own bucket and served only through short-lived signed URLs.
        </p>
      </header>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {assets.length === 0 && <p className="panel p-5 text-sm text-muted">No assets yet.</p>}
        {assets.map((asset) => (
          <div key={asset.id} className="panel p-4">
            <p className="text-xs uppercase tracking-wider text-muted">{asset.kind}</p>
            <p className="mt-1 truncate font-mono text-xs text-neutral-400">{asset.storageKey}</p>
            <p className="mt-2 text-xs text-muted">
              {asset.width ?? '?'}×{asset.height ?? '?'} · {asset.durationSec?.toFixed(1) ?? '?'}s
            </p>
            {asset.shot && (
              <Link href={`/workflows/${asset.shot.workflowId}`} className="mt-2 inline-block text-xs text-accent hover:underline">
                open workflow →
              </Link>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
