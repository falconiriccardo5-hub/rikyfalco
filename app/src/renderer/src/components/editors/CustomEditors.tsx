// Editor specializzati per le impostazioni complesse dei nodi.

import { useMemo, useState } from 'react'
import { ChevronDown, ChevronRight, Crosshair, Image as ImageIcon, LocateFixed, Plus, RotateCcw, Save, Scissors, Trash2, Type } from 'lucide-react'
import { formatTime } from '@shared/timeline'
import type { Field } from '@shared/nodeDefs'
import type { Cue, Keyframe, NodeSettings, Overlay, Range, TextPreset, WorkflowNode, ZoomEffect, ZoomKeyframe } from '@shared/types'
import { round } from '../../lib/util'
import { newId } from '@shared/graph'
import { seekSource, updateNodeSettings, useStore } from '../../store/store'
import { MediaSelect, NumberInput } from '../fields/Fields'

type EditorName = Extract<Field, { kind: 'custom' }>['editor']

function useResultData<T>(nodeId: string, key: string): T | undefined {
  return useStore((s) => s.runtimes[nodeId]?.result?.data?.[key] as T | undefined)
}

function usePlayer(): number {
  return useStore((s) => s.playerTime)
}

function setKey(node: WorkflowNode, key: string, value: unknown, coalesce?: string): void {
  updateNodeSettings(node.id, { [key]: value } as NodeSettings, coalesce)
}

/** Campo tempo (secondi) con pulsante "usa la posizione corrente". */
function TimeInput({ value, onChange, title }: { value: number; onChange: (v: number) => void; title?: string }): React.JSX.Element {
  const t = usePlayer()
  return (
    <div className="row" style={{ gap: 2 }}>
      <NumberInput value={round(value, 2)} step={0.05} min={0} onChange={onChange} />
      <button className="btn ghost icon xs" title={title ?? 'Usa la posizione attuale del video'} onClick={() => onChange(round(t, 2))}>
        <Crosshair size={12} />
      </button>
    </div>
  )
}

function SeekBtn({ t }: { t: number }): React.JSX.Element {
  return (
    <button className="btn ghost icon xs" title={`Vai a ${formatTime(t, true)}`} onClick={() => seekSource(t)}>
      <LocateFixed size={12} />
    </button>
  )
}

export function CustomEditor({ editor, node, fieldKey, label }: { editor: EditorName; node: WorkflowNode; fieldKey: string; label: string }): React.JSX.Element {
  switch (editor) {
    case 'cuts':
      return <CutsEditor node={node} />
    case 'ranges':
      return <RangesEditor node={node} fieldKey={fieldKey} label={label} />
    case 'cues':
      return <CuesEditor node={node} />
    case 'overlays':
      return <OverlaysEditor node={node} />
    case 'zooms':
      return <ZoomsEditor node={node} />
    case 'zoomKeyframes':
      return <ZoomKeyframesEditor node={node} />
    case 'transitionPoints':
      return <TransitionPointsEditor node={node} />
  }
}

// ------------------------------------------------------------ tagli proposti

interface CutView extends Range {
  key: string
  reason: string
}

