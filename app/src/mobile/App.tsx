import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { RemoteJob } from '@shared/types'
import { DEFAULT_LOCAL, abortLocal, loadFFmpeg, processLocally, type LocalOptions, type LocalResult } from './local/engine'
import { WHISPER_SIZES, stopWhisper, type WhisperModel } from './local/whisper'
import {
  cancelJob, createJob, detectPc, getInfo, getToken, listJobs, pair, resultUrl, saveVideo, unpair, upload, type PcInfo
} from './remote'

type Tab = 'crea' | 'lavori' | 'info'
type Mode = 'pc' | 'phone'

const LANGS = [
  ['it', 'Italiano'], ['en', 'Inglese'], ['es', 'Spagnolo'], ['fr', 'Francese'], ['de', 'Tedesco'], ['pt', 'Portoghese'], ['auto', 'Automatica']
]

function fmtSize(n: number): string {
  return n > 1e9 ? `${(n / 1e9).toFixed(2)} GB` : `${(n / 1e6).toFixed(1)} MB`
}

function fmtDur(s?: number): string {
  if (!s && s !== 0) return ''
  const m = Math.floor(s / 60)
  return `${m}:${String(Math.floor(s % 60)).padStart(2, '0')}`
}

function load<T>(key: string, d: T): T {
  try {
    const v = localStorage.getItem(key)
    return v ? { ...d, ...JSON.parse(v) } : d
  } catch {
    return d
  }
}

function store(key: string, v: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(v))
  } catch {
    /* ignora */
  }
}

interface LocalJob {
  id: string
  name: string
  status: 'running' | 'done' | 'error'
  step: string
  detail?: string
  progress: number
  result?: LocalResult
  url?: string
  error?: string
}

export default function App(): React.JSX.Element {
  const [tab, setTab] = useState<Tab>('crea')
  const [pc, setPc] = useState<{ available: boolean; authorized: boolean } | null>(null)
  const [mode, setMode] = useState<Mode>(() => (localStorage.getItem('flowcut.mode') as Mode) || 'pc')
  const [toast, setToast] = useState('')
  const [local, setLocal] = useState<LocalJob | null>(null)
  const [jobs, setJobs] = useState<RemoteJob[]>([])

  const refreshPc = useCallback(async () => setPc(await detectPc()), [])
  useEffect(() => void refreshPc(), [refreshPc])
  useEffect(() => store('flowcut.mode', mode), [mode])
  useEffect(() => {
    if (pc && !pc.available && mode === 'pc' && !localStorage.getItem('flowcut.mode.chosen')) setMode('phone')
  }, [pc, mode])
  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(''), 3500)
    return () => clearTimeout(t)
  }, [toast])

  // Aggiornamento dei lavori sul PC.
  useEffect(() => {
    if (!pc?.authorized) return
    let alive = true
    const tick = async (): Promise<void> => {
      try {
        const j = await listJobs()
        if (alive) setJobs(j)
      } catch {
        /* PC non raggiungibile: riprova */
      }
    }
    void tick()
    const t = setInterval(tick, 1500)
    return () => {
      alive = false
      clearInterval(t)
    }
  }, [pc?.authorized])

  const activeRemote = jobs.filter((j) => j.status === 'queued' || j.status === 'running').length
  const badge = activeRemote + (local?.status === 'running' ? 1 : 0)

  return (
    <div className="app">
      <header className="top">
        <div className="brand">
          <div className="logo">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.4" strokeLinecap="round">
              <rect x="3" y="3" width="7" height="7" rx="2" />
              <rect x="14" y="14" width="7" height="7" rx="2" />
              <path d="M10 6.5h3a2.5 2.5 0 0 1 2.5 2.5v5" />
            </svg>
          </div>
          <h1>{tab === 'crea' ? 'FlowCut' : tab === 'lavori' ? 'Lavori' : 'Info'}</h1>
        </div>
        <span className={`pill ${pc?.authorized ? 'ok' : ''}`}>{pc?.authorized ? 'PC collegato' : pc?.available ? 'PC da abbinare' : 'Solo telefono'}</span>
      </header>

      <main className="content">
        {tab === 'crea' && (
          <>
            <div className="segmented">
              <button className={mode === 'pc' ? 'on' : ''} onClick={() => { setMode('pc'); localStorage.setItem('flowcut.mode.chosen', '1') }}>
                Sul PC
              </button>
              <button className={mode === 'phone' ? 'on' : ''} onClick={() => { setMode('phone'); localStorage.setItem('flowcut.mode.chosen', '1') }}>
                Sul telefono
              </button>
            </div>
            {mode === 'pc' ? (
              <PcCreate pc={pc} onPaired={refreshPc} onSent={() => { setTab('lavori'); setToast('Video inviato al PC') }} />
            ) : (
              <PhoneCreate job={local} setJob={setLocal} onStart={() => setTab('lavori')} />
            )}
          </>
        )}
        {tab === 'lavori' && <Jobs jobs={jobs} local={local} pc={pc} onToast={setToast} onClearLocal={() => setLocal(null)} />}
        {tab === 'info' && <Info pc={pc} onUnpair={() => { unpair(); void refreshPc() }} onToast={setToast} />}
      </main>

      {toast && <div className="toast">{toast}</div>}

      <nav className="tabbar">
        <TabBtn on={tab === 'crea'} onClick={() => setTab('crea')} label="Crea" icon={<path d="M12 5v14M5 12h14" />} />
        <TabBtn on={tab === 'lavori'} onClick={() => setTab('lavori')} label="Lavori" badge={badge} icon={<><rect x="3" y="5" width="18" height="14" rx="3" /><path d="m10 9 5 3-5 3z" /></>} />
        <TabBtn on={tab === 'info'} onClick={() => setTab('info')} label="Info" icon={<><circle cx="12" cy="12" r="9" /><path d="M12 11v6M12 7.5v.5" /></>} />
      </nav>
    </div>
  )
}

