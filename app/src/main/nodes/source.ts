// Nodi "Importa video" e "Analisi contenuto".

import fs from 'fs'
import path from 'path'
import { formatTime } from '../../shared/timeline'
import type { Timeline } from '../../shared/types'
import { isPlayableInApp, probe } from '../ffmpeg/probe'
import { ffmpeg } from '../ffmpeg/tools'
import { bool, fmtBytes, num, requireInput, str, type NodeImpl } from '../engine/context'

export const importNode: NodeImpl = {
  async run(ctx, _input, s) {
    const id = str(s.mediaId)
    const media = ctx.media.find((m) => m.id === id) ?? ctx.media.find((m) => m.kind === 'video' && !id)
    if (!media) throw new Error('Nessun video selezionato: importa un file nell\'area Progetto e sceglilo in questo nodo.')
    if (!fs.existsSync(media.path)) throw new Error(`File mancante: ${media.path}`)
    ctx.progress(0.05, 'Lettura metadati')
    const info = await probe(ctx.tools, media.path)
    if (!info.hasVideo) throw new Error('Il file non contiene una traccia video.')
    if (info.duration <= 0) throw new Error('Durata del video non valida.')
    ctx.log('info', `${path.basename(info.path)}: ${info.width}×${info.height} @ ${info.fps} fps, ${formatTime(info.duration)}`)

    const files: { label: string; path: string }[] = []
    const poster = path.join(ctx.nodeDir, 'poster.jpg')
    await ffmpeg(ctx.tools, ['-ss', String(Math.min(info.duration * 0.1, 10)), '-i', info.path, '-frames:v', '1', '-vf', 'scale=640:-2', '-q:v', '3', poster], { signal: ctx.signal })
    files.push({ label: 'Fotogramma', path: poster })

    let previewPath = info.path
    const mode = str(s.proxy, 'auto')
    const needProxy = mode === 'always' || (mode === 'auto' && !isPlayableInApp(info))
    if (needProxy) {
      const proxy = path.join(ctx.nodeDir, 'proxy.mp4')
      ctx.log('info', 'Creazione proxy di anteprima (formato non riproducibile direttamente)')
      await ffmpeg(
        ctx.tools,
        ['-i', info.path, '-vf', `scale=-2:'min(720,ih)'`, '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '26', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '128k', '-movflags', '+faststart', proxy],
        { signal: ctx.signal, duration: info.duration, onProgress: (f) => ctx.progress(0.1 + f * 0.9, `Proxy ${Math.round(f * 100)}%`) }
      )
      previewPath = proxy
      files.push({ label: 'Proxy anteprima', path: proxy })
    }

    const output: Timeline = {
      source: info,
      previewPath,
      analysis: {},
      segments: [{ start: 0, end: info.duration }],
      overlays: [],
      zooms: [],
      zoomKeyframes: [],
      zoomSmooth: false
    }
    return {
      output,
      result: {
        summary: `${info.width}×${info.height} · ${formatTime(info.duration)}`,
        items: [
          { label: 'File', value: path.basename(info.path) },
          { label: 'Durata', value: formatTime(info.duration, true) },
          { label: 'Risoluzione', value: `${info.width}×${info.height}` },
          { label: 'Fotogrammi/s', value: String(info.fps) },
          { label: 'Codec video', value: `${info.videoCodec ?? '-'} (${info.pixFmt ?? '-'})` },
          { label: 'Audio', value: info.hasAudio ? `${info.audioCodec} · ${info.sampleRate} Hz · ${info.channels} ch` : 'assente' },
          { label: 'Dimensione', value: fmtBytes(info.sizeBytes) },
          { label: 'Proxy', value: needProxy ? 'creato' : 'non necessario' }
        ],
        files
      }
    }
  }
}

/** Calcola i picchi della forma d'onda leggendo il WAV a blocchi (nessun caricamento completo in memoria). */
async function computePeaks(wav: string, buckets: number): Promise<number[]> {
  const fd = fs.openSync(wav, 'r')
  try {
    const header = Buffer.alloc(4096)
    fs.readSync(fd, header, 0, 4096, 0)
    let dataOffset = header.indexOf('data')
    if (dataOffset < 0) dataOffset = 36
    const dataStart = dataOffset + 8
    const size = fs.fstatSync(fd).size - dataStart
    const samples = Math.floor(size / 2)
    const per = Math.max(1, Math.floor(samples / buckets))
    const peaks = new Array<number>(Math.ceil(samples / per)).fill(0)
    const chunk = Buffer.alloc(per * 2 * 256)
    let pos = dataStart
    let sampleIndex = 0
    while (pos < dataStart + size) {
      const n = fs.readSync(fd, chunk, 0, chunk.length, pos)
      if (n <= 0) break
      for (let i = 0; i + 1 < n; i += 2) {
        const v = Math.abs(chunk.readInt16LE(i)) / 32768
        const b = Math.floor(sampleIndex / per)
        if (v > peaks[b]) peaks[b] = v
        sampleIndex++
      }
      pos += n
    }
    return peaks.map((p) => Math.round(p * 1000) / 1000)
  } finally {
    fs.closeSync(fd)
  }
}

export async function extractWav(ctx: Parameters<NodeImpl['run']>[0], src: string, duration: number, out: string, scale: [number, number]): Promise<void> {
  await ffmpeg(ctx.tools, ['-i', src, '-vn', '-sn', '-ac', '1', '-ar', '16000', '-c:a', 'pcm_s16le', out], {
    signal: ctx.signal,
    duration,
    onProgress: (f) => ctx.progress(scale[0] + f * (scale[1] - scale[0]), `Estrazione audio ${Math.round(f * 100)}%`)
  })
}

export const analyzeNode: NodeImpl = {
  async run(ctx, input, s) {
    const tl = requireInput(input)
    const src = tl.source
    const analysis = { ...tl.analysis }
    const items: { label: string; value: string }[] = []
    const files: { label: string; path: string }[] = []
    const warnings: string[] = []

    if (src.hasAudio) {
      const wav = path.join(ctx.nodeDir, 'audio16k.wav')
      await extractWav(ctx, src.path, src.duration, wav, [0, 0.35])
      analysis.audioPath = wav
      files.push({ label: 'Audio estratto (16 kHz)', path: wav })
      ctx.progress(0.36, 'Forma d\'onda')
      const peaks = await computePeaks(wav, Math.min(6000, Math.max(200, Math.round(src.duration * 25))))
      const wf = path.join(ctx.nodeDir, 'waveform.json')
      fs.writeFileSync(wf, JSON.stringify({ duration: src.duration, peaks }))
      analysis.waveformPath = wf

      if (bool(s.loudness, true)) {
        ctx.progress(0.4, 'Misura volume')
        const err = await ffmpeg(ctx.tools, ['-i', src.path, '-vn', '-sn', '-af', 'volumedetect,ebur128=framelog=quiet', '-f', 'null', '-'], {
          signal: ctx.signal,
          duration: src.duration,
          onProgress: (f) => ctx.progress(0.4 + f * 0.25, `Loudness ${Math.round(f * 100)}%`)
        })
        const mean = /mean_volume:\s*(-?[\d.]+) dB/.exec(err)
        const max = /max_volume:\s*(-?[\d.]+) dB/.exec(err)
        const integ = /I:\s*(-?[\d.]+) LUFS/.exec(err.slice(err.lastIndexOf('Summary')))
        if (mean) analysis.meanVolume = Number(mean[1])
        if (max) analysis.maxVolume = Number(max[1])
        if (integ) analysis.integratedLufs = Number(integ[1])
        items.push({ label: 'Volume medio', value: mean ? `${mean[1]} dB` : '-' })
        items.push({ label: 'Picco', value: max ? `${max[1]} dB` : '-' })
        items.push({ label: 'Loudness integrata', value: integ ? `${integ[1]} LUFS` : '-' })
      }
    } else {
      warnings.push('Il video non contiene audio: tagli e trascrizione non saranno disponibili.')
    }

    const nThumb = Math.round(num(s.thumbnails, 12))
    const thumbs: string[] = []
    for (let i = 0; i < nThumb; i++) {
      const t = ((i + 0.5) * src.duration) / nThumb
      const out = path.join(ctx.nodeDir, `thumb_${String(i).padStart(3, '0')}.jpg`)
      await ffmpeg(ctx.tools, ['-ss', t.toFixed(3), '-i', src.path, '-frames:v', '1', '-vf', 'scale=320:-2', '-q:v', '5', out], { signal: ctx.signal })
      if (fs.existsSync(out)) thumbs.push(out)
      ctx.progress(0.65 + ((i + 1) / Math.max(1, nThumb)) * 0.15, `Miniature ${i + 1}/${nThumb}`)
    }
    analysis.thumbnails = thumbs
    items.push({ label: 'Miniature', value: String(thumbs.length) })

    if (bool(s.scenes)) {
      const th = num(s.sceneThreshold, 0.35)
      const scenes: number[] = []
      await ffmpeg(ctx.tools, ['-i', src.path, '-an', '-sn', '-vf', `scale=320:-2,select='gt(scene,${th})',showinfo`, '-f', 'null', '-'], {
        signal: ctx.signal,
        duration: src.duration,
        onProgress: (f) => ctx.progress(0.8 + f * 0.2, `Cambi scena ${Math.round(f * 100)}%`),
        onStderr: (chunk) => {
          for (const m of chunk.matchAll(/pts_time:\s*([\d.]+)/g)) scenes.push(Number(m[1]))
        }
      })
      analysis.scenes = scenes
      items.push({ label: 'Cambi scena', value: String(scenes.length) })
    }

    return {
      output: { ...tl, analysis },
      result: {
        summary: src.hasAudio ? `Audio estratto · ${thumbs.length} miniature` : `${thumbs.length} miniature`,
        items,
        files,
        warnings,
        data: { thumbnails: thumbs, scenes: analysis.scenes ?? [] }
      }
    }
  }
}
