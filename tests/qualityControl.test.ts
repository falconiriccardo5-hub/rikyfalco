import { describe, expect, it } from 'vitest';
import { buildReport, deterministicIssues } from '@/lib/agents/qualityControl';
import { ratioOf } from '@/lib/qc/ffmpeg';
import type { QcVision } from '@/lib/agents/schemas';
import type { MediaProbe } from '@/lib/qc/ffmpeg';

const probe = (partial: Partial<MediaProbe> = {}): MediaProbe => ({
  durationSec: 5,
  width: 1080,
  height: 1920,
  aspectRatio: '9:16',
  codec: 'h264',
  bitrate: 4_000_000,
  hasAudio: false,
  ...partial,
});

const cleanVision: QcVision = {
  score: 0.92,
  issues: [],
  subject_consistent: true,
  brand_style_match: true,
  safe: true,
  notes: '',
};

describe('ratioOf', () => {
  it('reduces a resolution to its aspect ratio', () => {
    expect(ratioOf(1080, 1920)).toBe('9:16');
    expect(ratioOf(1920, 1080)).toBe('16:9');
    expect(ratioOf(1536, 1536)).toBe('1:1');
    expect(ratioOf(0, 0)).toBe('unknown');
  });
});

describe('deterministicIssues', () => {
  it('passes a file that matches the spec', () => {
    expect(deterministicIssues(probe(), 5, '9:16')).toEqual([]);
  });

  it('measures duration drift from the file, not from the model', () => {
    const issues = deterministicIssues(probe({ durationSec: 2.1 }), 5, '9:16');
    expect(issues.map((i) => i.kind)).toContain('duration');
  });

  it('flags a wrong aspect ratio as a blocker', () => {
    const issues = deterministicIssues(
      probe({ width: 1920, height: 1080, aspectRatio: '16:9' }),
      5,
      '9:16',
    );
    expect(issues.find((i) => i.kind === 'aspect_ratio')?.severity).toBe('high');
  });

  it('flags footage below the resolution floor', () => {
    const issues = deterministicIssues(probe({ width: 480, height: 854 }), 5, '9:16', 720);
    expect(issues.map((i) => i.kind)).toContain('resolution');
  });
});

describe('buildReport', () => {
  it('approves clean footage above the score floor', () => {
    const report = buildReport(cleanVision, [], 0.75);
    expect(report.approved).toBe(true);
    expect(report.regeneration_required).toBe(false);
  });

  it('rejects when a measured check fails, however good the frames look', () => {
    const hard = deterministicIssues(probe({ width: 1920, height: 1080, aspectRatio: '16:9' }), 5, '9:16');
    const report = buildReport({ ...cleanVision, score: 0.99 }, hard, 0.75);

    expect(report.approved).toBe(false);
    expect(report.regeneration_required).toBe(true);
    expect(report.score).toBeLessThan(0.99);
  });

  it('rejects an inconsistent subject as a high-severity issue', () => {
    const report = buildReport({ ...cleanVision, subject_consistent: false }, [], 0.75);
    expect(report.approved).toBe(false);
    expect(report.issues.map((i) => i.kind)).toContain('subject_consistency');
  });

  it('rejects unsafe footage regardless of score', () => {
    const report = buildReport({ ...cleanVision, score: 1, safe: false }, [], 0.75);
    expect(report.approved).toBe(false);
  });

  it('rejects footage that scores below the floor without a blocker', () => {
    const report = buildReport({ ...cleanVision, score: 0.5 }, [], 0.75);
    expect(report.approved).toBe(false);
    expect(report.issues.some((i) => i.severity === 'high')).toBe(false);
  });

  it('keeps the score inside 0..1 after penalties', () => {
    const hard = deterministicIssues(
      probe({ durationSec: 0.4, width: 320, height: 568, aspectRatio: '40:71' }),
      5,
      '9:16',
    );
    const report = buildReport({ ...cleanVision, score: 0.3 }, hard, 0.75);
    expect(report.score).toBeGreaterThanOrEqual(0);
  });
});
