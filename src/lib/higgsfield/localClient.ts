import { randomUUID } from 'node:crypto';
import type { HiggsfieldClient, V2Response } from './client';

/**
 * Local generation driver.
 *
 * Implements the same client interface as the real Higgsfield adapter without
 * any network call, so the pipeline, the job records, the request-id
 * reconciliation and the dashboard all behave exactly as they will in
 * production — only no media is bought and nothing leaves the machine.
 *
 * Requests complete after a couple of status reads rather than instantly, so
 * the polling path is genuinely exercised instead of short-circuited.
 */

const POLLS_BEFORE_COMPLETION = 2;

interface PendingRequest {
  polls: number;
  kind: 'image' | 'video';
}

export function createLocalGenerationClient(): HiggsfieldClient {
  const pending = new Map<string, PendingRequest>();

  const envelope = (requestId: string, status: V2Response['status']): V2Response => ({
    status,
    request_id: requestId,
    status_url: `local://requests/${requestId}/status`,
    cancel_url: `local://requests/${requestId}/cancel`,
  });

  return {
    isConfigured: () => true,

    async submit({ endpoint, input }) {
      const requestId = randomUUID();
      const kind = endpoint.includes('text2image') ? 'image' : 'video';
      pending.set(requestId, { polls: 0, kind });

      // Mirror the provider's own moderation behaviour on obviously unsafe input,
      // so the nsfw branch is reachable without calling anyone.
      const prompt = String(input.prompt ?? '');
      if (/\b(nude|nsfw|explicit)\b/i.test(prompt)) {
        pending.delete(requestId);
        return envelope(requestId, 'nsfw');
      }

      return envelope(requestId, 'queued');
    },

    async getStatus(requestId) {
      const request = pending.get(requestId);
      if (!request) {
        // Unknown id: treat as already finished, the same way a late read would.
        return { ...envelope(requestId, 'completed'), video: { url: syntheticUrl(requestId, 'video') } };
      }

      request.polls += 1;
      if (request.polls < POLLS_BEFORE_COMPLETION) {
        return envelope(requestId, 'in_progress');
      }

      pending.delete(requestId);
      const url = syntheticUrl(requestId, request.kind);
      return request.kind === 'image'
        ? { ...envelope(requestId, 'completed'), images: [{ url }] }
        : { ...envelope(requestId, 'completed'), video: { url } };
    },
  };
}

/**
 * A `local:` URL. The storage layer recognises the scheme and synthesises a
 * placeholder asset instead of downloading anything.
 */
export function syntheticUrl(requestId: string, kind: 'image' | 'video'): string {
  return `local:${kind}/${requestId}`;
}

export function isSyntheticUrl(url: string): boolean {
  return url.startsWith('local:');
}
