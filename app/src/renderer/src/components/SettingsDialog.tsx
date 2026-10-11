import { useEffect, useState } from 'react'
import { CheckCircle2, Download, ExternalLink, FolderOpen, Loader2, RefreshCw, XCircle } from 'lucide-react'
import type { WhisperModelInfo } from '../../../preload/index.d'
import { LANGUAGES } from '@shared/nodeDefs'
import type { AppSettings } from '@shared/types'
import { api, clsx } from '../lib/util'
import { errMsg, openSettings, refreshTools, toast, updateSettings, useStore } from '../store/store'
import { Modal } from './Modal'

function Status({ ok, text }: { ok: boolean; text?: string }): React.JSX.Element {
  return (
    <span className="row tiny" style={{ gap: 4, color: ok ? 'var(--ok)' : 'var(--warn)' }}>
      {ok ? <CheckCircle2 size={13} /> : <XCircle size={13} />}
      {text ?? (ok ? 'OK' : 'Non disponibile')}
    </span>
  )
}

function PathField({ label, value, onChange, placeholder, filters, help }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string; filters?: { name: string; extensions: string[] }[]; help?: React.ReactNode }): React.JSX.Element {
  return (
    <div className="field">
      <label>{label}</label>
      <div className="row">
        <input className="input mono" value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />
        <button
          className="btn icon"
          title="Sfoglia"
          onClick={async () => {
            const f = await api.openFiles({ title: label, filters, multi: false })
            if (f[0]) onChange(f[0])
          }}
        >
          <FolderOpen size={14} />
        </button>
      </div>
      {help && <div className="help">{help}</div>}
    </div>
  )
}

