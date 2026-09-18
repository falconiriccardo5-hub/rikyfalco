import type { V2Response, V2RequestStatus } from '@higgsfield/client/v2';
import { env, higgsfieldCredentials } from '../env';
import { OrchestratorError } from '../errors';
import { logger } from '../logger';

/**
 * Higgsfield HTTP adapter.
 *
 * Contract (base URL, auth header, request body shape, status endpoint and
 * response payload) is taken verbatim from the official @higgsfield/client
 * SDK v0.2.6 — see dist/v2/client.js and dist/v2/types.d.ts. We drive the
 * transport ourselves rather than calling `subscribe()` because the SDK
 * retries the POST with backoff, and a blind retry of a submission whose
 * outcome is unknown can bill a second generation (spec §7).
 */

export type { V2Response, V2RequestStatus };

export interface SubmitArgs {
  endpoint: string;
  input: Record<string, unknown>;
  /** Forwarded as ?hf_webhook=<url>, exactly as the SDK does. */
  webhookUrl?: string;
}

export interface HiggsfieldClient {
  submit(args: SubmitArgs): Promise<V2Response>;
  getStatus(requestId: string): Promise<V2Response>;
  isConfigured(): boolean;
}

const TERMINAL: readonly V2RequestStatus[] = ['completed', 'failed', 'nsfw'];

export function isTerminal(status: V2RequestStatus): boolean {
  return TERMINAL.includes(status);
}

function authHeader(): string {
  const credentials = higgsfieldCredentials();
  if (!credentials) {
    throw new OrchestratorError(
      'AUTH_FAILED',
      'Higgsfield credentials missing. Set HF_CREDENTIALS="KEY_ID:KEY_SECRET" (or HF_API_KEY + HF_API_SECRET).',
    );
  }
  return `Key ${credentials}`;
}

async function request(path: string, init: RequestInit): Promise<V2Response> {
  const { HF_BASE_URL } = env();
  const url = `${HF_BASE_URL}${path.startsWith('/') ? path : `/${path}`}`;
  const response = await fetch(url, {
    ...init,
    headers: {
      Authorization: authHeader(),
      'Content-Type': 'application/json',
      ...(init.headers ?? {}),
    },
  });

  const body = await response.text();

  if (!response.ok) {
    // Never log the Authorization header or the raw credential.
    logger.error('Higgsfield API error', { path, status: response.status });
    if (response.status === 401) {
      throw new OrchestratorError('AUTH_FAILED', 'Higgsfield rejected the credentials (401).');
    }
    throw new OrchestratorError(
      'GENERATION_FAILED',
      `Higgsfield ${response.status} on ${path}: ${body.slice(0, 500)}`,
      { status: response.status },
    );
  }

  try {
    return JSON.parse(body) as V2Response;
  } catch {
    throw new OrchestratorError('GENERATION_FAILED', `Unparseable Higgsfield response on ${path}`);
  }
}

export function createHiggsfieldClient(): HiggsfieldClient {
  return {
    isConfigured: () => higgsfieldCredentials() !== null,

    async submit({ endpoint, input, webhookUrl }) {
      let path = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
      if (webhookUrl) {
        const separator = path.includes('?') ? '&' : '?';
        path = `${path}${separator}hf_webhook=${encodeURIComponent(webhookUrl)}`;
      }
      // Input is sent as the body directly — not wrapped in `params` (SDK v2).
      return request(path, { method: 'POST', body: JSON.stringify(input) });
    },

    async getStatus(requestId) {
      return request(`/requests/${requestId}/status`, { method: 'GET' });
    },
  };
}

export interface PollOptions {
  intervalMs?: number;
  maxMs?: number;
  signal?: AbortSignal;
  sleep?: (ms: number) => Promise<void>;
}

const defaultSleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/**
 * Poll an already-submitted request to a terminal state. Transient 5xx and
 * network faults keep the loop alive; anything else propagates. This is also
 * the recovery path after an unknown-outcome submission: once a request_id
 * exists, we read state rather than re-submitting.
 */
export async function pollUntilTerminal(
  client: HiggsfieldClient,
  requestId: string,
  options: PollOptions = {},
): Promise<V2Response> {
  const e = env();
  const intervalMs = options.intervalMs ?? e.HF_POLL_INTERVAL_MS;
  const maxMs = options.maxMs ?? e.HF_MAX_POLL_MS;
  const sleep = options.sleep ?? defaultSleep;
  const startedAt = Date.now();

  for (;;) {
    if (options.signal?.aborted) {
      throw new OrchestratorError('GENERATION_FAILED', 'Polling aborted', { requestId });
    }
    if (Date.now() - startedAt > maxMs) {
      throw new OrchestratorError(
        'GENERATION_TIMEOUT',
        `Higgsfield request ${requestId} did not reach a terminal state within ${maxMs}ms`,
        { requestId },
      );
    }

    try {
      const response = await client.getStatus(requestId);
      if (isTerminal(response.status)) return response;
    } catch (error) {
      // A network or transport fault is worth another read; a typed API error is
      // only retriable when the provider reported a 5xx. Anything else (401,
      // 4xx, a timeout we raised ourselves) must propagate, or the loop spins.
      const retriable = !(error instanceof OrchestratorError)
        ? true
        : error.code === 'GENERATION_FAILED' &&
          ((error.details as { status?: number } | undefined)?.status ?? 0) >= 500;
      if (!retriable) throw error;
      logger.warn('Transient error while polling Higgsfield; retrying', { requestId });
    }

    await sleep(intervalMs);
  }
}

/** Pull the primary media URL out of a completed response. */
export function resultUrl(response: V2Response): string | null {
  if (response.video?.url) return response.video.url;
  if (response.images?.length) return response.images[0].url;
  return null;
}
