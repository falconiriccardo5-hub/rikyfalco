import { selectableModels } from '@/lib/higgsfield/catalog';

export const dynamic = 'force-dynamic';

/** Configuration is read-only here: secrets never leave the server. */
export default function SettingsPage() {
  const models = selectableModels();

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="mt-1 text-sm text-muted">
          Credentials live in server environment variables and are never exposed to the browser.
          Live dependency state is at <code className="text-accent">/api/health</code>.
        </p>
      </header>

      <section className="panel p-5">
        <h2 className="text-sm font-medium text-neutral-300">Higgsfield model catalog</h2>
        <p className="mt-1 text-xs text-muted">
          Only endpoints verified against the official SDK are selectable. Point
          <code className="mx-1 text-accent">HF_CATALOG_PATH</code> at an updated JSON file to add
          models without a redeploy.
        </p>
        <ul className="mt-4 divide-y divide-line">
          {models.map((model) => (
            <li key={model.id} className="flex flex-wrap items-center gap-3 py-3 text-sm">
              <span className="w-48 shrink-0 font-mono text-xs text-accent">{model.id}</span>
              <span className="min-w-0 flex-1 text-muted">{model.endpoint}</span>
              <span className="chip border-line bg-raised text-neutral-400">{model.capability}</span>
              <span className="tabular-nums text-xs text-muted">
                ~${model.estimatedCostUsd.toFixed(2)}
              </span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
