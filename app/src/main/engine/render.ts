// Funzioni di rendering condivise da Esportazione e anteprime.

import fs from 'fs'
import path from 'path'
import { RESOLUTIONS } from '../../shared/nodeDefs'
import type { Timeline } from '../../shared/types'
import { ffmpeg } from '../ffmpeg/tools'
import { compile, type CompileMode, type Compiled, type RenderSettings } from '../render/compile'
import type { NodeContext } from './context'

export function even(n: number): number {
  return Math.max(2, Math.round(n / 2) * 2)
}

/** Calcola la tela finale a partire dalle impostazioni di esportazione. */
export function canvasFor(tl: Timeline, resolution: string, fit: string, fps: unknown, maxHeight?: number): RenderSettings {
  const r = RESOLUTIONS.find((x) => x.value === resolution)
  let w = r && r.w ? r.w : tl.source.width
  let h = r && r.h ? r.h : tl.source.height
  if (maxHeight && h > maxHeight) {
    w = (w * maxHeight) / h
    h = maxHeight
  }
  const f = fps === 'source' || !fps ? tl.source.fps : Number(fps)
  return {
    width: even(w),
    height: even(h),
    fps: Math.round((isFinite(f) && f > 0 ? f : 30) * 1000) / 1000,
    fit: (['fit', 'fill', 'blur'].includes(fit) ? fit : 'blur') as RenderSettings['fit']
  }
}

export function videoCodecArgs(codec: string, crf: number, preset: string): string[] {
  switch (codec) {
    case 'libx265':
      return ['-c:v', 'libx265', '-preset', preset, '-crf', String(crf), '-tag:v', 'hvc1', '-pix_fmt', 'yuv420p', '-x265-params', 'log-level=error']
    case 'h264_nvenc':
    case 'hevc_nvenc':
      return ['-c:v', codec, '-preset', 'p5', '-rc', 'vbr', '-cq', String(crf), '-b:v', '0', '-pix_fmt', 'yuv420p']
    case 'h264_qsv':
      return ['-c:v', codec, '-global_quality', String(crf), '-look_ahead', '0']
    case 'h264_amf':
      return ['-c:v', codec, '-rc', 'cqp', '-qp_i', String(crf), '-qp_p', String(crf), '-pix_fmt', 'yuv420p']
    default:
      return ['-c:v', 'libx264', '-preset', preset, '-crf', String(crf), '-pix_fmt', 'yuv420p', '-profile:v', 'high']
  }
}

export interface RenderJob {
  ctx: NodeContext
  timeline: Timeline
  render: RenderSettings
  mode: CompileMode
  range?: { fromOutput: number; seconds: number }
  jobName: string
  outFile: string
  encodeArgs: string[]
  progressScale?: [number, number]
  label?: string
}

export async function runRender(job: RenderJob): Promise<Compiled> {
  const { ctx } = job
  const dir = ctx.jobDir(job.jobName)
  const compiled = compile({
    timeline: job.timeline,
    render: job.render,
    mode: job.mode,
    range: job.range,
    dir,
    fontsSubdir: ctx.fontsRelative(dir),
    ffmpegMajor: ctx.ffmpegMajor
  })
  compiled.warnings.forEach((w) => ctx.log('warn', w))
  const [a, b] = job.progressScale ?? [0, 1]
  const t0 = Date.now()
  await ffmpeg(ctx.tools, [...compiled.args, ...job.encodeArgs, job.outFile], {
    cwd: dir,
    signal: ctx.signal,
    duration: compiled.duration,
    onProgress: (frac, info) => {
      const el = (Date.now() - t0) / 1000
      const eta = frac > 0.02 ? Math.max(0, el / frac - el) : NaN
      ctx.progress(
        a + (b - a) * frac,
        `${job.label ?? 'Rendering'} ${Math.round(frac * 100)}%` +
          (info.speed ? ` · ${info.speed}` : '') +
          (isFinite(eta) ? ` · ~${Math.ceil(eta)}s rimanenti` : '')
      )
    }
  })
  return compiled
}

export function safeUnlink(p: string): void {
  try {
    if (fs.existsSync(p)) fs.unlinkSync(p)
  } catch {
    /* ignora */
  }
}

/** Sposta un file anche tra unità diverse (rename fallisce con EXDEV). */
export function moveFile(src: string, dst: string): void {
  fs.mkdirSync(path.dirname(dst), { recursive: true })
  try {
    fs.renameSync(src, dst)
  } catch (e) {
    const err = e as NodeJS.ErrnoException
    if (err.code === 'EXDEV' || err.code === 'EPERM' || err.code === 'EEXIST') {
      fs.copyFileSync(src, dst)
      fs.unlinkSync(src)
    } else throw e
  }
}

export function samePath(a: string, b: string): boolean {
  const na = path.resolve(a)
  const nb = path.resolve(b)
  return process.platform === 'win32' ? na.toLowerCase() === nb.toLowerCase() : na === nb
}
