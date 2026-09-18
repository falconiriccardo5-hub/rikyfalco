import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  createHiggsfieldClient,
  isTerminal,
  pollUntilTerminal,
  resultUrl,
  type HiggsfieldClient,
  type V2Response,
} from '@/lib/higgsfield/client';
import { resetEnvCache } from '@/lib/env';
import { OrchestratorError } from '@/lib/errors';

function response(partial: Partial<V2Response>): V2Response {
  return {
    status: 'queued',
    request_id: 'req-1',
    status_url: 'https://api.higgsfield.ai/requests/req-1/status',
    cancel_url: 'https://api.higgsfield.ai/requests/req-1/cancel',
    ...partial,
  };
}

beforeEach(() => {
  process.env.HF_CREDENTIALS = 'test-key-id:test-key-secret';
  resetEnvCache();
});

afterEach(() => {
  vi.restoreAllMocks();
  delete process.env.HF_CREDENTIALS;
  resetEnvCache();
});

describe('client contract', () => {
  it('posts the input as the body with the documented auth header', async () => {
    const fetchMock = vi.fn(async () =>
      new Response(JSON.stringify(response({ status: 'queued' })), { status: 200 }),
    );
    vi.stubGlobal('fetch', fetchMock);

    await createHiggsfieldClient().submit({
      endpoint: '/v1/image2video/dop',
      input: { model: 'dop-turbo', prompt: 'hello' },
    });

    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('https://api.higgsfield.ai/v1/image2video/dop');
    expect((init.headers as Record<string, string>).Authorization).toBe(
      'Key test-key-id:test-key-secret',
    );
    // Input is sent directly, never wrapped in `params`.
    expect(JSON.parse(init.body as string)).toEqual({ model: 'dop-turbo', prompt: 'hello' });
  });

  it('appends the webhook as a query parameter', async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify(response({})), { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);

    await createHiggsfieldClient().submit({
      endpoint: '/v1/text2image/soul',
      input: {},
      webhookUrl: 'https://app.example/hook',
    });

    expect((fetchMock.mock.calls[0] as unknown as [string])[0]).toBe(
      'https://api.higgsfield.ai/v1/text2image/soul?hf_webhook=https%3A%2F%2Fapp.example%2Fhook',
    );
  });

  it('reads status from /requests/{id}/status', async () => {
    const fetchMock = vi.fn(async () =>
      new Response(JSON.stringify(response({ status: 'completed' })), { status: 200 }),
    );
    vi.stubGlobal('fetch', fetchMock);

    await createHiggsfieldClient().getStatus('abc-123');
    expect((fetchMock.mock.calls[0] as unknown as [string])[0]).toBe('https://api.higgsfield.ai/requests/abc-123/status');
  });

  it('maps a 401 to AUTH_FAILED rather than a generic failure', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('nope', { status: 401 })));

    await expect(
      createHiggsfieldClient().submit({ endpoint: '/v1/text2image/soul', input: {} }),
    ).rejects.toMatchObject({ code: 'AUTH_FAILED' });
  });

  it('refuses to call the API without credentials', async () => {
    delete process.env.HF_CREDENTIALS;
    resetEnvCache();
    vi.stubGlobal('fetch', vi.fn());

    await expect(
      createHiggsfieldClient().submit({ endpoint: '/v1/text2image/soul', input: {} }),
    ).rejects.toThrow(OrchestratorError);
  });
});

describe('polling', () => {
  const noSleep = async () => {};

  it('stops at the first terminal status', async () => {
    const statuses: V2Response[] = [
      response({ status: 'queued' }),
      response({ status: 'in_progress' }),
      response({ status: 'completed', video: { url: 'https://cdn/v.mp4' } }),
    ];
    const getStatus = vi.fn(async () => statuses.shift()!);
    const client = { getStatus } as unknown as HiggsfieldClient;

    const result = await pollUntilTerminal(client, 'req-1', { intervalMs: 0, sleep: noSleep });

    expect(result.status).toBe('completed');
    expect(getStatus).toHaveBeenCalledTimes(3);
    expect(resultUrl(result)).toBe('https://cdn/v.mp4');
  });

  it('keeps polling through a transient server error', async () => {
    let call = 0;
    const getStatus = vi.fn(async () => {
      call += 1;
      if (call === 1) throw new OrchestratorError('GENERATION_FAILED', 'boom', { status: 502 });
      return response({ status: 'completed' });
    });

    const result = await pollUntilTerminal({ getStatus } as unknown as HiggsfieldClient, 'req-1', {
      intervalMs: 0,
      sleep: noSleep,
    });

    expect(result.status).toBe('completed');
    expect(getStatus).toHaveBeenCalledTimes(2);
  });

  it('does not swallow a client error', async () => {
    const getStatus = vi.fn(async () => {
      throw new OrchestratorError('AUTH_FAILED', 'bad key');
    });

    await expect(
      pollUntilTerminal({ getStatus } as unknown as HiggsfieldClient, 'req-1', {
        intervalMs: 0,
        sleep: noSleep,
      }),
    ).rejects.toMatchObject({ code: 'AUTH_FAILED' });
  });

  it('times out with GENERATION_TIMEOUT instead of looping forever', async () => {
    const getStatus = vi.fn(async () => response({ status: 'in_progress' }));
    let now = 0;
    vi.spyOn(Date, 'now').mockImplementation(() => (now += 5_000));

    await expect(
      pollUntilTerminal({ getStatus } as unknown as HiggsfieldClient, 'req-1', {
        intervalMs: 0,
        maxMs: 10_000,
        sleep: noSleep,
      }),
    ).rejects.toMatchObject({ code: 'GENERATION_TIMEOUT' });
  });

  it('treats nsfw and failed as terminal', () => {
    expect(isTerminal('nsfw')).toBe(true);
    expect(isTerminal('failed')).toBe(true);
    expect(isTerminal('queued')).toBe(false);
  });
});
