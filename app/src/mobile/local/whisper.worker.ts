// Trascrizione sul telefono con transformers.js (Whisper in WebAssembly).
// La libreria viene caricata dalla CDN al primo uso e poi resta in cache.

const CDN = 'https://cdn.jsdelivr.net/npm/@huggingface/transformers@4.3.1/+esm'

interface RunMsg {
  type: 'run'
  audio: Float32Array
  model: 'tiny' | 'base' | 'small'
  language: string
}

interface Chunk {
  text: string
  timestamp: [number, number | null]
}

type Pipe = (audio: Float32Array, opts: Record<string, unknown>) => Promise<{ text: string; chunks?: Chunk[] }>

const cache = new Map<string, Pipe>()

function post(m: unknown): void {
  ;(self as unknown as Worker).postMessage(m)
}

async function getPipe(model: string): Promise<{ pipe: Pipe; wordLevel: boolean }> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const tf: any = await import(/* @vite-ignore */ CDN)
  tf.env.allowLocalModels = false
  const files = new Map<string, number>()
  const progress_callback = (p: { status: string; file?: string; progress?: number }): void => {
    if (p.status === 'progress' && p.file) {
      files.set(p.file, p.progress ?? 0)
      const vals = [...files.values()]
      post({ type: 'progress', phase: 'download', progress: vals.reduce((a, b) => a + b, 0) / vals.length / 100 })
    }
  }
  // Modelli con tempi per parola (attenzioni incrociate); in alternativa il modello standard.
  for (const [id, wordLevel] of [[`onnx-community/whisper-${model}_timestamped`, true], [`Xenova/whisper-${model}`, false]] as const) {
    const key = id
    if (cache.has(key)) return { pipe: cache.get(key)!, wordLevel }
    try {
      const pipe = (await tf.pipeline('automatic-speech-recognition', id, { dtype: 'q8', device: 'wasm', progress_callback })) as Pipe
      cache.set(key, pipe)
      return { pipe, wordLevel }
    } catch (e) {
      post({ type: 'log', message: `Modello ${id} non disponibile: ${(e as Error).message}` })
    }
  }
  throw new Error('Impossibile scaricare il modello di trascrizione (serve Internet al primo uso).')
}

self.onmessage = async (ev: MessageEvent<RunMsg>) => {
  const m = ev.data
  if (m.type !== 'run') return
  try {
    post({ type: 'progress', phase: 'download', progress: 0 })
    const { pipe, wordLevel } = await getPipe(m.model)
    post({ type: 'progress', phase: 'transcribe', progress: 0 })
    const opts: Record<string, unknown> = {
      return_timestamps: wordLevel ? 'word' : true,
      chunk_length_s: 30,
      stride_length_s: 5,
      task: 'transcribe'
    }
    if (m.language && m.language !== 'auto') opts.language = m.language
    const out = await pipe(m.audio, opts)
    const words: { start: number; end: number; text: string }[] = []
    for (const c of out.chunks ?? []) {
      const s = c.timestamp[0] ?? 0
      const e = c.timestamp[1] ?? s + 0.3
      if (wordLevel) {
        const t = c.text.trim()
        if (t) words.push({ start: s, end: Math.max(e, s + 0.05), text: t })
      } else {
        // Solo tempi per frase: le parole vengono distribuite in proporzione alla lunghezza.
        const toks = c.text.trim().split(/\s+/).filter(Boolean)
        const total = toks.reduce((a, b) => a + b.length + 1, 0)
        let t = s
        for (const tok of toks) {
          const d = ((e - s) * (tok.length + 1)) / Math.max(1, total)
          words.push({ start: t, end: t + d, text: tok })
          t += d
        }
      }
    }
    post({ type: 'result', words, wordLevel })
  } catch (e) {
    post({ type: 'error', message: (e as Error).message || String(e) })
  }
}
