// Striscia temporale (tempo del video originale): forma d'onda, parti tagliate,
// sottotitoli, elementi grafici, zoom e cambi scena. Clic per posizionarsi.

import { useEffect, useRef, useState } from 'react'
import { complementRanges, formatTime } from '@shared/timeline'
import type { Timeline } from '@shared/types'
import { api } from '../lib/util'
import { seekSource } from '../store/store'

const waveCache = new Map<string, number[]>()

function cssVar(name: string): string {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || '#888'
}

export function TimelineStrip({ timeline, playerTime }: { timeline: Timeline | null; playerTime: number }): React.JSX.Element {
  const ref = useRef<HTMLCanvasElement>(null)
  const wrap = useRef<HTMLDivElement>(null)
  const [peaks, setPeaks] = useState<number[] | null>(null)
  const [hover, setHover] = useState<number | null>(null)
  const [size, setSize] = useState({ w: 0, h: 0 })
  const wfPath = timeline?.analysis.waveformPath

  useEffect(() => {
    if (!wfPath) return setPeaks(null)
    const c = waveCache.get(wfPath)
    if (c) return setPeaks(c)
    void api.readJson<{ peaks: number[] }>(wfPath).then((j) => {
      if (j?.peaks) {
        waveCache.set(wfPath, j.peaks)
        setPeaks(j.peaks)
      }
    })
  }, [wfPath])

  useEffect(() => {
    const el = wrap.current
    if (!el) return
    const ro = new ResizeObserver(() => setSize({ w: el.clientWidth, h: el.clientHeight }))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const duration = timeline?.source.duration ?? 0

  useEffect(() => {
    const cv = ref.current
    if (!cv || !size.w) return
    const dpr = window.devicePixelRatio || 1
    cv.width = size.w * dpr
    cv.height = size.h * dpr
    const ctx = cv.getContext('2d')!
    ctx.scale(dpr, dpr)
    const W = size.w
    const H = size.h
    ctx.clearRect(0, 0, W, H)
    if (!timeline || duration <= 0) {
      ctx.fillStyle = cssVar('--text-3')
      ctx.font = '11px sans-serif'
      ctx.fillText('Esegui "Importa video" e "Analisi" per vedere la timeline', 12, H / 2 + 4)
      return
    }
    const x = (t: number): number => (t / duration) * W
    const waveTop = 14
    const waveH = H - 34
    // Forma d'onda
    if (peaks?.length) {
      ctx.fillStyle = cssVar('--text-3')
      const n = peaks.length
      const step = Math.max(1, Math.floor(n / W))
      for (let px = 0; px < W; px++) {
        const i0 = Math.floor((px / W) * n)
        let m = 0
        for (let i = i0; i < Math.min(n, i0 + step); i++) m = Math.max(m, peaks[i])
        const h = Math.max(1, m * waveH)
        ctx.fillRect(px, waveTop + (waveH - h) / 2, 1, h)
      }
    } else {
      ctx.fillStyle = cssVar('--border')
      ctx.fillRect(0, waveTop + waveH / 2, W, 1)
    }
    // Parti tagliate
    const cuts = complementRanges(timeline.segments, { start: 0, end: duration })
    ctx.fillStyle = 'rgba(255, 90, 95, 0.22)'
    for (const c of cuts) ctx.fillRect(x(c.start), 0, Math.max(1, x(c.end) - x(c.start)), H - 18)
    ctx.fillStyle = cssVar('--err')
    for (const c of cuts) ctx.fillRect(x(c.start), 0, Math.max(1, x(c.end) - x(c.start)), 3)
    // Segmenti mantenuti
    ctx.fillStyle = cssVar('--ok')
    for (const s of timeline.segments) ctx.fillRect(x(s.start), 0, Math.max(1, x(s.end) - x(s.start)), 3)
    // Zoom
    ctx.fillStyle = 'rgba(106, 168, 255, 0.55)'
    for (const z of timeline.zooms) ctx.fillRect(x(z.start), 6, Math.max(1, x(z.end) - x(z.start)), 4)
    // Sottotitoli
    ctx.fillStyle = cssVar('--accent')
    for (const c of timeline.subtitles?.cues ?? []) ctx.fillRect(x(c.start), H - 16, Math.max(1, x(c.end) - x(c.start) - 1), 5)
    // Elementi grafici
    ctx.fillStyle = cssVar('--warn')
    for (const o of timeline.overlays) ctx.fillRect(x(o.start), H - 9, Math.max(2, x(o.start + o.duration) - x(o.start)), 5)
    // Cambi scena
    ctx.fillStyle = cssVar('--text-2')
    for (const s of timeline.analysis.scenes ?? []) ctx.fillRect(x(s), waveTop, 1, waveH)
    // Testina
    const px = x(playerTime)
    ctx.fillStyle = cssVar('--accent')
    ctx.fillRect(px - 1, 0, 2, H)
    ctx.beginPath()
    ctx.moveTo(px - 5, 0)
    ctx.lineTo(px + 5, 0)
    ctx.lineTo(px, 6)
    ctx.fill()
    if (hover !== null) {
      ctx.fillStyle = cssVar('--text')
      ctx.globalAlpha = 0.35
      ctx.fillRect(x(hover), 0, 1, H)
      ctx.globalAlpha = 1
    }
  }, [timeline, peaks, size, playerTime, hover, duration])

  const timeAt = (e: React.MouseEvent): number => {
    const r = (e.currentTarget as HTMLElement).getBoundingClientRect()
    return Math.max(0, Math.min(duration, ((e.clientX - r.left) / r.width) * duration))
  }

  return (
    <>
      <div
        className="strip"
        ref={wrap}
        onClick={(e) => duration > 0 && seekSource(timeAt(e))}
        onMouseMove={(e) => duration > 0 && setHover(timeAt(e))}
        onMouseLeave={() => setHover(null)}
        title={hover !== null ? formatTime(hover, true) : undefined}
      >
        <canvas ref={ref} />
      </div>
      <div className="strip-legend">
        <span><i style={{ background: 'var(--ok)' }} />mantenuto</span>
        <span><i style={{ background: 'var(--err)' }} />tagliato</span>
        <span><i style={{ background: 'var(--accent)' }} />sottotitoli</span>
        <span><i style={{ background: 'var(--warn)' }} />grafiche</span>
        <span><i style={{ background: 'rgba(106,168,255,.8)' }} />zoom</span>
        <span className="spacer" />
        {hover !== null && <span className="mono">{formatTime(hover, true)}</span>}
      </div>
    </>
  )
}