function CutsEditor({ node }: { node: WorkflowNode }): React.JSX.Element {
  const cuts = useResultData<CutView[]>(node.id, 'cuts')
  const disabled = (node.settings.disabledCuts as string[]) ?? []
  const [limit, setLimit] = useState(150)
  if (!cuts) return <div className="callout"><Scissors size={14} /><div className="txt">Esegui il nodo per vedere i tagli proposti. Potrai escluderli uno per uno prima di esportare.</div></div>
  const on = cuts.filter((c) => !disabled.includes(c.key))
  const removed = on.reduce((s, c) => s + c.end - c.start, 0)
  const toggle = (k: string): void =>
    setKey(node, 'disabledCuts', disabled.includes(k) ? disabled.filter((x) => x !== k) : [...disabled, k], `${node.id}:cuts`)
  return (
    <div className="field">
      <div className="row small">
        <span className="muted">
          {on.length}/{cuts.length} attivi · −{removed.toFixed(1)} s
        </span>
        <span className="spacer" />
        <button className="btn xs" onClick={() => setKey(node, 'disabledCuts', [])}>Tutti</button>
        <button className="btn xs" onClick={() => setKey(node, 'disabledCuts', cuts.map((c) => c.key))}>Nessuno</button>
      </div>
      <div className="list" style={{ maxHeight: 260, overflow: 'auto' }}>
        {cuts.slice(0, limit).map((c, i) => {
          const off = disabled.includes(c.key)
          return (
            <div key={c.key} className={`list-row ${off ? 'off' : ''}`}>
              <input type="checkbox" checked={!off} onChange={() => toggle(c.key)} title={off ? 'Taglio escluso' : 'Taglio attivo'} />
              <span className="dim tiny" style={{ width: 24 }}>#{i + 1}</span>
              <span className="t grow">{formatTime(c.start, true)} → {formatTime(c.end, true)}</span>
              <span className="dim tiny">{(c.end - c.start).toFixed(2)}s{c.reason === 'manual' ? ' · man.' : ''}</span>
              <SeekBtn t={Math.max(0, c.start - 0.6)} />
            </div>
          )
        })}
      </div>
      {cuts.length > limit && <button className="btn xs" onClick={() => setLimit(limit + 300)}>Mostra altri ({cuts.length - limit})</button>}
      <div className="help">Le modifiche ai tagli rendono "da rieseguire" questo nodo e i successivi (il rilevamento dei silenzi resta in cache).</div>
    </div>
  )
}

// ------------------------------------------------------------ intervalli

function RangesEditor({ node, fieldKey, label }: { node: WorkflowNode; fieldKey: string; label: string }): React.JSX.Element {
  const list = (node.settings[fieldKey] as Range[]) ?? []
  const t = usePlayer()
  const set = (l: Range[]): void => setKey(node, fieldKey, l, `${node.id}:${fieldKey}`)
  return (
    <div className="field">
      <label>{label}</label>
      <div className="list">
        {list.map((r, i) => (
          <div key={i} className="list-row">
            <TimeInput value={r.start} onChange={(v) => set(list.map((x, j) => (j === i ? { ...x, start: v } : x)))} />
            <span className="dim">→</span>
            <TimeInput value={r.end} onChange={(v) => set(list.map((x, j) => (j === i ? { ...x, end: v } : x)))} />
            <span className="spacer" />
            <SeekBtn t={r.start} />
            <button className="btn ghost icon xs" onClick={() => set(list.filter((_, j) => j !== i))} title="Rimuovi">
              <Trash2 size={12} />
            </button>
          </div>
        ))}
      </div>
      <button className="btn xs" style={{ alignSelf: 'flex-start' }} onClick={() => set([...list, { start: round(t, 2), end: round(t + 2, 2) }])}>
        <Plus size={12} /> Aggiungi dalla posizione attuale
      </button>
    </div>
  )
}

// ------------------------------------------------------------ sottotitoli

