import { completeJson } from '../llm/openai';
import { env } from '../env';
import { extractFrames, probeMedia, type MediaProbe } from '../qc/ffmpeg';
import { renderBrand } from './context';
import type { BrandProfile } from '@prisma/client';
import {
  qcVisionSchema,
  type QcIssue,
  type QcReport,
  type QcVision,
  type ShotSpec,
} from './schemas';

const SYSTEM = `You are the QUALITY CONTROL reviewer for AI-generated vertical video. You are shown
frames sampled from one shot, in chronological order, with their timestamps.

Judge only what you can see:
- generation artefacts (warped hands/faces, melting geometry, flicker, duplicated limbs, text garbage)
- subject consistency across the frames (same person, wardrobe, setting)
- whether the footage matches the shot's stated visual goal
- brand style match (look, palette, mood) and any forbidden style
- unwanted elements: legible text, watermarks, logos, brand marks
- safety: nudity, gore, anything unsuitable for a fitness brand's public feed

Score 0..1 for overall usability. Be strict: a visible artefact on a human face is "high" severity.
Do NOT judge duration, resolution or aspect ratio — those are measured separately from the file.

Return a single JSON object: { score, issues: [{ kind, severity, detail }], subject_consistent,
brand_style_match, safe, notes }.`;

export interface QcInput {
  filePath: string;
  shot: ShotSpec;
  brand: BrandProfile;
  expectedDurationSec: number;
  expectedAspectRatio: string;
  minWidth?: number;
}

export interface QcResult {
  report: QcReport;
  probe: MediaProbe;
  vision: QcVision;
  frameCount: number;
  costUsd: number;
  model: string;
}

const DURATION_TOLERANCE_SEC = 1.0;
const DEFAULT_MIN_WIDTH = 720;

/** Deterministic, file-derived checks. These cannot be hallucinated away. */
export function deterministicIssues(
  probe: MediaProbe,
  expectedDurationSec: number,
  expectedAspectRatio: string,
  minWidth = DEFAULT_MIN_WIDTH,
): QcIssue[] {
  const issues: QcIssue[] = [];

  const drift = Math.abs(probe.durationSec - expectedDurationSec);
  if (drift > DURATION_TOLERANCE_SEC) {
    issues.push({
      kind: 'duration',
      severity: drift > expectedDurationSec * 0.5 ? 'high' : 'medium',
      detail: `Measured ${probe.durationSec.toFixed(2)}s against an expected ${expectedDurationSec}s (drift ${drift.toFixed(2)}s).`,
    });
  }

  if (probe.aspectRatio !== expectedAspectRatio) {
    issues.push({
      kind: 'aspect_ratio',
      severity: 'high',
      detail: `Measured ${probe.aspectRatio} (${probe.width}x${probe.height}) against an expected ${expectedAspectRatio}.`,
    });
  }

  const shortSide = Math.min(probe.width, probe.height);
  if (shortSide < minWidth) {
    issues.push({
      kind: 'resolution',
      severity: 'medium',
      detail: `Short side is ${shortSide}px, below the ${minWidth}px floor.`,
    });
  }

  return issues;
}

/**
 * Merge the vision verdict with the measured facts. A high-severity issue, or a
 * score under the floor, forces regeneration of this shot only.
 */
export function buildReport(vision: QcVision, hardIssues: QcIssue[], minScore: number): QcReport {
  const issues = [...hardIssues, ...vision.issues];
  if (!vision.subject_consistent) {
    issues.push({
      kind: 'subject_consistency',
      severity: 'high',
      detail: 'The subject is not consistent across the sampled frames.',
    });
  }
  if (!vision.brand_style_match) {
    issues.push({
      kind: 'brand_style',
      severity: 'medium',
      detail: 'The footage does not match the brand visual style.',
    });
  }
  if (!vision.safe) {
    issues.push({
      kind: 'safety',
      severity: 'high',
      detail: 'The footage contains material unsuitable for publication.',
    });
  }

  // Measured failures cap the score regardless of how the frames look.
  const hardPenalty = hardIssues.reduce(
    (sum, issue) => sum + (issue.severity === 'high' ? 0.4 : 0.15),
    0,
  );
  const score = Math.max(0, Math.min(1, vision.score - hardPenalty));
  const hasBlocker = issues.some((issue) => issue.severity === 'high');
  const approved = !hasBlocker && score >= minScore;

  return { approved, score: Number(score.toFixed(3)), issues, regeneration_required: !approved };
}

export async function runQualityControl(input: QcInput): Promise<QcResult> {
  const e = env();

  // 1. Measure the file itself (ffprobe) — never ask a model for these numbers.
  const probe = await probeMedia(input.filePath);

  // 2. Sample real frames with ffmpeg.
  const frames = await extractFrames(input.filePath, probe.durationSec);

  // 3. Have a vision model look at those frames.
  const user = [
    '### SHOT SPEC',
    JSON.stringify(
      {
        visual_goal: input.shot.visual_goal,
        prompt: input.shot.prompt,
        style: input.shot.style,
        negative_prompt: input.shot.negative_prompt,
      },
      null,
      2,
    ),
    '',
    '### BRAND PROFILE',
    renderBrand(input.brand),
    '',
    '### FRAMES',
    frames.map((f, i) => `Frame ${i + 1} @ ${f.at.toFixed(2)}s`).join('\n'),
  ].join('\n');

  const { data: vision, costUsd, model } = await completeJson({
    system: SYSTEM,
    user,
    schema: qcVisionSchema,
    images: frames.map((f) => ({ base64: f.base64, mimeType: f.mimeType })),
    temperature: 0.2,
  });

  const hardIssues = deterministicIssues(
    probe,
    input.expectedDurationSec,
    input.expectedAspectRatio,
    input.minWidth,
  );

  return {
    report: buildReport(vision, hardIssues, e.QC_MIN_SCORE),
    probe,
    vision,
    frameCount: frames.length,
    costUsd,
    model,
  };
}
