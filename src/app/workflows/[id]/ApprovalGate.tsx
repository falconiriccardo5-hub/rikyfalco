'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import type { WorkflowStatus } from '@prisma/client';

interface Props {
  workflowId: string;
  status: WorkflowStatus;
  caption: string | null;
  cta: string | null;
  publishAt: string | null;
  actualCost: number;
  shotIds: string[];
  allShotsPassed: boolean;
}

/**
 * The human approval gate (spec §15). Nothing here publishes: APPROVE only
 * marks the Reel approved (or scheduled), and the publisher is Phase 2.
 */
export function ApprovalGate({
  workflowId,
  status,
  caption,
  cta,
  publishAt,
  actualCost,
  shotIds,
  allShotsPassed,
}: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notes, setNotes] = useState('');
  const [editing, setEditing] = useState(false);
  const [draftCaption, setDraftCaption] = useState(caption ?? '');

  const atGate = status === 'AWAITING_APPROVAL';

  async function post(path: string, body: unknown, action: string) {
    setBusy(action);
    setError(null);
    try {
      const response = await fetch(path, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error?.message ?? 'Request failed.');
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="panel p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-sm font-medium text-neutral-300">Approval gate</h2>
        {!atGate && (
          <p className="text-xs text-muted">
            {status === 'APPROVED' || status === 'SCHEDULED'
              ? 'Approved. Publishing is a Phase 2 capability.'
              : `Not at the gate yet (${status.replace(/_/g, ' ').toLowerCase()}).`}
          </p>
        )}
      </div>

      <dl className="mt-4 grid gap-4 sm:grid-cols-3">
        <div>
          <dt className="text-[11px] uppercase tracking-wider text-muted">CTA</dt>
          <dd className="mt-0.5 text-sm text-neutral-300">{cta ?? '—'}</dd>
        </div>
        <div>
          <dt className="text-[11px] uppercase tracking-wider text-muted">Publish date</dt>
          <dd className="mt-0.5 text-sm text-neutral-300">
            {publishAt ? new Date(publishAt).toLocaleString() : 'Not scheduled'}
          </dd>
        </div>
        <div>
          <dt className="text-[11px] uppercase tracking-wider text-muted">Cost</dt>
          <dd className="mt-0.5 text-sm tabular-nums text-neutral-300">
            ${actualCost.toFixed(2)}
          </dd>
        </div>
      </dl>

      <div className="mt-4">
        <p className="text-[11px] uppercase tracking-wider text-muted">Caption</p>
        {editing ? (
          <textarea
            rows={6}
            className="field mt-1.5 resize-y"
            value={draftCaption}
            onChange={(e) => setDraftCaption(e.target.value)}
          />
        ) : (
          <p className="mt-1.5 whitespace-pre-wrap text-sm text-neutral-300">
            {caption ?? 'No caption generated yet.'}
          </p>
        )}
      </div>

      {atGate && (
        <div className="mt-4">
          <label className="label" htmlFor="notes">
            Notes (optional)
          </label>
          <input
            id="notes"
            className="field"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Why you approved or rejected"
          />
        </div>
      )}

      {error && <p className="mt-4 text-sm text-red-300">{error}</p>}

      {!allShotsPassed && atGate && (
        <p className="mt-4 text-sm text-amber-300">
          Some shots have not passed QC. Regenerate them before approving.
        </p>
      )}

      <div className="mt-5 flex flex-wrap gap-3">
        <button
          type="button"
          className="btn btn-primary"
          disabled={!atGate || !allShotsPassed || busy !== null}
          onClick={() => post(`/api/workflows/${workflowId}/approve`, { notes }, 'approve')}
        >
          {busy === 'approve' ? 'Approving…' : 'APPROVE'}
        </button>

        <button
          type="button"
          className="btn"
          disabled={busy !== null || shotIds.length === 0}
          onClick={async () => {
            setBusy('regenerate');
            setError(null);
            try {
              // Regenerate only the shots QC rejected, never the whole Reel.
              for (const shotId of shotIds) {
                await fetch(`/api/shots/${shotId}/regenerate`, { method: 'POST' });
              }
              router.refresh();
            } catch (err) {
              setError((err as Error).message);
            } finally {
              setBusy(null);
            }
          }}
        >
          {busy === 'regenerate' ? 'Queueing…' : 'REGENERATE'}
        </button>

        <button type="button" className="btn" onClick={() => setEditing((v) => !v)}>
          {editing ? 'DONE EDITING' : 'EDIT'}
        </button>

        <button
          type="button"
          className="btn btn-danger"
          disabled={!atGate || busy !== null}
          onClick={() => post(`/api/workflows/${workflowId}/reject`, { reason: notes }, 'reject')}
        >
          {busy === 'reject' ? 'Rejecting…' : 'REJECT'}
        </button>
      </div>
    </div>
  );
}