function CuesEditor({ node }: { node: WorkflowNode }): React.JSX.Element {
  const generated = useResultData<Cue[]>(node.id, 'generated')
  const edited = node.settings.editedCues as Cue[] | null
  const cues = edited ?? generated ?? []
  const [q, setQ] = useState('')
  const [limit, setLimit] = useState(120)
  const t = usePlayer()
  const save = (l: Cue[]): void => setKey(node, 'editedCues', l, `${node.id}:cues`)
  const update = (id: string, patch: Partial<Cue>): void =>
    save(
      cues.map((c) => {
        if (c.id !== id) return c
        const n = { ...c, ...patch }
        if (patch.text !== undefined && c.words && c.words.map((w) => w.text).join(' ') !== patch.text) delete n.words
        if ((patch.start !== undefined || patch.end !== undefined) && n.words) delete n.words
        return n
      })
    )
  const shown = useMemo(() => cues.filter((c) => !q || c.text.toLowerCase().includes(q.toLowerCase())), [cues, q])
  return (
    <div className="field">
      <div className="row">
        <input className="input sm" placeholder="Cerca nel testo…" value={q} onChange={(e) => setQ(e.target.value)} />
        {edited && (
          <button className="btn xs" title="Scarta le modifiche e rigenera dalla trascrizione" onClick={() => setKey(node, 'editedCues', null)}>
            <RotateCcw size={12} /> Ripristina
          </button>
        )}
      </div>
      {!cues.length && <div className="callout"><div className="txt">Esegui il nodo per generare i sottotitoli dalla trascrizione, oppure aggiungili manualmente.</div></div>}
      <div className="list" style={{ maxHeight: 340, overflow: 'auto' }}>
        {shown.slice(0, limit).map((c) => (
          <div key={c.id} className="card" style={{ padding: 7, marginBottom: 0 }}>
            <div className="row" style={{ gap: 4 }}>
              <TimeInput value={c.start} onChange={(v) => update(c.id, { start: v })} />
              <span className="dim">→</span>
              <TimeInput value={c.end} onChange={(v) => update(c.id, { end: v })} />
              <span className="spacer" />
              <SeekBtn t={c.start} />
              <button className="btn ghost icon xs" title="Elimina" onClick={() => save(cues.filter((x) => x.id !== c.id))}>
                <Trash2 size={12} />
              </button>
            </div>
            <input className="input sm" style={{ marginTop: 5 }} value={c.text} onChange={(e) => update(c.id, { text: e.target.value })} />
          </div>
        ))}
      </div>
      {shown.length > limit && <button className="btn xs" onClick={() => setLimit(limit + 200)}>Mostra altri ({shown.length - limit})</button>}
      <button
        className="btn xs"
        style={{ alignSelf: 'flex-start' }}
        onClick={() => save([...cues, { id: newId('c'), start: round(t, 2), end: round(t + 2, 2), text: 'Nuovo sottotitolo' }].sort((a, b) => a.start - b.start))}
      >
        <Plus size={12} /> Aggiungi alla posizione attuale
      </button>
      <div className="help">I tempi sono riferiti al video originale e vengono adattati automaticamente ai tagli.</div>
    </div>
  )
}

// ------------------------------------------------------------ testi e grafiche

const PRESET_OPTS: { value: TextPreset; label: string }[] = [
  { value: 'minimal', label: 'Minimal' },
  { value: 'bold', label: 'Bold (maiuscolo)' },
  { value: 'box', label: 'Riquadro' },
  { value: 'accent', label: 'Accento' },
  { value: 'lowerthird', label: 'Sottopancia' }
]
const ANIM_OPTS = [
  { value: 'none', label: 'Nessuna' },
  { value: 'fade', label: 'Dissolvenza' },
  { value: 'slide-up', label: 'Scorrimento ↑' },
  { value: 'slide-left', label: 'Scorrimento ←' },
  { value: 'pop', label: 'Pop' },
  { value: 'typewriter', label: 'Macchina da scrivere' }
]

type OverlayItem = Overlay & { mediaId?: string }

function newOverlay(kind: 'title' | 'keyword' | 'explain' | 'lower' | 'image', t: number): OverlayItem {
  const base: OverlayItem = {
    id: newId('o'), kind: 'text', text: '', start: round(t, 2), duration: 3, preset: 'minimal', x: 50, y: 50, size: 0,
    color: '', animationIn: 'fade', animationOut: 'fade', animDuration: 0.35, keyframes: []
  }
  switch (kind) {
    case 'title':
      return { ...base, text: 'Titolo', preset: 'bold', y: 18, animationIn: 'pop' }
    case 'keyword':
      return { ...base, text: 'PAROLA CHIAVE', preset: 'accent', y: 30, duration: 1.8, animationIn: 'pop' }
    case 'explain':
      return { ...base, text: 'Spiegazione', preset: 'box', y: 78, duration: 4, animationIn: 'slide-up' }
    case 'lower':
      return { ...base, text: 'Nome Cognome · Ruolo', preset: 'lowerthird', x: 6, y: 86, duration: 4, animationIn: 'slide-left' }
    case 'image':
      return { ...base, kind: 'image', size: 25, x: 80, y: 22, animationIn: 'fade' }
  }
}

