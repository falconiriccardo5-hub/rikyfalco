// Montaggio direttamente sul telefono: FFmpeg in WebAssembly + compilatore
// condiviso con la versione desktop (stessi tagli, sottotitoli, zoom e audio).

import { FFmpeg } from '@ffmpeg/ffmpeg'
import { buildRender } from '@shared/render/graph'
import { computeCuts, groupWordsIntoCues, totalLength } from '@shared/timeline'
import type { AudioFx, MediaInfo, SubtitleStyle, Timeline, Word, ZoomEffect } from '@shared/types'
import { transcribe, type WhisperModel } from './whisper'

export interface LocalOptions {
  cutPauses: boolean
  minSilence: number
  subtitles: boolean
  model: WhisperModel
  language: string
  zoom: boolean
  normalize: boolean
  format: 'source' | 'vertical'
  height: 720 | 1080
}

export const DEFAULT_LOCAL: LocalOptions = {
  cutPauses: true,
  minSilence: 0.6,
  subtitles: true,
  model: 'base',
  language: 'it',
  zoom: true,
  normalize: true,
  format: 'source',
  height: 720
}

export interface LocalResult {
  blob: Blob
  name: string
  duration: number
  summary: string[]
}

export type StepFn = (step: string, progress: number, detail?: string) => void

let ff: FFmpeg | null = null
let loading: Promise<FFmpeg> | null = null
let logSink: ((line: string) => void) | null = null

function asset(p: string): string {
  return new URL(p, document.baseURI).href
}

export async function loadFFmpeg(): Promise<FFmpeg> {
  if (ff) return ff
  if (!loading) {
    loading = (async () => {
      const f = new FFmpeg()
      f.on('log', ({ message }) => logSink?.(message))
      await f.load({ coreURL: asset('vendor/ffmpeg-core.js'), wasmURL: asset('vendor/ffmpeg-core.wasm') })
      ff = f
      return f
    })().catch((e) => {
      loading = null
      throw e
    })
  }
  return loading
}

/** Interrompe l'elaborazione in corso (il motore viene ricreato al prossimo uso). */
export function abortLocal(): void {
  ff?.terminate()
  ff = null
  loading = null
}

/** Esegue FFmpeg raccogliendo il log; `onTime` riceve i secondi elaborati. */
async function run(f: FFmpeg, args: string[], onTime?: (t: number) => void): Promise<{ code: number; log: string[] }> {
  const log: string[] = []
  logSink = (line) => {
    log.push(line)
    if (log.length > 4000) log.shift()
    const m = /time=\s*(\d+):(\d+):(\d+(?:\.\d+)?)/.exec(line)
    if (m && onTime) onTime(Number(m[1]) * 3600 + Number(m[2]) * 60 + Number(m[3]))
  }
  try {
    const code = await f.exec(['-hide_banner', '-nostdin', '-y', ...args])
    return { code, log }
  } finally {
    logSink = null
  }
}

function parseInfo(log: string[], path: string, size: number): MediaInfo {
  const all = log.join('\n')
  const dur = /Duration:\s*(\d+):(\d+):(\d+(?:\.\d+)?)/.exec(all)
  const duration = dur ? Number(dur[1]) * 3600 + Number(dur[2]) * 60 + Number(dur[3]) : 0
  const v = /Stream #\S+.*Video: (\w+).*?, (\d{2,5})x(\d{2,5})/.exec(all)
  const fpsM = /(\d+(?:\.\d+)?) fps/.exec(all)
  const a = /Stream #\S+.*Audio: (\w+)/.exec(all)
  const rot = /rotation of (-?\d+(?:\.\d+)?)/.exec(all)
  let w = v ? Number(v[2]) : 0
  let h = v ? Number(v[3]) : 0
  const r = rot ? Math.round(Number(rot[1])) : 0
  if (Math.abs(r) === 90 || Math.abs(r) === 270) [w, h] = [h, w]
  const fps = fpsM ? Number(fpsM[1]) : 30
  return {
    path, sizeBytes: size, mtimeMs: 0, formatName: '', duration,
    hasVideo: !!v, hasAudio: !!a, width: w, height: h, fps: fps > 0 && fps < 240 ? fps : 30,
    videoCodec: v?.[1], audioCodec: a?.[1], rotation: r
  }
}

