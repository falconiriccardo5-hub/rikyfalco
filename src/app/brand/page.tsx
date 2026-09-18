import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[11px] uppercase tracking-wider text-muted">{label}</dt>
      <dd className="mt-0.5 text-sm text-neutral-300">{value || '—'}</dd>
    </div>
  );
}

export default async function BrandPage() {
  const brands = await prisma.brandProfile.findMany({ orderBy: { isDefault: 'desc' } });

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Brand</h1>
        <p className="mt-1 text-sm text-muted">
          Brand memory: every agent reads this before writing a word.
        </p>
      </header>

      {brands.length === 0 && (
        <p className="panel p-5 text-sm text-muted">No brand profile. Run <code>npm run db:seed</code>.</p>
      )}

      {brands.map((brand) => (
        <section key={brand.id} className="panel p-5">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-medium">{brand.brandName}</h2>
            {brand.isDefault && <span className="chip border-accent/50 bg-accent/10 text-accent">default</span>}
          </div>
          <dl className="mt-4 grid gap-x-8 gap-y-4 sm:grid-cols-2">
            <Row label="Niche" value={brand.niche} />
            <Row label="Positioning" value={brand.positioning} />
            <Row label="Primary audience" value={brand.primaryAudience} />
            <Row label="Secondary audience" value={brand.secondaryAudience ?? ''} />
            <Row label="Tone" value={brand.tone} />
            <Row label="Visual style" value={brand.visualStyle} />
            <Row label="Colors" value={brand.colors.join(', ')} />
            <Row label="Fonts" value={brand.fonts.join(', ')} />
            <Row label="Forbidden styles" value={brand.forbiddenStyles.join(', ')} />
            <Row label="CTA options" value={brand.ctaOptions.join(' | ')} />
            <Row label="Recurring keywords" value={brand.keywords.join(', ')} />
            <Row label="Preferred duration" value={`${brand.preferredDuration}s`} />
            <Row label="Preferred formats" value={brand.preferredFormats.join(', ')} />
          </dl>
        </section>
      ))}
    </div>
  );
}
