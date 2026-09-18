import { prisma } from '@/lib/db';
import { NewReelForm } from './NewReelForm';

export const dynamic = 'force-dynamic';

export default async function NewReelPage() {
  const brands = await prisma.brandProfile.findMany({
    orderBy: [{ isDefault: 'desc' }, { brandName: 'asc' }],
    select: { id: true, brandName: true, ctaOptions: true, preferredDuration: true },
  });

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">New Reel</h1>
        <p className="mt-1 text-sm text-muted">
          Write the brief. The agents handle strategy, script, storyboard, routing and QC — you keep
          the final word.
        </p>
      </header>
      <NewReelForm brands={brands} />
    </div>
  );
}
