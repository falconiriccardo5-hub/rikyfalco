// Nodi di montaggio: "Taglio pause", "Zoom e animazioni", "Transizioni".

import fs from 'fs'
import path from 'path'
import { XFADE_OPTIONS } from '../../shared/nodeDefs'
import { clamp, computeCuts, cutKey, formatTime, subtractRanges, totalLength } from '../../shared/timeline'
import type { Range, TransitionSpec, XfadeType, ZoomEffect, ZoomKeyframe } from '../../shared/types'
import { ffmpeg } from '../ffmpeg/tools'
import { bool, num, requireInput, str, type NodeImpl } from '../engine/context'

function ranges(v: unknown): Range[] {
  if (!Array.isArray(v)) return []
  return v
    .map((r) => ({ start: num((r as Range)?.start, NaN), end: num((r as Range)?.end, NaN) }))
    .filter((r) => isFinite(r.start) && isFinite(r.end) && r.end > r.start)
}

export const silenceNode: NodeImpl = {
  async run(ctx, input, s) {
    const tl = requireInput(input)
    const src = tl.source
    if (!src.hasAudio) throw new Error('Il video non ha audio: impossibile rilevare le pause.')

    // Soglia automatica dal volume medio (misurato dall'Analisi o calcolato qui).
    let threshold = num(s.thresholdDb, -35)
    if (str(s.thresholdMode, 'auto') === 'auto') {
      let mean = tl.analysis.meanVolume
      if (mean === undefined) {
        ctx.progress(0.02, 'Misura volume medio')
        const err = await ffmpeg(ctx.tools, ['-i', src.path, '-vn', '-sn', '-af', 'volumedetect', '-f', 'null', '-'], {
          signal: ctx.signal,
          duration: src.duration,
          onProgress: (f) => ctx.progress(f * 0.3, `Misura volume ${Math.round(f * 100)}%`)
        })
        const m = /mean_volume:\s*(-?[\d.]+) dB/.exec(err)
        mean = m ? Number(m[1]) : -25
      }
      threshold = Math.round(clamp(mean - 14, -60, -22))
      ctx.log('info', `Soglia automatica: ${threshold} dB (volume medio ${mean.toFixed(1)} dB)`)
    }

    // Rilevamento dei silenzi (risultato in cache per soglia: cambiare i tagli non richiede una nuova analisi).
    const cacheFile = path.join(ctx.nodeDir, `silences_${threshold}_${path.basename(src.path)}_${src.sizeBytes}.json`)
    let silences: Range[]
    if (fs.existsSync(cacheFile)) {
      silences = JSON.parse(fs.readFileSync(cacheFile, 'utf8'))
      ctx.log('debug', 'Silenzi letti dalla cache')
    } else {
      silences = []
      let pending: number | null = null
      await ffmpeg(ctx.tools, ['-i', src.path, '-vn', '-sn', '-af', `silencedetect=noise=${threshold}dB:d=0.15`, '-f', 'null', '-'], {
        signal: ctx.signal,
        duration: src.duration,
        onProgress: (f) => ctx.progress(0.3 + f * 0.65, `Rilevamento silenzi ${Math.round(f * 100)}%`),
        onStderr: (chunk) => {
          for (const m of chunk.matchAll(/silence_(start|end):\s*(-?[\d.]+)/g)) {
            const t = Math.max(0, Number(m[2]))
            if (m[1] === 'start') pending = t
            else if (pending !== null) {
              silences.push({ start: pending, end: t })
              pending = null
            }
          }
        }
      })
      if (pending !== null) silences.push({ start: pending, end: src.duration })
      fs.writeFileSync(cacheFile, JSON.stringify(silences))
    }

    const words = bool(s.useWords, true) ? tl.transcript?.words : undefined
    const { cuts, segments } = computeCuts({
      duration: src.duration,
      silences,
      minSilence: num(s.minSilence, 0.6),
      padding: num(s.padding, 0.12),
      minKeep: num(s.minKeep, 0.25),
      protectedRanges: ranges(s.protectedRanges),
      manualCuts: ranges(s.manualCuts),
      disabledKeys: Array.isArray(s.disabledCuts) ? (s.disabledCuts as string[]) : [],
      words
    })
    // Interseca con eventuali tagli già applicati a monte.
    const removed = subtractRanges([{ start: 0, end: src.duration }], segments)
    const finalSegs = subtractRanges(tl.segments, removed)
    const before = totalLength(tl.segments)
    const after = totalLength(finalSegs)
    const enabled = cuts.filter((c) => c.enabled)
    return {
      output: { ...tl, segments: finalSegs },
      result: {
        summary: `${enabled.length} tagli · −${formatTime(before - after)}`,
        items: [
          { label: 'Soglia', value: `${threshold} dB` },
          { label: 'Silenzi rilevati', value: String(silences.length) },
          { label: 'Tagli applicati', value: `${enabled.length} di ${cuts.length}` },
          { label: 'Durata prima', value: formatTime(before, true) },
          { label: 'Durata dopo', value: formatTime(after, true) },
          { label: 'Tempo risparmiato', value: `${(before - after).toFixed(1)} s (${before ? Math.round(((before - after) / before) * 100) : 0}%)` },
          { label: 'Parole protette', value: words ? `${words.length} (trascrizione)` : 'no (nessuna trascrizione a monte)' }
        ],
        files: [],
        data: { cuts, threshold }
      }
    }
  }
}

