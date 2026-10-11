import { useEffect, useMemo, useRef, useState } from 'react'
import { ExternalLink, Film, MonitorPlay } from 'lucide-react'
import { parentOf } from '@shared/graph'
import { computeLayout, formatTime, mapStartToOutput, outputToSource, sourceToOutput, type Layout } from '@shared/timeline'
import type { Timeline } from '@shared/types'
import { api, clsx, mediaUrl } from '../lib/util'
import { useNodeOutput } from '../store/hooks'
import { loadSourcePreview, setPlayerTime, showLastResult, useStore } from '../store/store'
import { TimelineStrip } from './TimelineStrip'

/** Nodo di cui mostrare la timeline: il selezionato o il primo antenato completato. */
function useStripNode(): string | null {
  const selected = useStore((s) => s.selected)
  const project = useStore((s) => s.project)
  const runtimes = useStore((s) => s.runtimes)
  return useMemo(() => {
    if (!project) return null
    const wf = project.workflow
    let id: string | undefined = selected ?? undefined
    if (!id) {
      const last = [...wf.nodes].reverse().find((n) => runtimes[n.id]?.status === 'done' && n.type !== 'export')
      return last?.id ?? null
    }
    const seen = new Set<string>()
    while (id && !seen.has(id)) {
      seen.add(id)
      const n = wf.nodes.find((x) => x.id === id)
      if (n && n.type !== 'export' && runtimes[id]?.status === 'done') return id
      id = parentOf(wf, id)?.id
    }
    return null
  }, [selected, project, runtimes])
}

export function PreviewPanel(): React.JSX.Element {
  const preview = useStore((s) => s.preview)
  const lastResult = useStore((s) => s.lastResult)
  const busy = useStore((s) => s.previewBusy)
  const seek = useStore((s) => s.seekRequest)
  const playerTime = useStore((s) => s.playerTime)
  const workflow = useStore((s) => s.project?.workflow)
  const videoRef = useRef<HTMLVideoElement>(null)
  const [err, setErr] = useState<string | null>(null)
  const [outTime, setOutTime] = useState<number | null>(null)

  // Timeline del video mostrato (per mappare i tempi dell'anteprima su quelli originali).
  const pvNodeId = preview?.nodeId
    ? workflow?.nodes.find((n) => n.id === preview.nodeId)?.type === 'export'
      ? parentOf(workflow!, preview.nodeId)?.id
      : preview.nodeId
    : undefined
  const pvTimeline = useNodeOutput(pvNodeId)
  const pvLayout: Layout | null = useMemo(
    () => (pvTimeline ? computeLayout(pvTimeline.segments, pvTimeline.source.fps, pvTimeline.transitions, pvTimeline.endscreen) : null),
    [pvTimeline]
  )

  const stripNode = useStripNode()
  const stripTl: Timeline | null = useNodeOutput(stripNode)

  useEffect(() => setErr(null), [preview?.path, preview?.stamp])

  // Aggiorna il tempo sorgente corrente durante la riproduzione.
  useEffect(() => {
    const v = videoRef.current
    if (!v) return
    let raf = 0
    const tick = (): void => {
      const t = v.currentTime
      if (!preview || preview.kind === 'source') {
        setPlayerTime(t)
        setOutTime(null)
      } else if (pvLayout) {
        const ot = (preview.fromOutput ?? 0) + t
        setOutTime(ot)
        const st = outputToSource(pvLayout, ot)
        if (st !== null) setPlayerTime(st)
      } else setOutTime(t)
      if (!v.paused) raf = requestAnimationFrame(tick)
    }
    const onPlay = (): void => {
      raf = requestAnimationFrame(tick)
    }
    v.addEventListener('timeupdate', tick)
    v.addEventListener('seeked', tick)
    v.addEventListener('play', onPlay)
    return () => {
      cancelAnimationFrame(raf)
      v.removeEventListener('timeupdate', tick)
      v.removeEventListener('seeked', tick)
      v.removeEventListener('play', onPlay)
    }
  }, [preview, pvLayout])

  // Richieste di posizionamento (tempo sorgente).
  useEffect(() => {
    const v = videoRef.current
    if (!seek || !v) return
    if (!preview || preview.kind === 'source') {
      v.currentTime = seek.time
      setPlayerTime(seek.time)
    } else if (pvLayout) {
      const ot = sourceToOutput(pvLayout, seek.time) ?? mapStartToOutput(pvLayout, seek.time)
      if (ot !== null) {
        const local = ot - (preview.fromOutput ?? 0)
        if (local >= 0 && local <= (v.duration || Infinity)) v.currentTime = local
      }
      setPlayerTime(seek.time)
    }
  }, [seek, preview, pvLayout])

  return (
    <>
      <div className="panel-head">
        <MonitorPlay size={14} />
        <span className="title ellipsis">{preview?.label ?? 'Anteprima'}</span>
        <span className="spacer" />
        <div className="seg">
          <button className={clsx(preview?.kind === 'source' && 'on')} onClick={() => void loadSourcePreview()}>
            Originale
          </button>
          <button className={clsx(!!preview && preview.kind !== 'source' && 'on')} disabled={!lastResult} onClick={showLastResult} title="Ultima anteprima renderizzata o video esportato">
            Risultato
          </button>
        </div>
        {preview && (
          <button className="btn ghost icon xs" title="Apri nel lettore di sistema" onClick={() => void api.openPath(preview.path)}>
            <ExternalLink size={12} />
          </button>
        )}
      </div>
      <div className="player">
        {preview ? (
          <video
            key={preview.path + preview.stamp}
            ref={videoRef}
            src={mediaUrl(preview.path, preview.stamp)}
            controls
            preload="metadata"
            onError={() =>
              setErr(
                preview.kind === 'source'
                  ? 'Questo formato non è riproducibile nell\'app. Esegui il nodo "Importa video": verrà creato un proxy di anteprima.'
                  : 'Impossibile riprodurre il file.'
              )
            }
          />
        ) : (
          <div className="player-empty">
            <Film size={28} style={{ marginBottom: 8 }} />
            <div>Importa un video per vederlo qui.</div>
            <div className="tiny">Le anteprime dei nodi vengono renderizzate a bassa risoluzione con FFmpeg.</div>
          </div>
        )}
        {err && <div className="player-overlay">{err}</div>}
        {busy && (
          <div className="player-overlay">
            <div className="row" style={{ marginBottom: 6 }}>
              <span className="grow">{busy.message ?? 'Rendering anteprima…'}</span>
              <b>{Math.round(busy.progress * 100)}%</b>
            </div>
            <div className={clsx('progress', busy.progress <= 0.001 && 'indet')}>
              <div style={{ width: `${Math.round(busy.progress * 100)}%` }} />
            </div>
          </div>
        )}
      </div>
      <div className="player-bar">
        <span className="timecode" title="Posizione nel video originale">
          Originale {formatTime(playerTime, true)}
        </span>
        {outTime !== null && (
          <span className="timecode" title="Posizione nel video montato">
            Montato {formatTime(outTime, true)}
          </span>
        )}
        <span className="spacer" />
        {stripTl && (
          <span className="tiny dim">
            {stripTl.segments.length} segmenti · {formatTime(computeLayout(stripTl.segments, stripTl.source.fps).mainDuration)} dopo i tagli
          </span>
        )}
      </div>
      <TimelineStrip timeline={stripTl} playerTime={playerTime} />
    </>
  )
}
