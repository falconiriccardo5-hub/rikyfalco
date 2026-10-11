import { useEffect, useState } from 'react'
import { AlertTriangle, FileAudio, FileImage, FileVideo, FolderSearch, Link2, Plus, Trash2, Upload, Download as DownloadIcon, Save, FileInput } from 'lucide-react'
import type { MediaItem, NodeType, WorkflowTemplate } from '@shared/types'
import { NODE_DEFS, NODE_ORDER } from '@shared/nodeDefs'
import { formatTime } from '@shared/timeline'
import { cloneWorkflowForProject } from '../lib/workflow'
import { NodeIcon } from '../lib/icons'
import { api, clsx, mediaUrl } from '../lib/util'
import { addNode, importMedia, loadWorkflow, relinkMedia, removeMedia, toast, useStore } from '../store/store'

const FILTERS = [
  { name: 'Video, audio e immagini', extensions: ['mp4', 'mov', 'm4v', 'mkv', 'webm', 'avi', 'mts', 'm2ts', 'mp3', 'wav', 'm4a', 'aac', 'flac', 'ogg', 'opus', 'png', 'jpg', 'jpeg', 'webp'] },
  { name: 'Tutti i file', extensions: ['*'] }
]

export function ProjectPanel(): React.JSX.Element {
  const [tab, setTab] = useState<'media' | 'nodes' | 'templates'>(() => (localStorage.getItem('leftTab') as 'media') || 'media')
  useEffect(() => localStorage.setItem('leftTab', tab), [tab])
  return (
    <div className="panel grow">
      <div className="tabs">
        <button className={clsx(tab === 'media' && 'on')} onClick={() => setTab('media')}>Progetto</button>
        <button className={clsx(tab === 'nodes' && 'on')} onClick={() => setTab('nodes')}>Nodi</button>
        <button className={clsx(tab === 'templates' && 'on')} onClick={() => setTab('templates')}>Modelli</button>
      </div>
      <div className="panel-body" style={{ padding: '0 8px 8px' }}>
        {tab === 'media' && <MediaLibrary />}
        {tab === 'nodes' && <NodePalette />}
        {tab === 'templates' && <Templates />}
      </div>
    </div>
  )
}

function MediaLibrary(): React.JSX.Element {
  const media = useStore((s) => s.project?.media ?? [])
  const [over, setOver] = useState(false)
  const pick = async (): Promise<void> => {
    const files = await api.openFiles({ title: 'Importa file nel progetto', filters: FILTERS, multi: true })
    await importMedia(files)
  }
  const onDrop = (e: React.DragEvent): void => {
    e.preventDefault()
    setOver(false)
    const paths = Array.from(e.dataTransfer.files).map((f) => api.pathForFile(f)).filter(Boolean)
    void importMedia(paths)
  }
  const groups: [string, MediaItem[]][] = [
    ['Video', media.filter((m) => m.kind === 'video')],
    ['Audio', media.filter((m) => m.kind === 'audio')],
    ['Immagini', media.filter((m) => m.kind === 'image')]
  ]
  return (
    <div>
      <div
        className={clsx('dropzone', over && 'over')}
        onClick={pick}
        onDragOver={(e) => {
          e.preventDefault()
          setOver(true)
        }}
        onDragLeave={() => setOver(false)}
        onDrop={onDrop}
      >
        <Upload size={18} style={{ marginBottom: 4 }} />
        <div style={{ fontWeight: 600 }}>Importa file</div>
        <div className="tiny dim">Trascina qui MP4, MOV, MKV, audio o immagini</div>
      </div>
      {groups.map(([label, items]) =>
        items.length ? (
          <div key={label}>
            <div className="section-title">{label}</div>
            {items.map((m) => (
              <MediaRow key={m.id} m={m} />
            ))}
          </div>
        ) : null
      )}
      {!media.length && <div className="empty">Nessun file. Il video originale verrà solo letto: tutte le elaborazioni avvengono nella cartella di lavoro del progetto.</div>}
    </div>
  )
}

function MediaRow({ m }: { m: MediaItem }): React.JSX.Element {
  const Icon = m.kind === 'video' ? FileVideo : m.kind === 'audio' ? FileAudio : FileImage
  const info = m.info
  const meta = info
    ? m.kind === 'image'
      ? `${info.width}×${info.height}`
      : `${formatTime(info.duration)}${info.hasVideo && m.kind === 'video' ? ` · ${info.width}×${info.height} · ${info.fps} fps` : ''}`
    : ''
  return (
    <div
      className={clsx('media-item', m.missing && 'missing')}
      draggable
      onDragStart={(e) => e.dataTransfer.setData('application/flowcut-media', m.id)}
      title={m.path}
    >
      <div className="thumb">{m.kind === 'image' && !m.missing ? <img src={mediaUrl(m.path)} alt="" /> : <Icon size={15} />}</div>
      <div className="meta">
        <div className="ellipsis" style={{ fontWeight: 500 }}>{m.name}</div>
        <div className="ellipsis tiny dim">
          {m.missing ? (
            <span className="row" style={{ gap: 4, color: 'var(--err)' }}>
              <AlertTriangle size={11} /> File mancante
            </span>
          ) : (
            meta
          )}
        </div>
      </div>
      <div className="acts">
        {m.missing && (
          <button className="btn ghost icon xs" title="Ricollega file" onClick={() => void relinkMedia(m.id)}>
            <Link2 size={13} />
          </button>
        )}
        {!m.missing && (
          <button className="btn ghost icon xs" title="Mostra nella cartella" onClick={() => void api.showItem(m.path)}>
            <FolderSearch size={13} />
          </button>
        )}
        <button
          className="btn ghost icon xs"
          title="Rimuovi dal progetto (il file non viene cancellato)"
          onClick={() => {
            if (confirm(`Rimuovere "${m.name}" dal progetto? Il file su disco non verrà cancellato.`)) removeMedia(m.id)
          }}
        >
          <Trash2 size={13} />
        </button>
      </div>
    </div>
  )
}

