import { useEffect } from 'react'
import { X } from 'lucide-react'
import { clsx } from '../lib/util'

export function Modal({
  title, onClose, children, footer, wide
}: {
  title: React.ReactNode
  onClose: () => void
  children: React.ReactNode
  footer?: React.ReactNode
  wide?: boolean
}): React.JSX.Element {
  useEffect(() => {
    const fn = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', fn)
    return () => window.removeEventListener('keydown', fn)
  }, [onClose])
  return (
    <div className="modal-bg" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className={clsx('modal', wide && 'wide')} role="dialog">
        <div className="modal-head">
          {title}
          <span className="spacer" />
          <button className="btn ghost icon sm" onClick={onClose} aria-label="Chiudi">
            <X size={15} />
          </button>
        </div>
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-foot">{footer}</div>}
      </div>
    </div>
  )
}
