import { useEffect, useState } from 'react'
import { ArrowRight, Clock, FolderOpen, Plus, Settings } from 'lucide-react'
import type { WorkflowTemplate } from '@shared/types'
import { NODE_DEFS, NODE_ORDER } from '@shared/nodeDefs'
import { api, basename } from '../lib/util'
import { createProject, openProject, openSettings, useStore } from '../store/store'
import { Modal } from './Modal'

export function Welcome(): React.JSX.Element {
  const settings = useStore((s) => s.settings)
  const tools = useStore((s) => s.tools)
  const [creating, setCreating] = useState(false)

  const open = async (): Promise<void> => {
    const dir = await api.openDir('Apri la cartella di un progetto FlowCut')
    if (dir) await openProject(dir)
  }

  return (
    <div className="welcome">
      <div className="welcome-card">
        <div className="hero">
          <span className="badge st-running">
            <span className="dot" /> Montaggio automatico a nodi
          </span>
          <h1>Dal girato al video finito, con un workflow.</h1>
          <p>
            Importa un video, componi le operazioni come nodi collegati e lascia che FlowCut tagli le pause, generi
            i sottotitoli, aggiunga grafiche, zoom, musica e transizioni. Tutto in locale con FFmpeg e Whisper.
          </p>
          <div className="mini-flow">
            {NODE_ORDER.map((t, i) => (
              <span key={t} className="row" style={{ gap: 6, padding: 0, border: 0, background: 'none' }}>
                <span>{NODE_DEFS[t].name}</span>
                {i < NODE_ORDER.length - 1 && <ArrowRight size={11} />}
              </span>
            ))}
          </div>
          <div className="row">
            <button className="btn primary" onClick={() => setCreating(true)}>
              <Plus size={15} /> Nuovo progetto
            </button>
            <button className="btn" onClick={open}>
              <FolderOpen size={15} /> Apri progetto
            </button>
          </div>
        </div>
        <div className="col" style={{ gap: 18 }}>
          <div className="panel">
            <div className="panel-head">
              <Clock size={14} /> <span className="title">Progetti recenti</span>
            </div>
            <div className="panel-body pad" style={{ maxHeight: 260 }}>
              {settings?.recentProjects.length ? (
                settings.recentProjects.map((d) => (
                  <div key={d} className="recent-item" onClick={() => void openProject(d)}>
                    <FolderOpen size={16} className="muted" />
                    <div className="grow">
                      <div className="ellipsis" style={{ fontWeight: 600 }}>{basename(d)}</div>
                      <div className="ellipsis tiny dim">{d}</div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="empty">Nessun progetto recente</div>
              )}
            </div>
          </div>
          <div className="panel">
            <div className="panel-head">
              <span className="title">Strumenti</span>
              <span className="spacer" />
              <button className="btn xs" onClick={() => openSettings(true)}>
                <Settings size={12} /> Configura
              </button>
            </div>
            <div className="pad">
              {!tools ? (
                <div className="dim small">Verifica in corso…</div>
              ) : (
                <>
                  <ToolLine ok={tools.ffmpeg.ok} label={`FFmpeg ${tools.ffmpeg.version ?? ''}`} hint={tools.ffmpeg.error} />
                  <ToolLine ok={tools.whisperCpp.ok && tools.whisperModel.ok} label="Trascrizione whisper.cpp" hint={tools.whisperCpp.ok ? tools.whisperModel.error : tools.whisperCpp.error} />
                  <ToolLine ok={tools.fasterWhisper.ok} label="faster-whisper (Python, opzionale)" hint={tools.fasterWhisper.error} />
                  <ToolLine ok={tools.encoders.length > 0} label={`Encoder: ${tools.encoders.join(', ') || 'nessuno'}`} />
                </>
              )}
            </div>
          </div>
        </div>
      </div>
      {creating && <NewProjectDialog onClose={() => setCreating(false)} />}
    </div>
  )
}

function ToolLine({ ok, label, hint }: { ok: boolean; label: string; hint?: string }): React.JSX.Element {
  return (
    <div className="tool-line">
      <span className={ok ? 'ok-dot' : 'no-dot'} />
      <span className="grow ellipsis">{label}</span>
      {!ok && hint && <span className="tiny dim ellipsis" style={{ maxWidth: 160 }}>{hint}</span>}
    </div>
  )
}

export function NewProjectDialog({ onClose }: { onClose: () => void }): React.JSX.Element {
  const [name, setName] = useState('Nuovo video')
  const [parent, setParent] = useState('')
  const [templates, setTemplates] = useState<WorkflowTemplate[]>([])
  const [tpl, setTpl] = useState('')
  useEffect(() => {
    void api.appInfo().then((i) => setParent((p) => p || `${i.documents}${i.platform === 'win32' ? '\\' : '/'}FlowCut`))
    void api.listTemplates().then(setTemplates)
  }, [])
  const choose = async (): Promise<void> => {
    const d = await api.openDir('Cartella in cui creare il progetto')
    if (d) setParent(d)
  }
  const create = async (): Promise<void> => {
    if (!name.trim() || !parent) return
    onClose()
    await createProject(parent, name.trim(), tpl || undefined)
  }
  return (
    <Modal
      title="Nuovo progetto"
      onClose={onClose}
      footer={
        <>
          <button className="btn" onClick={onClose}>Annulla</button>
          <button className="btn primary" onClick={create} disabled={!name.trim() || !parent}>Crea progetto</button>
        </>
      }
    >
      <div className="field">
        <label>Nome</label>
        <input className="input" autoFocus value={name} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && create()} />
      </div>
      <div className="field">
        <label>Cartella</label>
        <div className="row">
          <input className="input" value={parent} onChange={(e) => setParent(e.target.value)} />
          <button className="btn" onClick={choose}>Sfoglia…</button>
        </div>
        <div className="help">Verrà creata una sottocartella con il file di progetto e la cartella di lavoro. I video originali non vengono copiati né modificati.</div>
      </div>
      <div className="field">
        <label>Workflow iniziale</label>
        <select className="select" value={tpl} onChange={(e) => setTpl(e.target.value)}>
          <option value="">Workflow completo predefinito (12 nodi)</option>
          {templates.map((t) => (
            <option key={t.id} value={t.id}>Modello: {t.name}</option>
          ))}
        </select>
      </div>
    </Modal>
  )
}
