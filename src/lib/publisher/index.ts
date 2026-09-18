import { env } from '../env';
import { PublisherNotConfiguredError, type InstagramPublisher } from './types';

export * from './types';

/**
 * Phase 2 placeholder resolver. The Meta Graph API adapter is deliberately NOT
 * implemented in this phase: the pipeline stops at the approval gate, and the
 * only honest thing to return here is a clear, typed "not configured" error.
 *
 * Swapping in a real adapter is a one-line change in this factory.
 */
export function getInstagramPublisher(): InstagramPublisher {
  const e = env();
  const missing: string[] = [];
  if (!e.IG_USER_ID) missing.push('IG_USER_ID');
  if (!e.IG_ACCESS_TOKEN) missing.push('IG_ACCESS_TOKEN');
  missing.push('a Meta Graph API adapter implementation (Phase 2)');
  throw new PublisherNotConfiguredError(missing);
}

export function publisherConfigured(): boolean {
  const e = env();
  return Boolean(e.IG_USER_ID && e.IG_ACCESS_TOKEN);
}
