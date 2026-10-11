// Individuazione degli eseguibili FFmpeg/FFprobe e funzioni di alto livello.
// Ordine di ricerca: percorso nelle impostazioni → binari inclusi nell'app
// (ffmpeg-static / ffprobe-static) → PATH di sistema.

import fs from 'fs'
import path from 'path'
import ffmpegStatic from 'ffmpeg-static'
import ffprobeStatic from 'ffprobe-static'
import { CancelledError, ffmpegErrorSummary, runProcess, type ProcOptions } from './run'

export interface ToolPaths {
  ffmpeg: string
  ffprobe: string
}

function fixAsar(p: string): string {
  // Dentro il pacchetto Electron i binari sono estratti in app.asar.unpacked.
  return p.replace(`app.asar${path.sep}`, `app.asar.unpacked${path.sep}`).replace('app.asar/', 'app.asar.unpacked/')
}

function bundled(name: 'ffmpeg' | 'ffprobe'): string | null {
  try {
    const p: string | null = name === 'ffmpeg' ? (ffmpegStatic as unknown as string | null) : ffprobeStatic.path
    if (p) {
      const fixed = fixAsar(p)
      if (fs.existsSync(fixed)) return fixed
    }
  } catch {
    /* non disponibile */
  }
  return null
}

export function resolveTools(override?: { ffmpegPath?: string; ffprobePath?: string }): ToolPaths {
  const exe = process.platform === 'win32' ? '.exe' : ''
  const ffmpeg =
    (override?.ffmpegPath && fs.existsSync(override.ffmpegPath) && override.ffmpegPath) ||
    bundled('ffmpeg') ||
    'ffmpeg' + exe
  const ffprobe =
    (override?.ffprobePath && fs.existsSync(override.ffprobePath) && override.ffprobePath) ||
    bundled('ffprobe') ||
    'ffprobe' + exe
  return { ffmpeg, ffprobe }
}

export interface FfmpegRunOptions extends ProcOptions {
  /** Durata attesa dell'output (secondi) per calcolare la percentuale. */
  duration?: number
  onProgress?: (fraction: number, info: { time: number; speed?: string }) => void
}

/**
 * Esegue FFmpeg con `-progress pipe:1` per ottenere un avanzamento reale.
 * Lancia un errore con un riepilogo leggibile se il processo fallisce.
 */
export async function ffmpeg(tools: ToolPaths, args: string[], o: FfmpegRunOptions = {}): Promise<string> {
  const full = ['-hide_banner', '-nostdin', '-y', '-progress', 'pipe:1', '-nostats', ...args]
  let buf = ''
  let speed: string | undefined
  const res = await runProcess(tools.ffmpeg, full, {
    ...o,
    onStdout: (s) => {
      buf += s
      const lines = buf.split('\n')
      buf = lines.pop() ?? ''
      for (const line of lines) {
        const [k, v] = line.split('=')
        if (k === 'speed') speed = v?.trim()
        if (k === 'out_time_us' || k === 'out_time_ms') {
          const us = Number(v)
          if (!isFinite(us) || us < 0) continue
          const t = us / 1e6
          const frac = o.duration && o.duration > 0 ? Math.min(1, t / o.duration) : 0
          o.onProgress?.(frac, { time: t, speed })
        }
      }
    }
  })
  if (res.code !== 0) throw new Error(ffmpegErrorSummary(res.stderr))
  return res.stderr
}

export async function ffmpegVersion(tools: ToolPaths): Promise<{ version: string; major: number }> {
  const r = await runProcess(tools.ffmpeg, ['-hide_banner', '-version'])
  const m = /ffmpeg version (\S+)/.exec(r.stdout)
  const version = m?.[1] ?? 'sconosciuta'
  const mm = /^n?(\d+)\./.exec(version)
  return { version, major: mm ? Number(mm[1]) : 7 }
}

export async function listEncoders(tools: ToolPaths): Promise<string[]> {
  const r = await runProcess(tools.ffmpeg, ['-hide_banner', '-encoders'])
  const out: string[] = []
  for (const line of r.stdout.split('\n')) {
    const m = /^\s*V[\w.]{5}\s+(\S+)/.exec(line)
    if (m) out.push(m[1])
  }
  return out
}

/** Verifica rapida che un encoder hardware funzioni davvero (driver presenti). */
export async function encoderWorks(tools: ToolPaths, encoder: string): Promise<boolean> {
  try {
    const r = await runProcess(tools.ffmpeg, [
      '-hide_banner', '-loglevel', 'error', '-f', 'lavfi', '-i', 'color=c=black:s=256x256:d=0.2',
      '-frames:v', '2', '-c:v', encoder, '-f', 'null', '-'
    ])
    return r.code === 0
  } catch {
    return false
  }
}

export { CancelledError }