const even = (n: number): number => Math.max(2, Math.round(n / 2) * 2)

const SUB_STYLE: SubtitleStyle = {
  font: 'Montserrat', fontSize: 70, bold: true, uppercase: false, color: '#FFFFFF', outlineColor: '#000000',
  outline: 4, shadow: 0, boxed: false, boxColor: '#000000', boxOpacity: 60, position: 'bottom', marginV: 12,
  animation: 'highlight', highlightColor: '#FF8A1F', keywords: []
}

export async function processLocally(file: File, o: LocalOptions, step: StepFn): Promise<LocalResult> {
  step('Avvio del motore video', 0.01, 'Primo avvio: download di circa 30 MB')
  const f = await loadFFmpeg()
  const summary: string[] = []
  const inDir = '/in'
  try {
    await f.createDir(inDir).catch(() => undefined)
    // WORKERFS legge il file a pezzi, senza copiarlo tutto in memoria.
    await f.mount('WORKERFS' as never, { files: [file] }, inDir)
    const input = `${inDir}/${file.name}`

    step('Lettura del video', 0.03)
    const probe = await run(f, ['-i', input])
    const info = parseInfo(probe.log, input, file.size)
    if (!info.hasVideo || info.duration <= 0) throw new Error('Formato non riconosciuto: scegli un video MP4 o MOV.')
    summary.push(`Originale: ${info.width}×${info.height}, ${info.duration.toFixed(1)} s`)

    // Trascrizione (facoltativa) per sottotitoli e tagli che non spezzano le parole.
    let words: Word[] | undefined
    if (o.subtitles && info.hasAudio) {
      step('Estrazione audio', 0.06)
      await run(f, ['-i', input, '-vn', '-ac', '1', '-ar', '16000', '-f', 'f32le', '/audio.pcm'])
      const pcm = (await f.readFile('/audio.pcm')) as Uint8Array
      await f.deleteFile('/audio.pcm')
      const audio = new Float32Array(pcm.buffer, pcm.byteOffset, Math.floor(pcm.byteLength / 4))
      words = await transcribe(audio, o.model, o.language, (p, msg) => step(msg, 0.08 + p * 0.37))
      summary.push(`Trascrizione: ${words.length} parole`)
    }

    let segments = [{ start: 0, end: info.duration }]
    if (o.cutPauses && info.hasAudio) {
      step('Analisi delle pause', 0.46)
      const vol = await run(f, ['-i', input, '-vn', '-af', 'volumedetect', '-f', 'null', '-'])
      const mean = Number(/mean_volume:\s*(-?[\d.]+) dB/.exec(vol.log.join('\n'))?.[1] ?? -25)
      const thr = Math.round(Math.min(-22, Math.max(-60, mean - 14)))
      const sil = await run(f, ['-i', input, '-vn', '-af', `silencedetect=noise=${thr}dB:d=0.15`, '-f', 'null', '-'], (t) =>
        step('Analisi delle pause', 0.46 + Math.min(1, t / info.duration) * 0.06)
      )
      const silences: { start: number; end: number }[] = []
      let pending: number | null = null
      for (const line of sil.log) {
        const m = /silence_(start|end):\s*(-?[\d.]+)/.exec(line)
        if (!m) continue
        const t = Math.max(0, Number(m[2]))
        if (m[1] === 'start') pending = t
        else if (pending !== null) {
          silences.push({ start: pending, end: t })
          pending = null
        }
      }
      if (pending !== null) silences.push({ start: pending, end: info.duration })
      const r = computeCuts({
        duration: info.duration, silences, minSilence: o.minSilence, padding: 0.12, minKeep: 0.25,
        protectedRanges: [], manualCuts: [], disabledKeys: [], words
      })
      segments = r.segments
      summary.push(`Pause tagliate: ${r.cuts.length} (−${(info.duration - totalLength(segments)).toFixed(1)} s)`)
    }

    const zooms: ZoomEffect[] = o.zoom && segments.length > 1
      ? segments.filter((_, i) => i % 2 === 1).map((s, i) => ({ id: `z${i}`, start: s.start, end: s.end, scale: 1.12, x: 50, y: 42, ease: 0 }))
      : []
    const audio: AudioFx | undefined = o.normalize && info.hasAudio
      ? { denoise: 'light', highpass: 80, deesser: false, compressor: true, normalize: true, targetLufs: -14, truePeak: -1.5, voiceGainDb: 0 }
      : undefined
    const tl: Timeline = {
      source: info,
      previewPath: input,
      analysis: {},
      transcript: words ? { language: o.language, engine: 'whisper (telefono)', words, text: words.map((w) => w.text).join(' ') } : undefined,
      segments,
      subtitles: words?.length
        ? { cues: groupWordsIntoCues(words, { maxChars: 50, maxWords: 6, maxDuration: 3.5, gapBreak: 0.7 }), style: SUB_STYLE, burn: true, exportSrt: false, maxChars: 26 }
        : undefined,
      overlays: [],
      zooms,
      zoomKeyframes: [],
      zoomSmooth: false,
      audio
    }

    // Formato finale.
    // Il lato corto del video finale vale 720 o 1080 (vale anche per i video verticali).
    const H = o.height
    let render: { width: number; height: number }
    if (o.format === 'vertical') render = H === 720 ? { width: 720, height: 1280 } : { width: 1080, height: 1920 }
    else {
      const k = Math.min(1, H / Math.max(1, Math.min(info.width, info.height)))
      render = { width: even(info.width * k), height: even(info.height * k) }
    }
    const fps = Math.min(30, Math.round(info.fps))
    const c = buildRender({
      timeline: tl,
      render: { ...render, fps, fit: 'blur' },
      mode: 'video',
      exists: () => false,
      fontsSubdir: tl.subtitles ? 'fonts' : undefined,
      ffmpegMajor: 5
    })
    for (const x of c.files) await f.writeFile(`/${x.name}`, x.content)
    if (tl.subtitles) {
      await f.createDir('/fonts').catch(() => undefined)
      for (const name of ['Montserrat-Bold.ttf', 'Montserrat-Regular.ttf']) {
        const buf = new Uint8Array(await (await fetch(new URL(`fonts/${name}`, document.baseURI))).arrayBuffer())
        await f.writeFile(`/fonts/${name}`, buf)
      }
      summary.push(`Sottotitoli: ${c.cues.length}`)
    }

    step('Montaggio e codifica', 0.53, `${render.width}×${render.height}`)
    const enc = await run(
      f,
      [...c.args, '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '23', '-pix_fmt', 'yuv420p', '-r', String(fps),
        '-c:a', 'aac', '-b:a', '160k', '-movflags', '+faststart', '/out.mp4'],
      (t) => step('Montaggio e codifica', 0.53 + Math.min(1, t / Math.max(0.1, c.duration)) * 0.46, `${Math.round(Math.min(1, t / c.duration) * 100)}%`)
    )
    if (enc.code !== 0) {
      const err = enc.log.filter((l) => /error|invalid|failed|cannot/i.test(l)).slice(-3).join(' | ')
      throw new Error(`Codifica non riuscita: ${err || 'errore sconosciuto'}`)
    }
    const data = (await f.readFile('/out.mp4')) as Uint8Array
    await f.deleteFile('/out.mp4')
    const base = file.name.replace(/\.[^.]+$/, '')
    summary.push(`Risultato: ${render.width}×${render.height}, ${c.duration.toFixed(1)} s`)
    step('Completato', 1)
    return { blob: new Blob([data as BlobPart], { type: 'video/mp4' }), name: `${base}_montato.mp4`, duration: c.duration, summary }
  } finally {
    await f.unmount(inDir).catch(() => undefined)
  }
}