export function SettingsDialog(): React.JSX.Element | null {
  const open = useStore((s) => s.settingsOpen)
  const settings = useStore((s) => s.settings)
  const tools = useStore((s) => s.tools)
  const downloads = useStore((s) => s.downloads)
  const [draft, setDraft] = useState<AppSettings | null>(null)
  const [models, setModels] = useState<WhisperModelInfo[]>([])
  const [voices, setVoices] = useState<{ id: string; label: string; sizeMb: number; downloaded: boolean }[]>([])
  const [checking, setChecking] = useState(false)
  const [downloading, setDownloading] = useState<string | null>(null)
  const exe = navigator.platform.toLowerCase().includes('win') ? ['exe'] : ['*']

  useEffect(() => {
    if (open && settings) {
      setDraft(settings)
      void api.listModels().then(setModels)
      void api.listVoices().then(setVoices)
    }
  }, [open, settings])
  if (!open || !draft) return null
  const set = (p: Partial<AppSettings>): void => setDraft({ ...draft, ...p })

  const save = async (): Promise<void> => {
    await updateSettings(draft)
    setChecking(true)
    try {
      await refreshTools()
    } finally {
      setChecking(false)
    }
    toast('Impostazioni salvate', 'success')
  }

  const download = async (name: string): Promise<void> => {
    setDownloading(name)
    try {
      const p = await api.downloadModel(name)
      set({ whisperModelPath: p })
      await updateSettings({ whisperModelPath: p })
      setModels(await api.listModels())
      toast(`Modello ${name} scaricato`, 'success')
      void refreshTools()
    } catch (e) {
      toast(`Download non riuscito: ${errMsg(e)}`, 'error')
    } finally {
      setDownloading(null)
    }
  }

  return (
    <Modal
      wide
      title="Impostazioni e strumenti"
      onClose={() => openSettings(false)}
      footer={
        <>
          <button className="btn" onClick={() => openSettings(false)}>Chiudi</button>
          <button className="btn primary" onClick={save} disabled={checking}>
            {checking ? <Loader2 size={14} className="spin" /> : null} Salva e verifica
          </button>
        </>
      }
    >
      <div className="section-title" style={{ marginTop: 0 }}>Aspetto</div>
      <div className="grid2">
        <div className="field">
          <label>Tema</label>
          <div className="seg">
            {(['dark', 'light', 'system'] as const).map((t) => (
              <button key={t} className={clsx(draft.theme === t && 'on')} onClick={() => { set({ theme: t }); void updateSettings({ theme: t }) }}>
                {t === 'dark' ? 'Scuro' : t === 'light' ? 'Chiaro' : 'Sistema'}
              </button>
            ))}
          </div>
        </div>
        <div className="field">
          <label>Lingua predefinita del parlato</label>
          <select className="select" value={draft.defaultLanguage} onChange={(e) => set({ defaultLanguage: e.target.value })}>
            {LANGUAGES.map((l) => <option key={l.value} value={l.value}>{l.label}</option>)}
          </select>
        </div>
      </div>

      <div className="section-title">FFmpeg</div>
      <div className="row" style={{ marginBottom: 8 }}>
        <Status ok={!!tools?.ffmpeg.ok} text={tools?.ffmpeg.ok ? `FFmpeg ${tools.ffmpeg.version}` : tools?.ffmpeg.error} />
        <span className="tiny dim ellipsis grow mono" title={tools?.ffmpeg.path}>{tools?.ffmpeg.path}</span>
      </div>
      <div className="tiny dim" style={{ marginBottom: 10 }}>
        FFmpeg è incluso nell'app. Puoi indicare un'altra versione (ad es. una build con NVENC) lasciando vuoto per usare quella inclusa.
      </div>
      <div className="grid2">
        <PathField label="ffmpeg (opzionale)" value={draft.ffmpegPath} onChange={(v) => set({ ffmpegPath: v })} placeholder="incluso" filters={[{ name: 'Eseguibile', extensions: exe }]} />
        <PathField label="ffprobe (opzionale)" value={draft.ffprobePath} onChange={(v) => set({ ffprobePath: v })} placeholder="incluso" filters={[{ name: 'Eseguibile', extensions: exe }]} />
      </div>
      <div className="row tiny" style={{ gap: 6 }}>
        <span className="dim">Encoder funzionanti:</span>
        {(tools?.encoders ?? []).map((e) => <span key={e} className="badge">{e}</span>)}
      </div>
      <div className="field" style={{ marginTop: 10 }}>
        <label>Thread per la trascrizione</label>
        <input className="input" type="number" min={1} max={32} value={draft.threads} onChange={(e) => set({ threads: Math.max(1, Number(e.target.value) || 1) })} style={{ width: 100 }} />
      </div>

      <div className="section-title">Trascrizione · whisper.cpp (consigliato)</div>
      <div className="row" style={{ marginBottom: 8, gap: 16 }}>
        <Status ok={!!tools?.whisperCpp.ok} text={tools?.whisperCpp.ok ? 'whisper-cli trovato' : tools?.whisperCpp.error} />
        <Status ok={!!tools?.whisperModel.ok} text={tools?.whisperModel.ok ? 'Modello presente' : tools?.whisperModel.error} />
      </div>
      <PathField
        label="Eseguibile whisper-cli"
        value={draft.whisperCliPath}
        onChange={(v) => set({ whisperCliPath: v })}
        placeholder={navigator.platform.toLowerCase().includes('win') ? 'C:\\whisper\\whisper-cli.exe' : '/percorso/whisper-cli'}
        filters={[{ name: 'Eseguibile', extensions: exe }]}
        help={
          <>
            Scarica lo zip per Windows (whisper-bin-x64.zip, o la versione cuBLAS per GPU NVIDIA) dalla pagina delle release, estrailo e seleziona <b>whisper-cli.exe</b>.{' '}
            <button className="btn xs" onClick={() => void api.openExternal('https://github.com/ggml-org/whisper.cpp/releases')}>
              <ExternalLink size={11} /> Release whisper.cpp
            </button>
          </>
        }
      />
      <PathField label="Modello (file ggml-*.bin)" value={draft.whisperModelPath} onChange={(v) => set({ whisperModelPath: v })} filters={[{ name: 'Modello ggml', extensions: ['bin'] }]} />
      <div className="list">
        {models.map((m) => {
          const d = downloads[m.name]
          const pct = d && d.total ? Math.round((d.received / d.total) * 100) : 0
          return (
            <div key={m.name} className="list-row">
              <span style={{ fontWeight: 600, width: 150 }}>{m.name}</span>
              <span className="tiny dim grow">{m.size} · {m.note}</span>
              {downloading === m.name ? (
                <>
                  <div className="progress" style={{ width: 90 }}><div style={{ width: `${pct}%` }} /></div>
                  <span className="tiny" style={{ width: 34 }}>{pct}%</span>
                  <button className="btn xs" onClick={() => void api.cancelDownload()}>Annulla</button>
                </>
              ) : m.downloaded ? (
                <button className={clsx('btn xs', draft.whisperModelPath === m.path && 'active')} onClick={() => set({ whisperModelPath: m.path })}>
                  {draft.whisperModelPath === m.path ? 'In uso' : 'Usa'}
                </button>
              ) : (
                <button className="btn xs" disabled={!!downloading} onClick={() => void download(m.name)}>
                  <Download size={11} /> Scarica
                </button>
              )}
            </div>
          )
        })}
      </div>
      <div className="help" style={{ marginTop: 6 }}>I modelli vengono scaricati da Hugging Face (ggerganov/whisper.cpp) nella cartella dati dell'app. Il download avviene una sola volta.</div>

      <div className="section-title">Voce narrante · Piper (sintesi vocale)</div>
      <div className="row" style={{ marginBottom: 8 }}>
        <Status ok={!!tools?.piper.ok} text={tools?.piper.ok ? 'Piper installato' : tools?.piper.error} />
        <span className="tiny dim ellipsis grow mono" title={tools?.piper.path}>{tools?.piper.path}</span>
        {!tools?.piper.ok && (
          <button
            className="btn sm primary"
            disabled={!!downloading}
            onClick={async () => {
              setDownloading('piper')
              try {
                const p = await api.installPiper()
                set({ piperPath: p })
                await refreshTools()
                toast('Piper installato', 'success')
              } catch (e) {
                toast(`Installazione non riuscita: ${errMsg(e)}`, 'error')
              } finally {
                setDownloading(null)
              }
            }}
          >
            {downloading === 'piper' ? <Loader2 size={13} className="spin" /> : <Download size={13} />} Installa Piper (≈ 25 MB)
          </button>
        )}
      </div>
      <div className="help" style={{ marginBottom: 8 }}>Genera una voce parlata dal testo del nodo "Voce narrante". Funziona sul PC, gratis e senza Internet dopo il download.</div>
      <div className="list">
        {voices.map((v) => {
          const d = downloads[v.id]
          const pct = d && d.total ? Math.round((d.received / d.total) * 100) : 0
          return (
            <div key={v.id} className="list-row">
              <span className="grow">{v.label}</span>
              <span className="tiny dim">{v.sizeMb} MB</span>
              {downloading === v.id ? (
                <span className="tiny" style={{ width: 70, textAlign: 'right' }}>{pct}%</span>
              ) : v.downloaded ? (
                <span className="tiny" style={{ color: 'var(--ok)', width: 70, textAlign: 'right' }}>Scaricata</span>
              ) : (
                <button
                  className="btn xs"
                  disabled={!!downloading}
                  onClick={async () => {
                    setDownloading(v.id)
                    try {
                      await api.downloadVoice(v.id)
                      setVoices(await api.listVoices())
                      toast(`Voce "${v.label}" pronta`, 'success')
                    } catch (e) {
                      toast(`Download non riuscito: ${errMsg(e)}`, 'error')
                    } finally {
                      setDownloading(null)
                    }
                  }}
                >
                  <Download size={11} /> Scarica
                </button>
              )}
            </div>
          )
        })}
      </div>

      <div className="section-title">Trascrizione · faster-whisper (alternativa Python)</div>
      <div className="row" style={{ marginBottom: 8 }}>
        <Status ok={!!tools?.fasterWhisper.ok} text={tools?.fasterWhisper.ok ? 'faster-whisper installato' : tools?.fasterWhisper.error} />
      </div>
      <PathField
        label="Interprete Python (opzionale)"
        value={draft.pythonPath}
        onChange={(v) => set({ pythonPath: v })}
        placeholder="python"
        filters={[{ name: 'Python', extensions: exe }]}
        help={<>Richiede Python 3.9+ e <code>pip install faster-whisper</code>. Il modello viene scaricato automaticamente al primo uso.</>}
      />
      <button className="btn sm" onClick={async () => { setChecking(true); try { await refreshTools() } finally { setChecking(false) } }}>
        <RefreshCw size={13} className={checking ? 'spin' : ''} /> Verifica di nuovo
      </button>
    </Modal>
  )
}
