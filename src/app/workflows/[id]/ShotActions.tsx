'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

/**
 * Per-shot regeneration. This is the UI for the pipeline's core QC promise:
 * a bad shot is re-rendered on its own, never the whole Reel.
 */
export function ShotActions({
  shotId,
  disabled,
  regenCount,
}: {
  shotId: string;
  disabled: boolean;
  regenCount: number;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function regenerate() {
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(`/api/shots/${shotId}/regenerate`, { method: 'POST' });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error?.message ?? 'Could not queue the shot.');
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-wrap items-center justify-end gap-2">
      {regenCount > 0 && (
        <span className="text-[11px] text-muted">
          regenerated {regenCount}×
        </span>
      )}
      {error && <span className="text-[11px] text-danger">{error}</span>}
      <button
        type="button"
        className="btn px-3 py-1 text-xs"
        onClick={regenerate}
        disabled={disabled || busy}
        title={disabled ? 'A published Reel cannot be regenerated.' : 'Regenerate only this shot'}
      >
        {busy ? 'Queueing…' : 'Regenerate shot'}
      </button>
    </div>
  );
}
