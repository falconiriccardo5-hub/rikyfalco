import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { redact } from '@/lib/logger';
import {
  assertSameOrigin,
  rateLimit,
  resetRateLimits,
  verifyWebhookSignature,
} from '@/lib/security/rateLimit';
import { hashPassword, verifyPassword } from '@/lib/security/auth';
import { generationKey, publicationKey } from '@/lib/idempotency';
import { HttpError } from '@/lib/errors';
import { createHmac } from 'node:crypto';

beforeEach(() => resetRateLimits());
afterEach(() => resetRateLimits());

describe('redact', () => {
  it('strips credential-shaped keys at any depth', () => {
    const redacted = redact({
      ok: 'visible',
      apiKey: 'secret-value',
      nested: { authorization: 'Key abc:def', password: 'hunter2' },
    }) as Record<string, unknown>;

    expect(redacted.ok).toBe('visible');
    expect(redacted.apiKey).toBe('[REDACTED]');
    expect((redacted.nested as Record<string, unknown>).authorization).toBe('[REDACTED]');
  });

  it('masks an inline credential inside a free-text string', () => {
    expect(redact('failed with Key abc123:def456 attached')).toBe(
      'failed with Key [REDACTED] attached',
    );
  });
});

describe('rateLimit', () => {
  it('allows traffic up to the limit and refuses beyond it', () => {
    for (let i = 0; i < 3; i += 1) expect(() => rateLimit('user:1', 3)).not.toThrow();
    expect(() => rateLimit('user:1', 3)).toThrow(HttpError);
  });

  it('keys buckets independently', () => {
    rateLimit('user:a', 1);
    expect(() => rateLimit('user:b', 1)).not.toThrow();
  });
});

describe('verifyWebhookSignature', () => {
  const secret = 'whsec_test';
  const body = JSON.stringify({ request_id: 'req-1', status: 'completed' });
  const valid = createHmac('sha256', secret).update(body).digest('hex');

  it('accepts a correct signature, with or without the sha256= prefix', () => {
    expect(verifyWebhookSignature(body, valid, secret)).toBe(true);
    expect(verifyWebhookSignature(body, `sha256=${valid}`, secret)).toBe(true);
  });

  it('rejects a tampered body, a wrong secret, or a missing signature', () => {
    expect(verifyWebhookSignature(`${body} `, valid, secret)).toBe(false);
    expect(verifyWebhookSignature(body, valid, 'other-secret')).toBe(false);
    expect(verifyWebhookSignature(body, null, secret)).toBe(false);
    expect(verifyWebhookSignature(body, valid, undefined)).toBe(false);
  });
});

describe('assertSameOrigin', () => {
  it('allows a same-origin browser request and a server-to-server call', () => {
    expect(() =>
      assertSameOrigin(
        new Request('https://app.example/api/x', {
          headers: { origin: 'https://app.example', host: 'app.example' },
        }),
      ),
    ).not.toThrow();

    expect(() => assertSameOrigin(new Request('https://app.example/api/x'))).not.toThrow();
  });

  it('refuses a cross-origin request', () => {
    expect(() =>
      assertSameOrigin(
        new Request('https://app.example/api/x', {
          headers: { origin: 'https://evil.example', host: 'app.example' },
        }),
      ),
    ).toThrow(HttpError);
  });
});

describe('passwords', () => {
  it('round-trips a password without storing it in the clear', () => {
    const stored = hashPassword('correct horse battery staple');
    expect(stored).not.toContain('correct horse');
    expect(verifyPassword('correct horse battery staple', stored)).toBe(true);
    expect(verifyPassword('wrong', stored)).toBe(false);
  });
});

describe('idempotency keys', () => {
  it('derives a stable key per generation attempt', () => {
    expect(generationKey('shot-1', 'video', 1)).toBe(generationKey('shot-1', 'video', 1));
    expect(generationKey('shot-1', 'video', 1)).not.toBe(generationKey('shot-1', 'video', 2));
    expect(generationKey('shot-1', 'video', 1)).not.toBe(generationKey('shot-1', 'image', 1));
  });

  it('gives one workflow exactly one publication key per platform', () => {
    expect(publicationKey('wf-1', 'instagram')).toBe(publicationKey('wf-1', 'instagram'));
    expect(publicationKey('wf-1', 'instagram')).not.toBe(publicationKey('wf-2', 'instagram'));
  });
});

describe('synthetic asset keys', () => {
  it('round-trips its descriptor so the placeholder survives a read-only filesystem', async () => {
    const { renderSyntheticAsset, isSyntheticKey } = await import('@/lib/storage/local');
    const descriptor = Buffer.from(
      JSON.stringify({ l: 'Scene scene-2', d: 'soul+dop', r: '9:16' }),
      'utf8',
    ).toString('base64url');

    const key = `synthetic/${descriptor}/abc.svg`;
    expect(isSyntheticKey(key)).toBe(true);

    const rendered = renderSyntheticAsset(key).body.toString('utf8');
    expect(rendered).toContain('SIMULATED SHOT');
    expect(rendered).toContain('Scene scene-2');
    expect(rendered).toContain('width="540" height="960"');
  });

  it('still renders a placeholder for a corrupt key instead of throwing', async () => {
    const { renderSyntheticAsset } = await import('@/lib/storage/local');
    expect(renderSyntheticAsset('synthetic/not-base64!!/x.svg').body.toString()).toContain(
      'SIMULATED SHOT',
    );
  });
});