function NodePalette(): React.JSX.Element {
  const cats = [...new Set(NODE_ORDER.map((t) => NODE_DEFS[t].category))]
  return (
    <div>
      <div className="tiny dim" style={{ padding: '4px 4px 0' }}>
        Trascina un nodo nell'editor, oppure fai clic per inserirlo dopo il nodo selezionato.
      </div>
      {cats.map((c) => (
        <div key={c}>
          <div className="section-title">{c}</div>
          {NODE_ORDER.filter((t) => NODE_DEFS[t].category === c).map((t) => (
            <PaletteItem key={t} type={t} />
          ))}
        </div>
      ))}
    </div>
  )
}

function PaletteItem({ type }: { type: NodeType }): React.JSX.Element {
  const d = NODE_DEFS[type]
  return (
    <div
      className="palette-item"
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData('application/flowcut-node', type)
        e.dataTransfer.effectAllowed = 'move'
      }}
      onClick={() => addNode(type)}
      title={d.description}
    >
      <div className="palette-icon">
        <NodeIcon type={type} size={15} />
      </div>
      <div className="grow" style={{ minWidth: 0 }}>
        <div style={{ fontWeight: 600 }}>{d.name}</div>
        <div className="tiny dim ellipsis">{d.description}</div>
      </div>
      <Plus size={14} className="dim" />
    </div>
  )
}

function Templates(): React.JSX.Element {
  const workflow = useStore((s) => s.project?.workflow)
  const [list, setList] = useState<WorkflowTemplate[]>([])
  const [name, setName] = useState('')
  const refresh = (): void => void api.listTemplates().then(setList)
  useEffect(refresh, [])
  const save = async (): Promise<void> => {
    if (!workflow) return
    await api.saveTemplate(name || 'Il mio workflow', '', workflow)
    setName('')
    refresh()
    toast('Workflow salvato come modello', 'success')
  }
  const apply = (t: WorkflowTemplate): void => {
    if (!confirm(`Sostituire il workflow attuale con "${t.name}"? Puoi annullare con Ctrl+Z.`)) return
    loadWorkflow(cloneWorkflowForProject(t.workflow, useStore.getState().project?.media ?? []))
    toast(`Modello "${t.name}" applicato`, 'success')
  }
  return (
    <div>
      <div className="section-title">Salva il workflow attuale</div>
      <div className="tiny dim" style={{ marginBottom: 8 }}>
        Salva nodi, collegamenti e impostazioni per riutilizzarli su ogni nuovo video. I file specifici del progetto non vengono inclusi.
      </div>
      <div className="row">
        <input className="input sm" placeholder="Nome del modello" value={name} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && save()} />
        <button className="btn sm primary" onClick={save}>
          <Save size={13} /> Salva
        </button>
      </div>
      <div className="section-title">Modelli salvati</div>
      {list.map((t) => (
        <div key={t.id} className="card">
          <div className="row">
            <div className="grow" style={{ minWidth: 0 }}>
              <div className="ellipsis" style={{ fontWeight: 600 }}>{t.name}</div>
              <div className="tiny dim">{t.workflow.nodes.length} nodi · {new Date(t.createdAt).toLocaleDateString()}</div>
            </div>
            <button className="btn xs" onClick={() => apply(t)}>Applica</button>
            <button className="btn ghost icon xs" title="Esporta su file" onClick={() => void api.exportTemplate(t.id)}>
              <DownloadIcon size={12} />
            </button>
            <button
              className="btn ghost icon xs"
              title="Elimina"
              onClick={async () => {
                if (!confirm(`Eliminare il modello "${t.name}"?`)) return
                await api.deleteTemplate(t.id)
                refresh()
              }}
            >
              <Trash2 size={12} />
            </button>
          </div>
        </div>
      ))}
      {!list.length && <div className="empty">Nessun modello salvato.</div>}
      <button
        className="btn sm block"
        onClick={async () => {
          const t = await api.importTemplate()
          if (t) {
            refresh()
            toast(`Modello "${t.name}" importato`, 'success')
          }
        }}
      >
        <FileInput size={13} /> Importa modello da file…
      </button>
    </div>
  )
}
