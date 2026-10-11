import { AlertCircle, AlertTriangle, ExternalLink, Film, FolderSearch, Headphones, Lightbulb, MousePointerClick, Play, Power, RotateCcw, Sparkles } from 'lucide-react'
import { NODE_DEFS } from '@shared/nodeDefs'
import type { WorkflowNode } from '@shared/types'
import { NodeIcon } from '../lib/icons'
import { STATUS_LABEL, api, basename, mediaUrl } from '../lib/util'
import { useNodeStatus } from '../store/hooks'
import {
  audioPreview, openSettings, patchNode, renderPreview, runNodes, seekSource, showFileInPreview, updateNodeSettings, useStore
} from '../store/store'
import { FieldView } from './fields/Fields'

export function PropertiesPanel(): React.JSX.Element {
  const selected = useStore((s) => s.selected)
  const node = useStore((s) => s.project?.workflow.nodes.find((n) => n.id === s.selected))
  if (!selected || !node) {
    return (
      <div className="panel grow">
        <div className="panel-head"><span className="title">Proprietà</span></div>
        <div className="empty" style={{ marginTop: 40 }}>
          <MousePointerClick size={26} />
          <div>Seleziona un nodo per modificarne le impostazioni e vedere il risultato.</div>
        </div>
      </div>
    )
  }
  return <NodeProperties key={node.id} node={node} />
}

const PREVIEWABLE = new Set(['voiceover', 'silence', 'subtitles', 'texts', 'zoom', 'audio', 'music', 'transitions', 'endscreen', 'export'])