function OverlaysEditor({ node }: { node: WorkflowNode }): React.JSX.Element {
  const items = (node.settings.items as OverlayItem[]) ?? []
  const t = usePlayer()
  const [open, setOpen] = useState<string | null>(null)
  const save = (l: OverlayItem[], c?: string): void => setKey(node, 'items', l, c ?? `${node.id}:items`)
  const add = (k: Parameters<typeof newOverlay>[0]): void => {
    const o = newOverlay(k, t)
    save([...items, o], `${node.id}:add:${o.id}`)
    setOpen(o.id)
  }
  return (
    <div className="field">
      <div className="row wrap" style={{ gap: 4 }}>
        <button className="btn xs" onClick={() => add('title')}><Type size={11} /> Titolo</button>
        <button className="btn xs" onClick={() => add('keyword')}><Plus size={11} /> Parola chiave</button>
        <button className="btn xs" onClick={() => add('explain')}><Plus size={11} /> Spiegazione</button>
        <button className="btn xs" onClick={() => add('lower')}><Plus size={11} /> Sottopancia</button>
        <button className="btn xs" onClick={() => add('image')}><ImageIcon size={11} /> Immagine</button>
      </div>
      <div className="help">I nuovi elementi partono dalla posizione attuale del video.</div>
      {[...items]
        .sort((a, b) => a.start - b.start)
        .map((o) => (
          <OverlayCard
            key={o.id}
            o={o}
            open={open === o.id}
            onToggle={() => setOpen(open === o.id ? null : o.id)}
            onChange={(p) => save(items.map((x) => (x.id === o.id ? { ...x, ...p } : x)), `${node.id}:${o.id}:${Object.keys(p).join()}`)}
            onDelete={() => save(items.filter((x) => x.id !== o.id))}
          />
        ))}
      {!items.length && <div className="empty">Nessun elemento grafico.</div>}
    </div>
  )
}