function TabBtn({ on, onClick, label, icon, badge }: { on: boolean; onClick: () => void; label: string; icon: React.ReactNode; badge?: number }): React.JSX.Element {
  return (
    <button className={`tab ${on ? 'on' : ''}`} onClick={onClick}>
      <span className="tab-icon">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          {icon}
        </svg>
        {!!badge && <span className="badge-num">{badge}</span>}
      </span>
      {label}
    </button>
  )
}

function VideoPick({ file, onFile }: { file: File | null; onFile: (f: File | null) => void }): React.JSX.Element {
  const ref = useRef<HTMLInputElement>(null)
  const url = useMemo(() => (file ? URL.createObjectURL(file) : ''), [file])
  useEffect(() => () => void (url && URL.revokeObjectURL(url)), [url])
  return (
    <div className="card">
      <input ref={ref} type="file" accept="video/*" hidden onChange={(e) => onFile(e.target.files?.[0] ?? null)} />
      {file ? (
        <div className="picked">
          <video src={url} muted playsInline preload="metadata" />
          <div className="grow">
            <div className="strong ellipsis">{file.name}</div>
            <div className="muted small">{fmtSize(file.size)}</div>
            <button className="link" onClick={() => ref.current?.click()}>Cambia video</button>
          </div>
        </div>
      ) : (
        <button className="pick" onClick={() => ref.current?.click()}>
          <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
            <rect x="3" y="5" width="18" height="14" rx="3" />
            <path d="M12 9v6M9 12h6" />
          </svg>
          <span className="strong">Scegli un video</span>
          <span className="muted small">Dal rullino o da File</span>
        </button>
      )}
    </div>
  )
}

function Row({ label, children }: { label: string; children: React.ReactNode }): React.JSX.Element {
  return (
    <label className="row">
      <span>{label}</span>
      {children}
    </label>
  )
}

function Switch({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }): React.JSX.Element {
  return (
    <span className="switch">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span />
    </span>
  )
}

// ------------------------------------------------------------ modalità PC

