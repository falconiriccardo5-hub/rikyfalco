import { useEffect, useState } from 'react'
import QRCode from 'qrcode'
import { RefreshCw, ShieldOff, Smartphone } from 'lucide-react'
import type { RemoteStatus } from '@shared/types'
import { api } from '../lib/util'
import { errMsg, toast } from '../store/store'
import { Toggle } from './fields/Fields'
import { Modal } from './Modal'

/** Accesso da iPhone/telefono: server sulla rete locale con abbinamento. */
export function PhoneDialog({ onClose }: { onClose: () => void }): React.JSX.Element {
  const [st, setSt] = useState<RemoteStatus | null>(null)
  const [qr, setQr] = useState('')
  const [busy, setBusy] = useState(false)
  const url = st?.urls[0] ?? ''

  useEffect(() => {
    void api.remoteStatus().then(setSt)
    const t = setInterval(() => void api.remoteStatus().then(setSt), 3000)
    return () => clearInterval(t)
  }, [])
  useEffect(() => {
    if (!url) return setQr('')
    void QRCode.toDataURL(url, { margin: 1, width: 220, color: { dark: '#111111', light: '#ffffff' } }).then(setQr)
  }, [url])

  const set = async (patch: { enabled?: boolean; port?: number }): Promise<void> => {
    setBusy(true)
    try {
      const s = await api.remoteSet(patch)
      setSt(s)
      if (s.error) toast(s.error, 'error')
    } catch (e) {
      toast(errMsg(e), 'error')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal title={<><Smartphone size={17} /> Usa FlowCut dall'iPhone</>} onClose={onClose} wide>
      <Toggle checked={!!st?.enabled} onChange={(v) => void set({ enabled: v })} label={<b>Consenti l'accesso dal telefono sulla rete Wi-Fi</b>} />
      <div className="help" style={{ marginTop: -6, marginBottom: 12 }}>
        Il telefono carica il video, sceglie il workflow e scarica il risultato: l'elaborazione la fa questo PC.
        Al primo avvio Windows può chiedere di consentire l'accesso alla rete: scegli <b>Reti private</b>.
      </div>
      {st?.enabled && st.running && (
        <div className="row" style={{ alignItems: 'flex-start', gap: 22 }}>
          <div style={{ background: '#fff', padding: 8, borderRadius: 14, flexShrink: 0 }}>
            {qr ? <img src={qr} width={190} height={190} alt="Codice QR dell'indirizzo" /> : <div style={{ width: 190, height: 190 }} />}
          </div>
          <div className="grow">
            <div className="label">1. Inquadra il QR con la fotocamera dell'iPhone, oppure apri in Safari:</div>
            {st.urls.map((u) => (
              <div key={u} className="mono selectable" style={{ fontSize: 15, fontWeight: 600, margin: '4px 0' }}>{u}</div>
            ))}
            <div className="label" style={{ marginTop: 12 }}>2. Inserisci il codice di abbinamento:</div>
            <div className="row">
              <div className="mono selectable" style={{ fontSize: 30, fontWeight: 700, letterSpacing: 6, color: 'var(--accent)' }}>{st.pairingCode}</div>
              <button className="btn xs" onClick={async () => setSt(await api.remoteNewCode())} title="Genera un nuovo codice">
                <RefreshCw size={11} /> Nuovo
              </button>
            </div>
            <div className="label" style={{ marginTop: 12 }}>3. In Safari: Condividi → <b>Aggiungi alla schermata Home</b>.</div>
            <div className="help">L'icona di FlowCut sulla Home si apre a tutto schermo come un'app.</div>
          </div>
        </div>
      )}
      {st?.enabled && !st.running && (
        <div className="callout err"><div className="txt">Server non avviato: {st.error ?? 'errore sconosciuto'}</div></div>
      )}
      <div className="section-title">Avanzate</div>
      <div className="row wrap">
        <span className="small muted">Porta</span>
        <input
          className="input sm"
          style={{ width: 90 }}
          type="number"
          defaultValue={st?.port ?? 7878}
          key={st?.port}
          onBlur={(e) => {
            const v = Number(e.target.value)
            if (v && v !== st?.port) void set({ port: v })
          }}
        />
        <span className="spacer" />
        <span className="small muted">{st?.devices ?? 0} dispositivi abbinati</span>
        <button
          className="btn sm danger"
          disabled={!st?.devices || busy}
          onClick={async () => {
            if (!confirm('Scollegare tutti i telefoni abbinati? Dovranno inserire di nuovo il codice.')) return
            setSt(await api.remoteRevoke())
          }}
        >
          <ShieldOff size={13} /> Scollega tutti
        </button>
      </div>
      <div className="help" style={{ marginTop: 10 }}>
        Fuori casa: installa la web app anche dalla versione online (modalità "solo telefono"), oppure usa una VPN come Tailscale per raggiungere il PC.
        I video ricevuti finiscono in Documenti\FlowCut\Telefono.
      </div>
    </Modal>
  )
}
