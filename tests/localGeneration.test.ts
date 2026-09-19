import { describe, expect, it } from 'vitest';
import { createLocalGenerationClient, isSyntheticUrl } from '@/lib/higgsfield/localClient';
import { pollUntilTerminal, resultUrl } from '@/lib/higgsfield/client';
import { placeholderSvg } from '@/lib/storage/local';

const noSleep = async () => {};

describe('local generation client', () => {
  it('needs no credentials', () => {
    expect(createLocalGenerationClient().isConfigured()).toBe(true);
  });

  it('goes through queued and in_progress before completing, exercising the poll loop', async () => {
    const client = createLocalGenerationClient();
    const submitted = await client.submit({
      endpoint: '/v1/image2video/dop',
      input: { prompt: 'a cinematic shot' },
    });

    expect(submitted.status).toBe('queued');
    expect(submitted.request_id).toBeTruthy();

    const first = await client.getStatus(submitted.request_id);
    expect(first.status).toBe('in_progress');

    const terminal = await pollUntilTerminal(client, submitted.request_id, {
      intervalMs: 0,
      sleep: noSleep,
    });
    expect(terminal.status).toBe('completed');
    expect(isSyntheticUrl(resultUrl(terminal)!)).toBe(true);
  });

  it('returns images for a text-to-image endpoint and video otherwise', async () => {
    const client = createLocalGenerationClient();

    const image = await client.submit({ endpoint: '/v1/text2image/soul', input: { prompt: 'x' } });
    const imageDone = await pollUntilTerminal(client, image.request_id, { intervalMs: 0, sleep: noSleep });
    expect(imageDone.images?.[0].url).toBeTruthy();
    expect(imageDone.video).toBeUndefined();

    const video = await client.submit({ endpoint: '/v1/image2video/dop', input: { prompt: 'x' } });
    const videoDone = await pollUntilTerminal(client, video.request_id, { intervalMs: 0, sleep: noSleep });
    expect(videoDone.video?.url).toBeTruthy();
  });

  it('reproduces the provider moderation branch without calling anyone', async () => {
    const client = createLocalGenerationClient();
    const response = await client.submit({
      endpoint: '/v1/image2video/dop',
      input: { prompt: 'explicit nude content' },
    });
    expect(response.status).toBe('nsfw');
  });

  it('gives each submission its own request id', async () => {
    const client = createLocalGenerationClient();
    const a = await client.submit({ endpoint: '/v1/image2video/dop', input: { prompt: 'a' } });
    const b = await client.submit({ endpoint: '/v1/image2video/dop', input: { prompt: 'b' } });
    expect(a.request_id).not.toBe(b.request_id);
  });
});

describe('placeholder asset', () => {
  it('is labelled as simulated so it cannot pass for real footage', () => {
    const svg = placeholderSvg('Scene 1', 'dop-turbo', '9:16');
    expect(svg).toContain('SIMULATED SHOT');
    expect(svg).toContain('Scene 1');
  });

  it('matches the requested aspect ratio', () => {
    const vertical = placeholderSvg('a', 'b', '9:16');
    expect(vertical).toContain('width="540" height="960"');

    const square = placeholderSvg('a', 'b', '1:1');
    expect(square).toContain('width="540" height="540"');
  });

  it('escapes label text instead of injecting markup', () => {
    const svg = placeholderSvg('<script>alert(1)</script>', 'x', '9:16');
    expect(svg).not.toContain('<script>');
    expect(svg).toContain('&lt;script&gt;');
  });
});
