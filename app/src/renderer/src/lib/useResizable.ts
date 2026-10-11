import { useCallback, useEffect, useRef, useState } from 'react'

/** Dimensione di un pannello trascinabile, memorizzata in localStorage. */
export function useResizable(
  key: string,
  initial: number,
  min: number,
  max: number,
  axis: 'x' | 'y',
  invert = false
): [number, (e: React.MouseEvent) => void, boolean] {
  const [size, setSize] = useState(() => {
    try {
      const v = Number(localStorage.getItem('size:' + key))
      return v >= min && v <= max ? v : initial
    } catch {
      return initial
    }
  })
  const [active, setActive] = useState(false)
  const start = useRef<{ pos: number; size: number } | null>(null)

  const onMove = useCallback(
    (e: MouseEvent) => {
      if (!start.current) return
      const d = (axis === 'x' ? e.clientX : e.clientY) - start.current.pos
      const next = Math.min(max, Math.max(min, start.current.size + (invert ? -d : d)))
      setSize(next)
    },
    [axis, invert, max, min]
  )
  const onUp = useCallback(() => {
    start.current = null
    setActive(false)
    document.body.style.cursor = ''
  }, [])

  useEffect(() => {
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    return () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
  }, [onMove, onUp])

  useEffect(() => {
    try {
      localStorage.setItem('size:' + key, String(Math.round(size)))
    } catch {
      /* ignora */
    }
  }, [key, size])

  const onDown = (e: React.MouseEvent): void => {
    e.preventDefault()
    start.current = { pos: axis === 'x' ? e.clientX : e.clientY, size }
    setActive(true)
    document.body.style.cursor = axis === 'x' ? 'col-resize' : 'row-resize'
  }
  return [size, onDown, active]
}