function PcCreate({ pc, onPaired, onSent }: { pc: { available: boolean; authorized: boolean } | null; onPaired: () => void; onSent: () => void }): React.JSX.Element {
  const [code, setCode] = useState('')
  const [err, setErr] = useState('')
  const [info, setInfo] = useState<PcInfo | null>(null)
  const [file, setFile] = useState<File | null>(null)
  const [opts, setOpts] = useState(() => load('flowcut.pcopts', { templateId: '', language: '', resolution: '', title: '' }))
  const [up, setUp] = useState<{ progress: number; abort: () => void } | null>(null)
  const [addr, setAddr] = useState(() => localStorage.getItem('flowcut.pcaddr') ?? '')

  useEffect(() => {
    if (pc?.authorized) void getInfo().then((i) => {
      setInfo(i)
      setOpts((o) => ({ ...o, language: o.language || i.defaultLanguage }))
    }).catch((e) => setErr((e as Error).message))
  }, [pc?.authorized])
  useEffect(() => store('flowcut.pcopts', { ...opts, title: '' }), [opts])

  if (!pc) return <div className="card muted">Ricerca del PC…</div>

  if (!pc.available) {
    const open = (): void => {
      const a = addr.trim().replace(/\/+$/, '')
      if (!a) return
      localStorage.setItem('flowcut.pcaddr', a)
      location.href = /^https?:\/\//.test(a) ? a : `http://${a.includes(':') ? a : `${a}:7878`}`
    }
    return (
      <div className="card">
        <div className="strong">Collegati a FlowCut sul PC</div>
        <p className="muted small">
          Sul PC apri FlowCut e premi l'icona del telefono in alto: vedrai un codice QR e un indirizzo
          (es. <span className="mono">http://192.168.1.20:7878</span>). Inquadra il QR con la fotocamera
          oppure scrivi l'indirizzo qui. Telefono e PC devono essere sulla stessa rete Wi-Fi.
        </p>
        <input className="input" inputMode="url" placeholder="192.168.1.20:7878" value={addr} onChange={(e) => setAddr(e.target.value)} />
        <button className="btn primary block" onClick={open} disabled={!addr.trim()}>Apri FlowCut del PC</button>
        <p className="muted small">Senza PC puoi usare la modalità <b>Sul telefono</b>.</p>
      </div>
    )
  }

  if (!pc.authorized) {
    const submit = async (): Promise<void> => {
      setErr('')
      try {
        await pair(code.trim())
        onPaired()
      } catch (e) {
        setErr((e as Error).message)
      }
    }
    return (
      <div className="card">
        <div className="strong">Abbina questo iPhone</div>
        <p className="muted small">Inserisci il codice a 6 cifre mostrato da FlowCut sul PC (icona del telefono).</p>
        <input className="input code" inputMode="numeric" autoComplete="one-time-code" maxLength={6} placeholder="000000" value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))} />
        {err && <div className="error small">{err}</div>}
        <button className="btn primary block" disabled={code.length !== 6} onClick={submit}>Abbina</button>
      </div>
    )
  }

  const send = async (): Promise<void> => {
    if (!file) return
    setErr('')
    const u = upload(file, (p) => setUp((s) => (s ? { ...s, progress: p } : s)))
    setUp({ progress: 0, abort: u.abort })
    try {
      const uploadId = await u.promise
      await createJob({ uploadId, name: file.name, ...opts })
      setFile(null)
      setOpts((o) => ({ ...o, title: '' }))
      onSent()
    } catch (e) {
      setErr((e as Error).message)
    } finally {
      setUp(null)
    }
  }

  return (
    <>
      <VideoPick file={file} onFile={setFile} />
      <div className="card list">
        <Row label="Titolo">
          <input className="input inline" placeholder="facoltativo" value={opts.title} onChange={(e) => setOpts({ ...opts, title: e.target.value })} />
        </Row>
        <Row label="Workflow">
          <select value={opts.templateId} onChange={(e) => setOpts({ ...opts, templateId: e.target.value })}>
            {(info?.templates ?? [{ id: '', name: 'Predefinito' }]).map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        </Row>
        <Row label="Lingua parlato">
          <select value={opts.language} onChange={(e) => setOpts({ ...opts, language: e.target.value })}>
            {(info?.languages ?? []).map((l) => <option key={l.value} value={l.value}>{l.label}</option>)}
          </select>
        </Row>
        <Row label="Formato">
          <select value={opts.resolution} onChange={(e) => setOpts({ ...opts, resolution: e.target.value })}>
            {(info?.resolutions ?? []).map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
          </select>
        </Row>
      </div>
      {info && !info.whisper && <div className="note">Sul PC Whisper non è configurato: i sottotitoli verranno saltati.</div>}
      {err && <div className="error">{err}</div>}
      {up ? (
        <div className="card">
          <div className="row-between small"><span>Invio al PC…</span><b>{Math.round(up.progress * 100)}%</b></div>
          <div className="bar"><div style={{ width: `${up.progress * 100}%` }} /></div>
          <button className="btn block" onClick={up.abort}>Annulla</button>
        </div>
      ) : (
        <button className="btn primary block big" disabled={!file} onClick={send}>Invia al PC e monta</button>
      )}
      <p className="muted small center">Il montaggio viene fatto da {info?.host ?? 'il PC'} con il workflow scelto.</p>
    </>
  )
}

// ------------------------------------------------------------ modalità telefono

function PhoneCreate({ job, setJob, onStart }: { job: LocalJob | null; setJob: React.Dispatch<React.SetStateAction<LocalJob | null>>; onStart: () => void }): React.JSX.Element {
  const [file, setFile] = useState<File | null>(null)
  const [o, setO] = useState<LocalOptions>(() => load('flowcut.localopts', DEFAULT_LOCAL))
  useEffect(() => store('flowcut.localopts', o), [o])
  const busy = job?.status === 'running'
  const set = <K extends keyof LocalOptions>(k: K, v: LocalOptions[K]): void => setO({ ...o, [k]: v })

  const start = async (): Promise<void> => {
    if (!file || busy) return
    const id = String(Date.now())
    setJob({ id, name: file.name, status: 'running', step: 'Preparazione', progress: 0 })
    onStart()
    try {
      const r = await processLocally(file, o, (step, progress, detail) =>
        setJob((j) => (j && j.id === id ? { ...j, step, progress, detail } : j))
      )
      setJob((j) => (j && j.id === id ? { ...j, status: 'done', progress: 1, result: r, url: URL.createObjectURL(r.blob) } : j))
    } catch (e) {
      const msg = (e as Error).message || String(e)
      setJob((j) => (j && j.id === id ? { ...j, status: 'error', error: /terminate|abort/i.test(msg) ? 'Annullato' : msg } : j))
    }
  }

  return (
    <>
      <VideoPick file={file} onFile={setFile} />
      {file && file.size > 1.5e9 && <div className="note">Video molto grande: sul telefono l'elaborazione può fallire per mancanza di memoria. Meglio usare il PC.</div>}
      <div className="card list">
        <Row label="Taglia le pause"><Switch checked={o.cutPauses} onChange={(v) => set('cutPauses', v)} /></Row>
        <Row label="Sottotitoli automatici"><Switch checked={o.subtitles} onChange={(v) => set('subtitles', v)} /></Row>
        {o.subtitles && (
          <>
            <Row label="Lingua">
              <select value={o.language} onChange={(e) => set('language', e.target.value)}>
                {LANGS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </Row>
            <Row label="Modello Whisper">
              <select value={o.model} onChange={(e) => set('model', e.target.value as WhisperModel)}>
                {(Object.keys(WHISPER_SIZES) as WhisperModel[]).map((m) => <option key={m} value={m}>{m} · {WHISPER_SIZES[m]}</option>)}
              </select>
            </Row>
          </>
        )}
        <Row label="Zoom alternati sui tagli"><Switch checked={o.zoom} onChange={(v) => set('zoom', v)} /></Row>
        <Row label="Audio migliorato"><Switch checked={o.normalize} onChange={(v) => set('normalize', v)} /></Row>
        <Row label="Formato">
          <select value={o.format} onChange={(e) => set('format', e.target.value as LocalOptions['format'])}>
            <option value="source">Come l'originale</option>
            <option value="vertical">Verticale 9:16 (Reels, Shorts)</option>
          </select>
        </Row>
        <Row label="Qualità">
          <select value={o.height} onChange={(e) => set('height', Number(e.target.value) as 720 | 1080)}>
            <option value={720}>720p (più veloce)</option>
            <option value={1080}>1080p</option>
          </select>
        </Row>
      </div>
      <button className="btn primary block big" disabled={!file || busy} onClick={start}>
        {busy ? 'Elaborazione in corso…' : 'Monta sul telefono'}
      </button>
      <p className="muted small center">
        Tutto avviene sull'iPhone, anche offline dopo il primo uso. È molto più lento del PC: ideale per clip di pochi minuti.
        Tieni l'app aperta e lo schermo acceso durante l'elaborazione.
      </p>
    </>
  )
}

// ------------------------------------------------------------ lavori

const STATUS: Record<string, string> = {
  uploaded: 'Caricato', queued: 'In coda', running: 'In corso', done: 'Pronto', error: 'Errore', cancelled: 'Annullato',
  idle: 'In attesa', stale: 'Da rifare'
}

function jobProgress(j: RemoteJob): number {
  if (j.status === 'done') return 1
  if (!j.nodes.length) return 0
  const sum = j.nodes.reduce((s, n) => s + (n.status === 'done' ? 1 : n.status === 'running' ? n.progress ?? 0 : 0), 0)
  return sum / j.nodes.length
}

function Jobs({ jobs, local, pc, onToast, onClearLocal }: { jobs: RemoteJob[]; local: LocalJob | null; pc: { authorized: boolean } | null; onToast: (s: string) => void; onClearLocal: () => void }): React.JSX.Element {
  const [open, setOpen] = useState<string | null>(null)
  const [saving, setSaving] = useState('')

  const saveRemote = async (j: RemoteJob): Promise<void> => {
    setSaving(j.id)
    try {
      const blob = await (await fetch(resultUrl(j.id))).blob()
      const r = await saveVideo(blob, j.resultName ?? 'video.mp4')
      onToast(r === 'shared' ? 'Scegli "Salva video" per metterlo nel rullino' : 'Download avviato')
    } catch (e) {
      if ((e as Error).name !== 'AbortError') onToast((e as Error).message)
    } finally {
      setSaving('')
    }
  }

  return (
    <>
      {local && (
        <div className="card">
          <div className="row-between">
            <div className="strong ellipsis">{local.name}</div>
            <span className={`chip ${local.status}`}>{local.status === 'running' ? 'Sul telefono' : local.status === 'done' ? 'Pronto' : 'Errore'}</span>
          </div>
          {local.status === 'running' && (
            <>
              <div className="row-between small muted"><span>{local.step}{local.detail ? ` · ${local.detail}` : ''}</span><b>{Math.round(local.progress * 100)}%</b></div>
              <div className="bar"><div style={{ width: `${local.progress * 100}%` }} /></div>
              <button className="btn block" onClick={() => { abortLocal(); stopWhisper() }}>Annulla</button>
            </>
          )}
          {local.status === 'error' && <div className="error small">{local.error}</div>}
          {local.status === 'done' && local.result && local.url && (
            <>
              <video className="result" src={local.url} controls playsInline />
              <ul className="summary">{local.result.summary.map((s) => <li key={s}>{s}</li>)}</ul>
              <button className="btn primary block" onClick={async () => {
                try {
                  const r = await saveVideo(local.result!.blob, local.result!.name)
                  onToast(r === 'shared' ? 'Scegli "Salva video" per metterlo nel rullino' : 'Download avviato')
                } catch { /* condivisione annullata */ }
              }}>Salva nel rullino</button>
              <button className="btn block" onClick={onClearLocal}>Chiudi</button>
            </>
          )}
        </div>
      )}
      {pc?.authorized && jobs.map((j) => {
        const p = jobProgress(j)
        const cur = j.nodes.find((n) => n.status === 'running')
        return (
          <div className="card" key={j.id}>
            <div className="row-between" onClick={() => setOpen(open === j.id ? null : j.id)}>
              <div className="grow">
                <div className="strong ellipsis">{j.name}</div>
                <div className="muted small">Sul PC · {new Date(j.createdAt).toLocaleTimeString()}</div>
              </div>
              <span className={`chip ${j.status}`}>{STATUS[j.status]}</span>
            </div>
            {(j.status === 'running' || j.status === 'queued') && (
              <>
                <div className="row-between small muted"><span>{cur ? `${cur.label}${cur.message ? ` · ${cur.message}` : ''}` : 'In attesa del PC'}</span><b>{Math.round(p * 100)}%</b></div>
                <div className="bar"><div style={{ width: `${p * 100}%` }} /></div>
                <button className="btn block" onClick={() => void cancelJob(j.id)}>Annulla</button>
              </>
            )}
            {j.status === 'error' && <div className="error small">{j.error}</div>}
            {j.warnings.map((w) => <div key={w} className="note small">{w}</div>)}
            {j.status === 'done' && (
              <>
                <video className="result" src={resultUrl(j.id)} controls playsInline preload="metadata" />
                <div className="muted small">{fmtDur(j.resultDuration)} · {j.resultSize ? fmtSize(j.resultSize) : ''}</div>
                <button className="btn primary block" disabled={saving === j.id} onClick={() => void saveRemote(j)}>
                  {saving === j.id ? 'Preparazione…' : 'Salva nel rullino'}
                </button>
                <a className="btn block" href={resultUrl(j.id, true)}>Scarica in File</a>
              </>
            )}
            {open === j.id && (
              <ul className="nodes">
                {j.nodes.map((n) => (
                  <li key={n.id}>
                    <span className={`dot ${n.status}`} />
                    <span className="grow">{n.label}</span>
                    <span className="muted small">{n.status === 'running' ? `${Math.round((n.progress ?? 0) * 100)}%` : n.summary ?? STATUS[n.status] ?? n.status}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )
      })}
      {!local && !(pc?.authorized && jobs.length) && <div className="empty">Nessun lavoro. Crea il primo dalla scheda <b>Crea</b>.</div>}
    </>
  )
}

// ------------------------------------------------------------ info

function Info({ pc, onUnpair, onToast }: { pc: { available: boolean; authorized: boolean } | null; onUnpair: () => void; onToast: (s: string) => void }): React.JSX.Element {
  const [prep, setPrep] = useState('')
  const standalone = (navigator as Navigator & { standalone?: boolean }).standalone || matchMedia('(display-mode: standalone)').matches
  return (
    <>
      {!standalone && (
        <div className="card">
          <div className="strong">Installa sulla schermata Home</div>
          <ol className="steps small">
            <li>Apri questa pagina in <b>Safari</b>.</li>
            <li>Tocca <b>Condividi</b> (il quadrato con la freccia).</li>
            <li>Scegli <b>Aggiungi alla schermata Home</b>.</li>
          </ol>
          <p className="muted small">FlowCut si aprirà a tutto schermo come un'app, senza App Store.</p>
        </div>
      )}
      <div className="card">
        <div className="strong">Due modi di lavorare</div>
        <p className="small"><b>Sul PC</b>: il telefono invia il video a FlowCut sul PC, che fa il montaggio completo con il workflow scelto (tutte le funzioni, video lunghi). Serve il PC acceso con l'accesso dal telefono attivo.</p>
        <p className="small"><b>Sul telefono</b>: taglio pause, sottotitoli, zoom e audio direttamente sull'iPhone, anche senza PC e offline dopo il primo uso. Più lento: adatto a clip brevi.</p>
      </div>
      <div className="card">
        <div className="strong">Modalità telefono offline</div>
        <p className="muted small">Scarica ora il motore video (circa 30 MB). Il modello Whisper viene salvato al primo utilizzo dei sottotitoli.</p>
        <button className="btn block" disabled={prep === 'run'} onClick={async () => {
          setPrep('run')
          try {
            await loadFFmpeg()
            await Promise.all(['fonts/Montserrat-Bold.ttf', 'fonts/Montserrat-Regular.ttf'].map((f) => fetch(f)))
            setPrep('ok')
            onToast('Motore video pronto')
          } catch (e) {
            setPrep('')
            onToast((e as Error).message)
          }
        }}>{prep === 'run' ? 'Download…' : prep === 'ok' ? 'Pronto ✓' : 'Prepara'}</button>
      </div>
      {pc?.authorized && (
        <div className="card">
          <div className="strong">PC collegato</div>
          <button className="btn block danger" onClick={onUnpair}>Scollega questo iPhone</button>
        </div>
      )}
      <p className="muted small center">FlowCut · i video restano sui tuoi dispositivi{getToken() ? '' : ''}.</p>
    </>
  )
}
