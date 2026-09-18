import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { env } from '../env';
import { OrchestratorError } from '../errors';

const run = promisify(execFile);

export interface MediaProbe {
  durationSec: number;
  width: number;
  height: number;
  aspectRatio: string;
  codec: string;
  bitrate: number | null;
  hasAudio: boolean;
}

function gcd(a: number, b: number): number {
  return b === 0 ? a : gcd(b, a % b);
}

/** "1080x1920" -> "9:16". Reduced, so it is directly comparable to the spec. */
export function ratioOf(width: number, height: number): string {
  if (!width || !height) return 'unknown';
  const divisor = gcd(width, height) || 1;
  return `${width / divisor}:${height / divisor}`;
}

interface FfprobeStream {
  codec_type?: string;
  codec_name?: string;
  width?: number;
  height?: number;
  duration?: string;
}

interface FfprobeOutput {
  streams?: FfprobeStream[];
  format?: { duration?: string; bit_rate?: string };
}

/**
 * Deterministic, non-AI measurement of the rendered file. Duration, resolution
 * and aspect ratio are read from the container — never estimated by a model.
 */
export async function probeMedia(filePath: string): Promise<MediaProbe> {
  const { FFPROBE_PATH } = env();
  let stdout: string;
  try {
    ({ stdout } = await run(FFPROBE_PATH, [
      '-v',
      'error',
      '-print_format',
      'json',
      '-show_format',
      '-show_streams',
      filePath,
    ]));
  } catch (error) {
    throw new OrchestratorError(
      'QC_FAILED',
      `ffprobe failed on ${path.basename(filePath)}: ${(error as Error).message}`,
    );
  }

  const parsed = JSON.parse(stdout) as FfprobeOutput;
  const video = parsed.streams?.find((s) => s.codec_type === 'video');
  if (!video) {
    throw new OrchestratorError('QC_FAILED', 'No video stream found in the generated asset.');
  }

  const width = video.width ?? 0;
  const height = video.height ?? 0;
  const durationSec = Number(parsed.format?.duration ?? video.duration ?? 0);

  return {
    durationSec,
    width,
    height,
    aspectRatio: ratioOf(width, height),
    codec: video.codec_name ?? 'unknown',
    bitrate: parsed.format?.bit_rate ? Number(parsed.format.bit_rate) : null,
    hasAudio: Boolean(parsed.streams?.some((s) => s.codec_type === 'audio')),
  };
}

export interface ExtractedFrame {
  /** Seconds into the clip. */
  at: number;
  base64: string;
  mimeType: string;
}

/**
 * Extract N evenly spread frames (first and last included) as JPEGs, so a
 * vision model can actually look at the footage rather than at its description.
 */
export async function extractFrames(
  filePath: string,
  durationSec: number,
  count = env().QC_FRAME_COUNT,
): Promise<ExtractedFrame[]> {
  const { FFMPEG_PATH } = env();
  const workDir = await fs.mkdtemp(path.join(os.tmpdir(), 'qc-frames-'));

  try {
    const usable = durationSec > 0.2 ? durationSec : 1;
    const timestamps: number[] = [];
    for (let i = 0; i < count; i += 1) {
      // Keep the last sample just inside the clip: seeking to the exact end yields no frame.
      const fraction = count === 1 ? 0 : i / (count - 1);
      timestamps.push(Math.min(usable * fraction, Math.max(0, usable - 0.05)));
    }

    const frames: ExtractedFrame[] = [];
    for (const [index, at] of timestamps.entries()) {
      const out = path.join(workDir, `frame-${index}.jpg`);
      try {
        await run(FFMPEG_PATH, [
          '-v',
          'error',
          '-ss',
          at.toFixed(3),
          '-i',
          filePath,
          '-frames:v',
          '1',
          '-q:v',
          '3',
          '-y',
          out,
        ]);
      } catch (error) {
        throw new OrchestratorError(
          'QC_FAILED',
          `ffmpeg could not extract a frame at ${at.toFixed(2)}s: ${(error as Error).message}`,
        );
      }
      frames.push({
        at,
        base64: (await fs.readFile(out)).toString('base64'),
        mimeType: 'image/jpeg',
      });
    }
    return frames;
  } finally {
    await fs.rm(workDir, { recursive: true, force: true });
  }
}

/** Are the QC binaries actually present? Surfaced in /api/health. */
export async function ffmpegAvailable(): Promise<{ ffmpeg: boolean; ffprobe: boolean }> {
  const e = env();
  const check = async (bin: string) => {
    try {
      await run(bin, ['-version']);
      return true;
    } catch {
      return false;
    }
  };
  return { ffmpeg: await check(e.FFMPEG_PATH), ffprobe: await check(e.FFPROBE_PATH) };
}