function NodeProperties({ node }: { node: WorkflowNode }): React.JSX.Element {
  const def = NODE_DEFS[node.type]
  const status = useNodeStatus(node.id)
  const rt = useStore((s) => s.runtimes[node.id])
  const running = useStore((s) => s.running)
  const playerTime = useStore((s) => s.playerTime)
  const tools = useStore((s) => s.tools)
  const result = rt?.result

  const needsWhisper =
    node.type === 'transcribe' &&
    ((node.settings.engine ?? 'whisper.cpp') === 'whisper.cpp' ? !(tools?.whisperCpp.ok && tools?.whisperModel.ok) : !tools?.fasterWhisper.ok)

  return (
    <div className="panel grow">
      <div className="props-head">
        <div className="row" style={{ alignItems: 'flex-start', gap: 10 }}>
          <div className="big-icon"><NodeIcon type={node.type} size={19} /></div>
          <div className="grow" style={{ minWidth: 0 }}>
            <input
              className="props-title"
              value={node.label ?? def.name}
              onChange={(e) => patchNode(node.id, { label: e.target.value }, `${node.id}:label`)}
              title="Rinomina il nodo"
            />
            <div className="row" style={{ marginTop: 3 }}>
              <span className={`badge st-${status}`}><span className="dot" />{STATUS_LABEL[status]}</span>
              <span className="tiny dim">{def.category}</span>
              {node.bypass && <span className="badge">disattivato</span>}
            </div>
          </div>
        </div>
        <div className="small muted" style={{ marginTop: 10 }}>{def.description}</div>
        {def.requires && (
          <div className="callout" style={{ marginTop: 10 }}>
            <Lightbulb size={14} />
            <div className="txt tiny">{def.requires}</div>
          </div>
        )}
        <div className="props-actions">
          {status === 'error' ? (
            <button className="btn sm primary" disabled={running} onClick={() => runNodes([node.id], true)}>
              <RotateCcw size={13} /> Riprova
            </button>
          ) : (
            <button className="btn sm primary" disabled={running} onClick={() => runNodes([node.id], status === 'done')}>
              <Play size={13} fill="currentColor" /> {status === 'done' ? 'Riesegui' : 'Esegui nodo'}
            </button>
          )}
          {PREVIEWABLE.has(node.type) && (
            <>
              <button className="btn sm" disabled={running} title="Anteprima di 10 secondi dalla posizione attuale" onClick={() => renderPreview(node.id, 10, playerTime)}>
                <Film size={13} /> Anteprima 10 s
              </button>
              <button className="btn sm" disabled={running} title="Anteprima a bassa risoluzione dell'intero video fino a questo nodo" onClick={() => renderPreview(node.id, 0)}>
                <Film size={13} /> Completa
              </button>
            </>
          )}
          {(node.type === 'audio' || node.type === 'music' || node.type === 'voiceover') && (
            <button className="btn sm" disabled={running} title="Confronta audio originale ed elaborato (15 s dalla posizione attuale)" onClick={() => audioPreview(node.id, 15)}>
              <Headphones size={13} /> Ascolta A/B
            </button>
          )}
          {def.hasInput && def.hasOutput && (
            <button className="btn sm ghost" onClick={() => patchNode(node.id, { bypass: !node.bypass })} title="Disattiva il nodo senza eliminarlo">
              <Power size={13} /> {node.bypass ? 'Riattiva' : 'Disattiva'}
            </button>
          )}
        </div>
      </div>
      <div className="panel-body pad">
        {needsWhisper && (
          <div className="callout warn" style={{ marginBottom: 12 }}>
            <AlertTriangle size={14} />
            <div className="txt">
              Il motore di trascrizione non è configurato o non funziona
              {tools?.whisperCpp.error && node.settings.engine !== 'faster-whisper' ? `: ${tools.whisperCpp.error}` : '.'}{' '}
              <button className="btn xs" onClick={() => openSettings(true)}>Apri impostazioni</button>
            </div>
          </div>
        )}
        {node.type === 'voiceover' && !tools?.piper.ok && (
          <div className="callout warn" style={{ marginBottom: 12 }}>
            <AlertTriangle size={14} />
            <div className="txt">
              Per generare la voce installa Piper e scarica una voce.{' '}
              <button className="btn xs" onClick={() => openSettings(true)}>Apri impostazioni</button>
            </div>
          </div>
        )}
        {status === 'error' && rt?.error && (
          <div className="callout err" style={{ marginBottom: 12 }}>
            <AlertCircle size={14} />
            <div className="txt selectable">{rt.error}</div>
          </div>
        )}
        {status === 'running' && (
          <div className="callout info" style={{ marginBottom: 12 }}>
            <div className="txt">
              <div className="row small" style={{ marginBottom: 6 }}>
                <span className="grow">{rt?.message ?? 'Elaborazione…'}</span>
                <b>{Math.round((rt?.progress ?? 0) * 100)}%</b>
              </div>
              <div className="progress"><div style={{ width: `${Math.round((rt?.progress ?? 0) * 100)}%` }} /></div>
            </div>
          </div>
        )}
        {status === 'stale' && (
          <div className="callout warn" style={{ marginBottom: 12 }}>
            <AlertTriangle size={14} />
            <div className="txt">Impostazioni modificate dopo l'ultima esecuzione: il nodo e i successivi verranno rieseguiti.</div>
          </div>
        )}
        <AudioAB nodeId={node.id} />
        {node.type === 'subtitles' && <KeywordSuggestions node={node} />}
        {def.fields.map((f) => (
          <FieldView key={f.key} field={f} node={node} />
        ))}
        {result && (
          <>
            <div className="section-title">Risultato</div>
            <div className="kv">
              {result.items.map((it) => (
                <FragmentKV key={it.label} k={it.label} v={it.value} />
              ))}
            </div>
            {result.warnings?.map((w) => (
              <div key={w} className="callout warn" style={{ marginTop: 8 }}>
                <AlertTriangle size={14} /> <div className="txt">{w}</div>
              </div>
            ))}
            {!!result.files.length && (
              <div className="list" style={{ marginTop: 10 }}>
                {result.files.map((f) => (
                  <div key={f.path} className="list-row">
                    <span className="grow ellipsis" title={f.path}>{f.label} · <span className="dim">{basename(f.path)}</span></span>
                    {/\.(mp4|mov|mkv)$/i.test(f.path) && (
                      <button className="btn xs" onClick={() => showFileInPreview(f.path, f.label, node.id)}>
                        <Play size={11} /> Riproduci
                      </button>
                    )}
                    <button className="btn ghost icon xs" title="Apri" onClick={() => void api.openPath(f.path)}><ExternalLink size={12} /></button>
                    <button className="btn ghost icon xs" title="Mostra nella cartella" onClick={() => void api.showItem(f.path)}><FolderSearch size={12} /></button>
                  </div>
                ))}
              </div>
            )}
            {node.type === 'analyze' && Array.isArray(result.data?.thumbnails) && (
              <div className="thumbs" style={{ marginTop: 10 }}>
                {(result.data!.thumbnails as string[]).map((t, i, arr) => (
                  <img
                    key={t}
                    src={mediaUrl(t, rt?.finishedAt)}
                    title="Vai a questo punto"
                    onClick={() => {
                      const tl = useStore.getState().outputs[node.id]
                      const d = tl?.source.duration
                      if (d) seekSource(((i + 0.5) * d) / arr.length)
                    }}
                  />
                ))}
              </div>
            )}
            {rt?.finishedAt && rt.startedAt && (
              <div className="tiny dim" style={{ marginTop: 10 }}>
                Eseguito {new Date(rt.finishedAt).toLocaleString()} in {((rt.finishedAt - rt.startedAt) / 1000).toFixed(1)} s
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

function FragmentKV({ k, v }: { k: string; v: string }): React.JSX.Element {
  return (
    <>
      <div className="k">{k}</div>
      <div className="v">{v}</div>
    </>
  )
}

function AudioAB({ nodeId }: { nodeId: string }): React.JSX.Element | null {
  const ab = useStore((s) => (s.audioAB?.nodeId === nodeId ? s.audioAB : null))
  if (!ab) return null
  return (
    <div className="card" style={{ marginBottom: 12 }}>
      <div className="small" style={{ fontWeight: 600, marginBottom: 6 }}>Confronto audio</div>
      <div className="tiny dim">A · originale</div>
      <audio controls src={mediaUrl(ab.original)} style={{ width: '100%', height: 32 }} />
      <div className="tiny dim" style={{ marginTop: 6 }}>B · elaborato</div>
      <audio controls src={mediaUrl(ab.processed)} style={{ width: '100%', height: 32 }} />
    </div>
  )
}

function KeywordSuggestions({ node }: { node: WorkflowNode }): React.JSX.Element | null {
  const sugg = useStore((s) => s.runtimes[node.id]?.result?.data?.suggestions as string[] | undefined)
  if (!sugg?.length) return null
  const cur = String(node.settings.keywords ?? '')
  const list = cur.split(',').map((x) => x.trim()).filter(Boolean)
  return (
    <div className="card" style={{ marginBottom: 12 }}>
      <div className="row small" style={{ fontWeight: 600, marginBottom: 6 }}>
        <Sparkles size={13} color="var(--accent)" /> Parole frequenti nel parlato
      </div>
      <div className="row wrap" style={{ gap: 4 }}>
        {sugg.map((w) => (
          <button
            key={w}
            className={`btn xs ${list.includes(w) ? 'active' : ''}`}
            onClick={() => updateNodeSettings(node.id, { keywords: (list.includes(w) ? list.filter((x) => x !== w) : [...list, w]).join(', ') })}
          >
            {w}
          </button>
        ))}
      </div>
      <div className="help" style={{ marginTop: 6 }}>Clic per aggiungerle o toglierle dalle parole evidenziate.</div>
    </div>
  )
}
