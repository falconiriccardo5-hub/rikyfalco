// Nodo "Esportazione": rendering finale in un unico passaggio FFmpeg.

import fs from 'fs'
import path from 'path'
import { formatTime } from '../../shared/timeline'
import { probe } from '../ffmpeg/probe'
import { encoderWorks } from '../ffmpeg/tools'
import { buildSrt } from '../render/ass'
import { fmtBytes, num, requireInput, str, type NodeImpl } from '../engine/context'
import { canvasFor, moveFile, runRender, safeUnlink, samePath, videoCodecArgs } from '../engine/render'

const HW = ['h264_nvenc', 'hevc_nvenc', 'h264_qsv', 'h264_amf']

export const exportNode: NodeImpl = {
  async run(ctx, input, s) {
    const tl = requireInput(input)
    let out = str(s.outputPath).trim()
    if (!out) {
      const base = path.basename(tl.source.path, path.extname(tl.source.path))
      out = path.join(ctx.projectDir, 'export', `${base}_montato.mp4`)
      ctx.log('info', `Nessuna destinazione indicata: uso ${out}`)
    }
    if (!/\.(mp4|mov|mkv|m4v)$/i.test(out)) out += '.mp4'
    if (samePath(out, tl.source.path)) throw new Error('La destinazione coincide con il video originale: scegli un altro file (l\'originale non viene mai sovrascritto).')
    const dir = path.dirname(out)
    try {
      fs.mkdirSync(dir, { recursive: true })
      fs.accessSync(dir, fs.constants.W_OK)
    } catch {
      throw new Error(`Cartella di destinazione non scrivibile: ${dir}`)
    }

    const codec = str(s.codec, 'libx264')
    if (!ctx.encoders.includes(codec)) throw new Error(`Codec ${codec} non disponibile in questa build di FFmpeg.`)
    if (HW.includes(codec)) {
      ctx.progress(0, 'Verifica encoder hardware')
      if (!(await encoderWorks(ctx.tools, codec))) throw new Error(`L'encoder ${codec} non funziona su questo PC (driver/GPU non compatibili). Usa H.264 (x264).`)
    }
    const rs = canvasFor(tl, str(s.resolution, 'source'), str(s.fit, 'blur'), s.fps)
    const crf = Math.round(num(s.crf, 20))
    const encode = [
      ...videoCodecArgs(codec, crf, str(s.preset, 'medium')),
      '-r', String(rs.fps),
      '-c:a', 'aac', '-b:a', str(s.audioBitrate, '192k'), '-ar', '48000',
      '-movflags', '+faststart'
    ]
    // Rendering in un file temporaneo nella cartella di lavoro, poi spostamento: nessun file parziale a destinazione.
    const tmp = path.join(ctx.nodeDir, 'render.tmp' + path.extname(out))
    safeUnlink(tmp)
    const t0 = Date.now()
    let compiled
    try {
      compiled = await runRender({ ctx, timeline: tl, render: rs, mode: 'video', jobName: 'export', outFile: tmp, encodeArgs: encode, label: 'Esportazione' })
    } catch (e) {
      safeUnlink(tmp)
      throw e
    }
    moveFile(tmp, out)
    const files = [{ label: 'Video esportato', path: out }]
    if (tl.subtitles?.exportSrt && compiled.cues.length) {
      const srt = out.replace(/\.[^.]+$/, '.srt')
      fs.writeFileSync(srt, buildSrt(compiled.cues), 'utf8')
      files.push({ label: 'Sottotitoli SRT', path: srt })
    }
    const info = await probe(ctx.tools, out)
    const secs = (Date.now() - t0) / 1000
    ctx.log('success', `Esportato: ${out} (${fmtBytes(info.sizeBytes)}, ${formatTime(info.duration)})`)
    return {
      result: {
        summary: `${path.basename(out)} · ${fmtBytes(info.sizeBytes)}`,
        items: [
          { label: 'File', value: out },
          { label: 'Durata', value: formatTime(info.duration, true) },
          { label: 'Risoluzione', value: `${info.width}×${info.height} @ ${info.fps} fps` },
          { label: 'Codec', value: `${info.videoCodec} / ${info.audioCodec}` },
          { label: 'Dimensione', value: fmtBytes(info.sizeBytes) },
          { label: 'Tempo di codifica', value: `${secs.toFixed(1)} s (${(info.duration / Math.max(0.01, secs)).toFixed(2)}× tempo reale)` }
        ],
        files,
        warnings: compiled.warnings
      }
    }
  }
}
