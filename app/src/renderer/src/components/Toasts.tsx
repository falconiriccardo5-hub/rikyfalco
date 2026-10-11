import { AlertCircle, CheckCircle2, Info } from 'lucide-react'
import { useStore } from '../store/store'

export function Toasts(): React.JSX.Element {
  const toasts = useStore((s) => s.toasts)
  return (
    <div className="toasts">
      {toasts.map((t) => (
        <div key={t.id} className={`toast ${t.kind}`}>
          {t.kind === 'error' ? (
            <AlertCircle size={16} color="var(--err)" />
          ) : t.kind === 'success' ? (
            <CheckCircle2 size={16} color="var(--ok)" />
          ) : (
            <Info size={16} color="var(--accent)" />
          )}
          <div className="grow selectable">{t.text}</div>
        </div>
      ))}
    </div>
  )
}
