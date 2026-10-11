import { FolderOpen, Upload } from 'lucide-react'
import type { Field } from '@shared/nodeDefs'
import type { MediaKind, NodeSettings, WorkflowNode } from '@shared/types'
import { api } from '../../lib/util'
import { importMedia, updateNodeSettings, useStore } from '../../store/store'
import { CustomEditor } from '../editors/CustomEditors'

const MEDIA_FILTERS: Record<MediaKind, { name: string; extensions: string[] }[]> = {
  video: [{ name: 'Video', extensions: ['mp4', 'mov', 'm4v', 'mkv', 'webm', 'avi', 'mts', 'm2ts'] }],
  audio: [{ name: 'Audio', extensions: ['mp3', 'wav', 'm4a', 'aac', 'flac', 'ogg', 'opus'] }],
  image: [{ name: 'Immagini', extensions: ['png', 'jpg', 'jpeg', 'webp', 'bmp'] }]
}

export function NumberInput({
  value, onChange, min, max, step, className
}: {
  value: number
  onChange: (v: number) => void
  min?: number
  max?: number
  step?: number
  className?: string
}): React.JSX.Element {
  return (
    <input
      className={className ?? 'input sm num'}
      type="number"
      value={Number.isFinite(value) ? value : 0}
      min={min}
      max={max}
      step={step ?? 0.1}
      onChange={(e) => {
        const v = Number(e.target.value)
        if (Number.isFinite(v)) onChange(v)
      }}
    />
  )
}

export function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: React.ReactNode }): React.JSX.Element {
  return (
    <label className="toggle-field">
      <span className="switch">
        <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
        <span />
      </span>
      {label}
    </label>
  )
}

export function MediaSelect({ kind, value, onChange }: { kind: MediaKind; value: string; onChange: (id: string) => void }): React.JSX.Element {
  const media = useStore((s) => s.project?.media ?? [])
  const items = media.filter((m) => m.kind === kind)
  const pick = async (): Promise<void> => {
    const files = await api.openFiles({ title: 'Importa file', filters: MEDIA_FILTERS[kind], multi: false })
    if (!files[0]) return
    await importMedia(files)
    const m = useStore.getState().project?.media.find((x) => x.path === files[0])
    if (m) onChange(m.id)
  }
  return (
    <div className="row">
      <select className="select" value={value} onChange={(e) => onChange(e.target.value)}>
        <option value="">{items.length ? '— nessuno —' : 'Nessun file nel progetto'}</option>
        {items.map((m) => (
          <option key={m.id} value={m.id}>
            {m.missing ? '⚠ ' : ''}
            {m.name}
          </option>
        ))}
      </select>
      <button className="btn icon" title="Importa un nuovo file" onClick={pick}>
        <Upload size={14} />
      </button>
    </div>
  )
}

export function FieldView({ field, node }: { field: Field; node: WorkflowNode }): React.JSX.Element | null {
  const s = node.settings
  if (field.visibleIf && !field.visibleIf(s)) return null
  if (field.kind === 'section') return <div className="section-title">{field.label}</div>
  const v = s[field.key]
  const set = (val: unknown, coalesce?: string): void => updateNodeSettings(node.id, { [field.key]: val } as NodeSettings, coalesce)
  const help = 'help' in field && field.help ? <div className="help">{field.help}</div> : null

  switch (field.kind) {
    case 'toggle':
      return (
        <>
          <Toggle checked={!!v} onChange={(c) => set(c)} label={field.label} />
          {help}
        </>
      )
    case 'number':
      return (
        <div className="field">
          <label>{field.label}</label>
          <div className="row">
            <NumberInput className="input sm" value={Number(v)} min={field.min} max={field.max} step={field.step} onChange={(n) => set(n)} />
            {field.unit && <span className="dim small">{field.unit}</span>}
          </div>
          {help}
        </div>
      )
    case 'slider': {
      const n = Number(v)
      return (
        <div className="field">
          <label>{field.label}</label>
          <div className="slider-row">
            <input type="range" min={field.min} max={field.max} step={field.step} value={n} onChange={(e) => set(Number(e.target.value))} />
            <span className="slider-value">
              {Number.isInteger(field.step) ? n : n.toFixed(field.step < 0.1 ? 2 : 1)}
              {field.unit ? ` ${field.unit}` : ''}
            </span>
          </div>
          {help}
        </div>
      )
    }
    case 'select':
      return (
        <div className="field">
          <label>{field.label}</label>
          <select
            className="select"
            value={String(v)}
            onChange={(e) => {
              const opt = field.options.find((o) => String(o.value) === e.target.value)
              set(opt ? opt.value : e.target.value)
            }}
          >
            {field.options.map((o) => (
              <option key={String(o.value)} value={String(o.value)}>
                {o.label}
              </option>
            ))}
          </select>
          {help}
        </div>
      )
    case 'text':
      return (
        <div className="field">
          <label>{field.label}</label>
          <input className="input" value={String(v ?? '')} placeholder={field.placeholder} onChange={(e) => set(e.target.value)} />
          {help}
        </div>
      )
    case 'textarea':
      return (
        <div className="field">
          <label>{field.label}</label>
          <textarea className="textarea" rows={field.rows ?? 3} value={String(v ?? '')} placeholder={field.placeholder} onChange={(e) => set(e.target.value)} />
          {help}
        </div>
      )
    case 'color':
      return (
        <div className="field">
          <label>{field.label}</label>
          <div className="color-row">
            <input type="color" value={String(v || '#ffffff')} onChange={(e) => set(e.target.value.toUpperCase())} />
            <input className="input sm mono" style={{ width: 100 }} value={String(v ?? '')} onChange={(e) => set(e.target.value)} />
          </div>
          {help}
        </div>
      )
    case 'media':
      return (
        <div className="field">
          <label>{field.label}</label>
          <MediaSelect kind={field.mediaKind} value={String(v ?? '')} onChange={(id) => set(id)} />
          {help}
        </div>
      )
    case 'savePath':
      return (
        <div className="field">
          <label>{field.label}</label>
          <div className="row">
            <input className="input" value={String(v ?? '')} placeholder="(cartella export del progetto)" onChange={(e) => set(e.target.value)} />
            <button
              className="btn icon"
              title="Scegli destinazione"
              onClick={async () => {
                const p = await api.saveFile({
                  title: 'Destinazione del video',
                  defaultPath: String(v || 'video_montato.mp4'),
                  filters: [{ name: 'Video MP4', extensions: ['mp4'] }, { name: 'QuickTime', extensions: ['mov'] }, { name: 'Matroska', extensions: ['mkv'] }]
                })
                if (p) set(p)
              }}
            >
              <FolderOpen size={14} />
            </button>
          </div>
          {help}
        </div>
      )
    case 'custom':
      return <CustomEditor editor={field.editor} node={node} fieldKey={field.key} label={field.label} />
  }
}
