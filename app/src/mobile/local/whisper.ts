import type { Word } from '@shared/types'

export type WhisperModel = 'tiny' | 'base' | 'small'

export const WHISPER_SIZES: Record<WhisperModel, string> = {
  tiny: 'veloce, circa 40 MB',
  base: 'consigliato, circa 80 MB',
  small: 'più preciso, circa 250 MB'
}

let worker: Worker | null = null

/** Trascrive l'audio (16 kHz mono) nel Worker; il modello viene scaricato al primo uso. */
export function transcribe(
  audio: Float32Array,
  model: WhisperModel,
  language: string,
  onProgress: (p: number, message: string) => void
): Promise<Word[]> {
  if (!worker) worker = new Worker(new URL('./whisper.worker.ts', import.meta.url), { type: 'module' })
  const w = worker
  return new Promise((resolve, reject) => {
    const t0 = Date.now()
    const audioSec = audio.length / 16000
    let tick: ReturnType<typeof setInterval> | null = null
    const done = (): void => {
      if (tick) clearInterval(tick)
      w.removeEventListener('message', onMsg)
    }
    const onMsg = (ev: MessageEvent): void => {
      const m = ev.data
      if (m.type === 'progress' && m.phase === 'download') onProgress(0.3 * m.progress, `Download modello Whisper ${Math.round(m.progress * 100)}%`)
      else if (m.type === 'progress' && m.phase === 'transcribe') {
        // La libreria non riporta l'avanzamento: stima basata sulla durata dell'audio.
        const start = Date.now()
        tick = setInterval(() => {
          const est = Math.min(0.95, (Date.now() - start) / 1000 / Math.max(5, audioSec * 0.6))
          onProgress(0.3 + 0.7 * est, `Trascrizione (stima ${Math.round(est * 100)}%)`)
        }, 500)
      } else if (m.type === 'result') {
        done()
        onProgress(1, `Trascrizione completata in ${Math.round((Date.now() - t0) / 1000)} s`)
        resolve(m.words as Word[])
      } else if (m.type === 'error') {
        done()
        reject(new Error(m.message))
      }
    }
    w.addEventListener('message', onMsg)
    const copy = new Float32Array(audio)
    w.postMessage({ type: 'run', audio: copy, model, language }, [copy.buffer])
  })
}

export function stopWhisper(): void {
  worker?.terminate()
  worker = null
}