export const zoomNode: NodeImpl = {
  async run(_ctx, input, s) {
    const tl = requireInput(input)
    const scale = num(s.scale, 1.12)
    const ease = num(s.ease, 0)
    const x = num(s.x, 50)
    const y = num(s.y, 45)
    const zooms: ZoomEffect[] = []
    const warnings: string[] = []
    const mode = str(s.auto, 'jumpcut')
    if (mode === 'jumpcut') {
      const n = Math.max(1, Math.round(num(s.everyN, 2)))
      if (tl.segments.length < 2) warnings.push('Nessun taglio a monte: aggiungi "Taglio pause" prima di questo nodo per gli zoom alternati.')
      tl.segments.forEach((seg, i) => {
        if (Math.floor(i / n) % 2 === 1) zooms.push({ id: `auto${i}`, start: seg.start, end: seg.end, scale, x, y, ease })
      })
    } else if (mode === 'keywords') {
      const kws = str(s.keywords).split(',').map((k) => k.trim().toLowerCase()).filter(Boolean)
      const hold = num(s.keywordHold, 1.2)
      if (!tl.transcript) warnings.push('Nessuna trascrizione a monte: gli zoom sulle parole chiave richiedono il nodo "Trascrizione".')
      else if (!kws.length) warnings.push('Nessuna parola chiave indicata.')
      for (const w of tl.transcript?.words ?? []) {
        const t = w.text.toLowerCase().replace(/[^\p{L}\p{N}'-]/gu, '')
        if (kws.includes(t)) {
          const last = zooms[zooms.length - 1]
          const start = Math.max(0, w.start - 0.05)
          if (last && start < last.end) last.end = Math.max(last.end, w.start + hold)
          else zooms.push({ id: `kw${zooms.length}`, start, end: w.start + hold, scale, x, y, ease: Math.max(ease, 0.15) })
        }
      }
    }
    const manual = Array.isArray(s.zooms) ? (s.zooms as ZoomEffect[]) : []
    for (const z of manual) {
      if (!(z.end > z.start)) continue
      zooms.push({ id: z.id || `m${zooms.length}`, start: z.start, end: z.end, scale: num(z.scale, scale), x: num(z.x, x), y: num(z.y, y), ease: num(z.ease, ease) })
    }
    const kfs = (Array.isArray(s.keyframes) ? (s.keyframes as ZoomKeyframe[]) : [])
      .filter((k) => isFinite(k.t))
      .map((k) => ({ t: k.t, scale: Math.max(1, num(k.scale, 1)), x: num(k.x, 50), y: num(k.y, 50) }))
      .sort((a, b) => a.t - b.t)
    return {
      output: { ...tl, zooms: [...tl.zooms, ...zooms], zoomKeyframes: [...tl.zoomKeyframes, ...kfs], zoomSmooth: bool(s.smooth) || tl.zoomSmooth },
      result: {
        summary: `${zooms.length} zoom${kfs.length ? ` · ${kfs.length} keyframe` : ''}`,
        items: [
          { label: 'Modalità automatica', value: mode },
          { label: 'Zoom totali', value: String(zooms.length) },
          { label: 'Keyframe', value: String(kfs.length) },
          { label: 'Durata zoomata', value: `${totalLength(zooms).toFixed(1)} s` }
        ],
        files: [],
        warnings,
        data: { zooms }
      }
    }
  }
}

export interface CutPoint {
  key: string
  at: number
  gap: number
  index: number
}

export function cutPointsOf(segments: Range[]): CutPoint[] {
  const out: CutPoint[] = []
  for (let i = 0; i < segments.length - 1; i++) {
    out.push({ key: cutKey({ start: segments[i].end, end: 0 }), at: segments[i].end, gap: segments[i + 1].start - segments[i].end, index: i })
  }
  return out
}

export const transitionsNode: NodeImpl = {
  async run(_ctx, input, s) {
    const tl = requireInput(input)
    const type = str(s.type, 'fade') as XfadeType
    if (!XFADE_OPTIONS.some((o) => o.value === type)) throw new Error(`Transizione non supportata: ${type}`)
    const points = cutPointsOf(tl.segments)
    const apply = str(s.apply, 'gap')
    let chosen: CutPoint[] = []
    if (apply === 'all') chosen = points
    else if (apply === 'every') {
      const n = Math.max(1, Math.round(num(s.everyN, 4)))
      chosen = points.filter((_, i) => (i + 1) % n === 0)
    } else if (apply === 'gap') chosen = points.filter((p) => p.gap >= num(s.minGap, 2))
    else if (apply === 'selected') {
      const sel = new Set(Array.isArray(s.selected) ? (s.selected as string[]) : [])
      chosen = points.filter((p) => sel.has(p.key))
    }
    const max = Math.max(1, Math.round(num(s.maxCount, 40)))
    const warnings: string[] = []
    if (chosen.length > max) {
      warnings.push(`Limitate a ${max} transizioni (richieste ${chosen.length}).`)
      chosen = chosen.slice(0, max)
    }
    const spec: TransitionSpec = {
      type,
      duration: num(s.duration, 0.4),
      cutPoints: chosen.map((p) => p.at),
      fadeInStart: num(s.fadeInStart, 0),
      fadeOutEnd: num(s.fadeOutEnd, 0)
    }
    return {
      output: { ...tl, transitions: spec },
      result: {
        summary: `${chosen.length} transizioni · ${type}`,
        items: [
          { label: 'Punti di taglio disponibili', value: String(points.length) },
          { label: 'Transizioni applicate', value: String(chosen.length) },
          { label: 'Durata', value: `${spec.duration}s` },
          { label: 'Apertura / chiusura', value: `${spec.fadeInStart}s / ${spec.fadeOutEnd}s` }
        ],
        files: [],
        warnings,
        data: { points, chosen: chosen.map((p) => p.key) }
      }
    }
  }
}