function OverlayCard({ o, open, onToggle, onChange, onDelete }: { o: OverlayItem; open: boolean; onToggle: () => void; onChange: (p: Partial<OverlayItem>) => void; onDelete: () => void }): React.JSX.Element {
  const t = usePlayer()
  return (
    <div className="card">
      <div className="card-head" onClick={onToggle}>
        {open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        {o.kind === 'image' ? <ImageIcon size={13} className="muted" /> : <Type size={13} className="muted" />}
        <span className="grow ellipsis" style={{ fontWeight: 600 }}>{o.kind === 'image' ? 'Immagine' : o.text || '(vuoto)'}</span>
        <span className="tiny dim">{formatTime(o.start)} · {o.duration}s</span>
        <button className="btn ghost icon xs" onClick={(e) => { e.stopPropagation(); seekSource(o.start) }} title="Vai all'inizio">
          <LocateFixed size={12} />
        </button>
        <button className="btn ghost icon xs" onClick={(e) => { e.stopPropagation(); onDelete() }} title="Elimina">
          <Trash2 size={12} />
        </button>
      </div>
      {open && (
        <div style={{ marginTop: 10 }}>
          {o.kind === 'image' ? (
            <div className="field">
              <label>Immagine</label>
              <MediaSelect kind="image" value={o.mediaId ?? ''} onChange={(id) => onChange({ mediaId: id })} />
            </div>
          ) : (
            <>
              <div className="field">
                <label>Testo</label>
                <textarea className="textarea" rows={2} value={o.text} onChange={(e) => onChange({ text: e.target.value })} />
              </div>
              <div className="field">
                <label>Stile tipografico</label>
                <select className="select" value={o.preset} onChange={(e) => onChange({ preset: e.target.value as TextPreset })}>
                  {PRESET_OPTS.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
                </select>
              </div>
            </>
          )}
          <div className="grid2">
            <div className="field"><label>Inizio (s)</label><TimeInput value={o.start} onChange={(v) => onChange({ start: v })} /></div>
            <div className="field"><label>Durata (s)</label><NumberInput value={o.duration} min={0.2} step={0.1} onChange={(v) => onChange({ duration: v })} /></div>
          </div>
          <div className="grid2">
            <div className="field">
              <label>Posizione X {o.x}%</label>
              <input type="range" min={0} max={100} value={o.x} onChange={(e) => onChange({ x: Number(e.target.value) })} />
            </div>
            <div className="field">
              <label>Posizione Y {o.y}%</label>
              <input type="range" min={0} max={100} value={o.y} onChange={(e) => onChange({ y: Number(e.target.value) })} />
            </div>
          </div>
          <div className="grid2">
            <div className="field">
              <label>{o.kind === 'image' ? 'Larghezza (%)' : 'Dimensione (0 = preset)'}</label>
              <NumberInput value={o.size} min={0} step={1} onChange={(v) => onChange({ size: v })} />
            </div>
            {o.kind === 'text' && (
              <div className="field">
                <label>Colore</label>
                <div className="row">
                  <input type="color" value={o.color || '#ffffff'} onChange={(e) => onChange({ color: e.target.value.toUpperCase() })} />
                  {o.color && <button className="btn xs" onClick={() => onChange({ color: '' })}>Preset</button>}
                </div>
              </div>
            )}
          </div>
          <div className="grid3">
            <div className="field">
              <label>Entrata</label>
              <select className="select sm" value={o.animationIn} onChange={(e) => onChange({ animationIn: e.target.value as Overlay['animationIn'] })}>
                {ANIM_OPTS.filter((a) => o.kind === 'text' || ['none', 'fade', 'slide-up', 'slide-left'].includes(a.value)).map((a) => <option key={a.value} value={a.value}>{a.label}</option>)}
              </select>
            </div>
            <div className="field">
              <label>Uscita</label>
              <select className="select sm" value={o.animationOut} onChange={(e) => onChange({ animationOut: e.target.value as Overlay['animationOut'] })}>
                {ANIM_OPTS.filter((a) => a.value !== 'typewriter' && (o.kind === 'text' || ['none', 'fade'].includes(a.value))).map((a) => <option key={a.value} value={a.value}>{a.label}</option>)}
              </select>
            </div>
            <div className="field">
              <label>Durata anim.</label>
              <NumberInput value={o.animDuration} min={0} step={0.05} onChange={(v) => onChange({ animDuration: v })} />
            </div>
          </div>
          <div className="section-title" style={{ marginTop: 8 }}>Keyframe</div>
          <KeyframeList
            list={o.keyframes}
            kind={o.kind}
            onChange={(k) => onChange({ keyframes: k })}
            makeNew={() => ({ t: round(Math.max(0, Math.min(o.duration, t - o.start)), 2), x: o.x, y: o.y, scale: 100, opacity: 100 })}
          />
        </div>
      )}
    </div>
  )
}

function KeyframeList({ list, onChange, makeNew, kind }: { list: Keyframe[]; onChange: (l: Keyframe[]) => void; makeNew: () => Keyframe; kind: 'text' | 'image' }): React.JSX.Element {
  return (
    <div className="list">
      {list.map((k, i) => (
        <div key={i} className="list-row" style={{ flexWrap: 'wrap' }}>
          <span className="tiny dim">t</span>
          <NumberInput value={k.t} min={0} step={0.05} onChange={(v) => onChange(list.map((x, j) => (j === i ? { ...x, t: v } : x)))} />
          <span className="tiny dim">x</span>
          <NumberInput value={k.x} step={1} onChange={(v) => onChange(list.map((x, j) => (j === i ? { ...x, x: v } : x)))} />
          <span className="tiny dim">y</span>
          <NumberInput value={k.y} step={1} onChange={(v) => onChange(list.map((x, j) => (j === i ? { ...x, y: v } : x)))} />
          {kind === 'text' && (
            <>
              <span className="tiny dim">scala</span>
              <NumberInput value={k.scale} step={5} onChange={(v) => onChange(list.map((x, j) => (j === i ? { ...x, scale: v } : x)))} />
              <span className="tiny dim">opac.</span>
              <NumberInput value={k.opacity} min={0} max={100} step={5} onChange={(v) => onChange(list.map((x, j) => (j === i ? { ...x, opacity: v } : x)))} />
            </>
          )}
          <button className="btn ghost icon xs" onClick={() => onChange(list.filter((_, j) => j !== i))}><Trash2 size={12} /></button>
        </div>
      ))}
      <button className="btn xs" style={{ alignSelf: 'flex-start' }} onClick={() => onChange([...list, makeNew()].sort((a, b) => a.t - b.t))}>
        <Plus size={12} /> Keyframe
      </button>
      <div className="help">
        t = secondi dall'inizio dell'elemento; x/y in % del fotogramma.
        {kind === 'text' ? ' Con i keyframe le animazioni di entrata/uscita sono sostituite dall\'interpolazione.' : ' Per le immagini i keyframe animano la posizione.'}
      </div>
    </div>
  )
}

// ------------------------------------------------------------ zoom

interface ZoomPreset {
  name: string
  scale: number
  ease: number
}

const BUILTIN_ZOOM: ZoomPreset[] = [
  { name: 'Punch-in', scale: 1.15, ease: 0 },
  { name: 'Spinta lenta', scale: 1.25, ease: 1.2 },
  { name: 'Enfasi', scale: 1.35, ease: 0.15 }
]

function loadZoomPresets(): ZoomPreset[] {
  try {
    return JSON.parse(localStorage.getItem('zoomPresets') ?? '[]') as ZoomPreset[]
  } catch {
    return []
  }
}

function ZoomsEditor({ node }: { node: WorkflowNode }): React.JSX.Element {
  const list = (node.settings.zooms as ZoomEffect[]) ?? []
  const t = usePlayer()
  const [userPresets, setUserPresets] = useState<ZoomPreset[]>(loadZoomPresets)
  const save = (l: ZoomEffect[], c?: string): void => setKey(node, 'zooms', l, c ?? `${node.id}:zooms`)
  const add = (p: ZoomPreset): void =>
    save([...list, { id: newId('z'), start: round(t, 2), end: round(t + 2, 2), scale: p.scale, x: Number(node.settings.x ?? 50), y: Number(node.settings.y ?? 45), ease: p.ease }].sort((a, b) => a.start - b.start), `${node.id}:zadd`)
  const savePreset = (): void => {
    const name = prompt('Nome del preset di zoom', `Zoom ${Number(node.settings.scale).toFixed(2)}×`)
    if (!name) return
    const next = [...userPresets.filter((p) => p.name !== name), { name, scale: Number(node.settings.scale), ease: Number(node.settings.ease) }]
    localStorage.setItem('zoomPresets', JSON.stringify(next))
    setUserPresets(next)
  }
  return (
    <div className="field">
      <div className="row wrap" style={{ gap: 4 }}>
        {[...BUILTIN_ZOOM, ...userPresets].map((p) => (
          <button key={p.name} className="btn xs" title={`${p.scale}× · rampa ${p.ease}s`} onClick={() => add(p)}>
            <Plus size={11} /> {p.name}
          </button>
        ))}
        <button className="btn ghost xs" title="Salva intensità e rampa attuali come preset riutilizzabile" onClick={savePreset}>
          <Save size={11} /> Salva preset
        </button>
      </div>
      <div className="list">
        {list.map((z, i) => (
          <div key={z.id} className="card" style={{ padding: 7, marginBottom: 0 }}>
            <div className="row" style={{ gap: 4 }}>
              <TimeInput value={z.start} onChange={(v) => save(list.map((x, j) => (j === i ? { ...x, start: v } : x)))} />
              <span className="dim">→</span>
              <TimeInput value={z.end} onChange={(v) => save(list.map((x, j) => (j === i ? { ...x, end: v } : x)))} />
              <span className="spacer" />
              <SeekBtn t={z.start} />
              <button className="btn ghost icon xs" onClick={() => save(list.filter((_, j) => j !== i))}><Trash2 size={12} /></button>
            </div>
            <div className="row tiny" style={{ marginTop: 5, gap: 4 }}>
              <span className="dim">scala</span>
              <NumberInput value={z.scale} min={1} max={4} step={0.05} onChange={(v) => save(list.map((x, j) => (j === i ? { ...x, scale: v } : x)))} />
              <span className="dim">x%</span>
              <NumberInput value={z.x} min={0} max={100} step={1} onChange={(v) => save(list.map((x, j) => (j === i ? { ...x, x: v } : x)))} />
              <span className="dim">y%</span>
              <NumberInput value={z.y} min={0} max={100} step={1} onChange={(v) => save(list.map((x, j) => (j === i ? { ...x, y: v } : x)))} />
              <span className="dim">rampa</span>
              <NumberInput value={z.ease} min={0} max={3} step={0.05} onChange={(v) => save(list.map((x, j) => (j === i ? { ...x, ease: v } : x)))} />
            </div>
          </div>
        ))}
      </div>
      {!list.length && <div className="help">Nessuno zoom manuale. Usa i preset per aggiungerne uno alla posizione attuale.</div>}
    </div>
  )
}

function ZoomKeyframesEditor({ node }: { node: WorkflowNode }): React.JSX.Element {
  const list = (node.settings.keyframes as ZoomKeyframe[]) ?? []
  const t = usePlayer()
  const save = (l: ZoomKeyframe[]): void => setKey(node, 'keyframes', [...l].sort((a, b) => a.t - b.t), `${node.id}:kf`)
  return (
    <div className="field">
      <div className="list">
        {list.map((k, i) => (
          <div key={i} className="list-row" style={{ flexWrap: 'wrap' }}>
            <TimeInput value={k.t} onChange={(v) => save(list.map((x, j) => (j === i ? { ...x, t: v } : x)))} />
            <span className="tiny dim">scala</span>
            <NumberInput value={k.scale} min={1} max={4} step={0.05} onChange={(v) => save(list.map((x, j) => (j === i ? { ...x, scale: v } : x)))} />
            <span className="tiny dim">x%</span>
            <NumberInput value={k.x} min={0} max={100} step={1} onChange={(v) => save(list.map((x, j) => (j === i ? { ...x, x: v } : x)))} />
            <span className="tiny dim">y%</span>
            <NumberInput value={k.y} min={0} max={100} step={1} onChange={(v) => save(list.map((x, j) => (j === i ? { ...x, y: v } : x)))} />
            <button className="btn ghost icon xs" onClick={() => save(list.filter((_, j) => j !== i))}><Trash2 size={12} /></button>
          </div>
        ))}
      </div>
      <button className="btn xs" style={{ alignSelf: 'flex-start' }} onClick={() => save([...list, { t: round(t, 2), scale: 1, x: 50, y: 50 }])}>
        <Plus size={12} /> Keyframe alla posizione attuale
      </button>
      <div className="help">Inquadratura animata nel tempo (scala e centro), interpolata linearmente tra i keyframe. Gli zoom si sommano a questa inquadratura.</div>
    </div>
  )
}

// ------------------------------------------------------------ punti di transizione

interface CutPoint {
  key: string
  at: number
  gap: number
  index: number
}

function TransitionPointsEditor({ node }: { node: WorkflowNode }): React.JSX.Element {
  const points = useResultData<CutPoint[]>(node.id, 'points')
  const sel = (node.settings.selected as string[]) ?? []
  if (!points) return <div className="callout"><div className="txt">Esegui il nodo una volta per vedere l'elenco dei punti di taglio disponibili.</div></div>
  const toggle = (k: string): void => setKey(node, 'selected', sel.includes(k) ? sel.filter((x) => x !== k) : [...sel, k], `${node.id}:sel`)
  return (
    <div className="field">
      <div className="row small">
        <span className="muted">{sel.length} selezionati su {points.length}</span>
        <span className="spacer" />
        <button className="btn xs" onClick={() => setKey(node, 'selected', points.map((p) => p.key))}>Tutti</button>
        <button className="btn xs" onClick={() => setKey(node, 'selected', [])}>Nessuno</button>
      </div>
      <div className="list" style={{ maxHeight: 240, overflow: 'auto' }}>
        {points.map((p) => (
          <label key={p.key} className={`list-row ${sel.includes(p.key) ? '' : 'off'}`} style={{ cursor: 'pointer' }}>
            <input type="checkbox" checked={sel.includes(p.key)} onChange={() => toggle(p.key)} />
            <span className="t grow">Taglio {p.index + 1} · {formatTime(p.at, true)}</span>
            <span className="tiny dim">pausa {p.gap.toFixed(1)}s</span>
            <SeekBtn t={Math.max(0, p.at - 1)} />
          </label>
        ))}
      </div>
      <div className="help">Le transizioni vengono applicate solo ai tagli selezionati.</div>
    </div>
  )
}
