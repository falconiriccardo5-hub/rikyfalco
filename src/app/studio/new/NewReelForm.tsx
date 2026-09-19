'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

interface BrandOption {
  id: string;
  brandName: string;
  ctaOptions: string[];
  preferredDuration: number;
}

interface Estimate {
  estimatedCostUsd: number;
  shots: number;
}

const EXAMPLE_BRIEF =
  'Crea un Reel di 20 secondi per donne 30-50 sul perché fare troppo cardio non è sempre la ' +
  'soluzione per migliorare la composizione corporea. Voglio un tono cinematico, premium e una ' +
  'CTA finale: scrivi DIAFRAMMA.';

export function NewReelForm({ brands }: { brands: BrandOption[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState<false | 'estimate' | 'generate'>(false);
  const [error, setError] = useState<string | null>(null);
  const [estimate, setEstimate] = useState<Estimate | null>(null);
  const [workflowId, setWorkflowId] = useState<string | null>(null);

  const [form, setForm] = useState({
    title: '',
    brief: '',
    brandProfileId: brands[0]?.id ?? '',
    target: '',
    goal: '',
    durationSec: brands[0]?.preferredDuration ?? 20,
    style: '',
    cta: '',
    aspectRatio: '9:16',
    referenceMedia: '',
    maxBudgetUsd: 2,
    publishAt: '',
  });

  function set<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function ensureWorkflow(): Promise<string> {
    if (workflowId) return workflowId;

    const response = await fetch('/api/workflows', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: form.title || form.brief.slice(0, 60),
        brief: form.brief,
        brandProfileId: form.brandProfileId || undefined,
        target: form.target || undefined,
        goal: form.goal || undefined,
        durationSec: Number(form.durationSec),
        style: form.style || undefined,
        cta: form.cta || undefined,
        aspectRatio: form.aspectRatio,
        referenceMedia: form.referenceMedia
          .split(/[\s,]+/)
          .map((url) => url.trim())
          .filter(Boolean),
        maxBudgetUsd: Number(form.maxBudgetUsd),
        publishAt: form.publishAt ? new Date(form.publishAt).toISOString() : undefined,
      }),
    });

    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error?.message ?? 'Could not create the workflow.');
    setWorkflowId(payload.data.id);
    return payload.data.id as string;
  }

  /** Price the Reel before spending anything (spec §8). */
  async function onEstimate() {
    setBusy('estimate');
    setError(null);
    try {
      const id = await ensureWorkflow();
      const response = await fetch(`/api/workflows/${id}/run`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ estimateOnly: true }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error?.message ?? 'Estimation failed.');
      setEstimate({
        estimatedCostUsd: payload.data.estimatedCostUsd,
        shots: payload.data.shots,
      });
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function onGenerate() {
    setBusy('generate');
    setError(null);
    try {
      const id = await ensureWorkflow();
      const response = await fetch(`/api/workflows/${id}/run`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ estimateOnly: false }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error?.message ?? 'Could not start generation.');
      router.push(`/workflows/${id}`);
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  }

  const overBudget = estimate ? estimate.estimatedCostUsd > Number(form.maxBudgetUsd) : false;
  const ready = form.brief.trim().length >= 20;

  return (
    <div className="space-y-5">
      <div className="panel space-y-5 p-5">
        <div>
          <label className="label" htmlFor="title">
            Title
          </label>
          <input
            id="title"
            className="field"
            value={form.title}
            onChange={(e) => set('title', e.target.value)}
            placeholder="Cardio e ricomposizione corporea"
          />
        </div>

        <div>
          <div className="flex items-center justify-between">
            <label className="label" htmlFor="brief">
              Brief
            </label>
            <button
              type="button"
              className="mb-1.5 text-[11px] text-accent hover:underline"
              onClick={() => set('brief', EXAMPLE_BRIEF)}
            >
              use the example
            </button>
          </div>
          <textarea
            id="brief"
            rows={5}
            className="field resize-y"
            value={form.brief}
            onChange={(e) => set('brief', e.target.value)}
            placeholder={EXAMPLE_BRIEF}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="brand">
              Brand profile
            </label>
            <select
              id="brand"
              className="field"
              value={form.brandProfileId}
              onChange={(e) => set('brandProfileId', e.target.value)}
            >
              {brands.map((brand) => (
                <option key={brand.id} value={brand.id}>
                  {brand.brandName}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="target">
              Target (optional override)
            </label>
            <input
              id="target"
              className="field"
              value={form.target}
              onChange={(e) => set('target', e.target.value)}
              placeholder="Donne 30-50"
            />
          </div>
          <div>
            <label className="label" htmlFor="goal">
              Goal
            </label>
            <input
              id="goal"
              className="field"
              value={form.goal}
              onChange={(e) => set('goal', e.target.value)}
              placeholder="DM qualificati"
            />
          </div>
          <div>
            <label className="label" htmlFor="duration">
              Duration (seconds)
            </label>
            <input
              id="duration"
              type="number"
              min={5}
              max={90}
              className="field"
              value={form.durationSec}
              onChange={(e) => set('durationSec', Number(e.target.value))}
            />
          </div>
          <div>
            <label className="label" htmlFor="style">
              Style
            </label>
            <input
              id="style"
              className="field"
              value={form.style}
              onChange={(e) => set('style', e.target.value)}
              placeholder="Cinematic, premium"
            />
          </div>
          <div>
            <label className="label" htmlFor="cta">
              CTA
            </label>
            <input
              id="cta"
              className="field"
              value={form.cta}
              onChange={(e) => set('cta', e.target.value)}
              placeholder="Scrivi DIAFRAMMA"
            />
          </div>
          <div>
            <label className="label" htmlFor="ratio">
              Aspect ratio
            </label>
            <select
              id="ratio"
              className="field"
              value={form.aspectRatio}
              onChange={(e) => set('aspectRatio', e.target.value)}
            >
              <option value="9:16">9:16 (Reel)</option>
              <option value="1:1">1:1</option>
              <option value="16:9">16:9</option>
            </select>
          </div>
          <div>
            <label className="label" htmlFor="budget">
              Budget (USD)
            </label>
            <input
              id="budget"
              type="number"
              step="0.25"
              min={0.25}
              className="field"
              value={form.maxBudgetUsd}
              onChange={(e) => set('maxBudgetUsd', Number(e.target.value))}
            />
          </div>
          <div>
            <label className="label" htmlFor="publishAt">
              Publishing date (optional)
            </label>
            <input
              id="publishAt"
              type="datetime-local"
              className="field"
              value={form.publishAt}
              onChange={(e) => set('publishAt', e.target.value)}
            />
          </div>
          <div>
            <label className="label" htmlFor="refs">
              Reference media URLs
            </label>
            <input
              id="refs"
              className="field"
              value={form.referenceMedia}
              onChange={(e) => set('referenceMedia', e.target.value)}
              placeholder="https://… (comma separated)"
            />
          </div>
        </div>
      </div>

      {estimate && (
        <div className={`panel p-5 ${overBudget ? 'border-danger/40' : 'border-accent/40'}`}>
          <p className="text-xs uppercase tracking-wider text-muted">Estimated generation cost</p>
          <div className="mt-2 flex flex-wrap items-baseline gap-x-6 gap-y-1">
            <p className="text-2xl font-semibold tabular-nums">
              ${estimate.estimatedCostUsd.toFixed(2)}
            </p>
            <p className="text-sm text-muted">
              Budget: ${Number(form.maxBudgetUsd).toFixed(2)} · {estimate.shots} shots
            </p>
          </div>
          {overBudget && (
            <p className="mt-3 text-sm text-danger">
              Over budget. Raise the budget or shorten the Reel — generation will not start.
            </p>
          )}
        </div>
      )}

      {error && (
        <div className="panel border-danger/40 p-4 text-sm text-danger">{error}</div>
      )}

      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          className="btn"
          onClick={onEstimate}
          disabled={!ready || busy !== false}
        >
          {busy === 'estimate' ? 'Estimating…' : 'Estimate cost'}
        </button>
        <button
          type="button"
          className="btn btn-primary"
          onClick={onGenerate}
          disabled={!ready || busy !== false || overBudget}
        >
          {busy === 'generate' ? 'Starting…' : 'GENERATE'}
        </button>
      </div>
    </div>
  );
}
