import { createHmac, timingSafeEqual } from 'node:crypto';
import { env } from '../env';
import { HttpError } from '../errors';

interface Bucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();

/**
 * Fixed-window limiter, in-process. Good enough for a single web instance;
 * move the counter to Redis before scaling the app horizontally.
 */
export function rateLimit(key: string, limitPerMinute = env().RATE_LIMIT_PER_MINUTE): void {
  const now = Date.now();
  const bucket = buckets.get(key);

  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + 60_000 });
    return;
  }

  bucket.count += 1;
  if (bucket.count > limitPerMinute) {
    throw new HttpError(429, 'Too many requests. Try again shortly.');
  }
}

export function resetRateLimits(): void {
  buckets.clear();
}

/**
 * Verify a provider webhook's HMAC-SHA256 signature in constant time. An
 * unsigned or mis-signed delivery is rejected before its body is parsed.
 */
export function verifyWebhookSignature(
  rawBody: string,
  signature: string | null,
  secret: string | undefined,
): boolean {
  if (!secret || !signature) return false;
  const expected = createHmac('sha256', secret).update(rawBody).digest('hex');
  const provided = signature.replace(/^sha256=/, '');
  const a = Buffer.from(expected, 'utf8');
  const b = Buffer.from(provided, 'utf8');
  return a.length === b.length && timingSafeEqual(a, b);
}

/** Same-origin check for state-changing requests (CSRF defence). */
export function assertSameOrigin(request: Request): void {
  const origin = request.headers.get('origin');
  if (!origin) return; // Non-browser client (worker, curl, server-to-server).
  const host = request.headers.get('host');
  if (!host) throw new HttpError(400, 'Missing Host header.');
  let originHost: string;
  try {
    originHost = new URL(origin).host;
  } catch {
    throw new HttpError(403, 'Invalid Origin header.');
  }
  if (originHost !== host) throw new HttpError(403, 'Cross-origin request refused.');
}
