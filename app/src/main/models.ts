// Download dei modelli Whisper (formato ggml per whisper.cpp) da Hugging Face.

import fs from 'fs'
import path from 'path'
import { net } from 'electron'

export const WHISPER_MODELS = [
  { name: 'tiny', size: '75 MB', note: 'molto veloce, qualità bassa' },
  { name: 'base', size: '142 MB', note: 'veloce' },
  { name: 'small', size: '466 MB', note: 'buon compromesso (consigliato)' },
  { name: 'medium', size: '1.5 GB', note: 'qualità alta, lento' },
  { name: 'large-v3-turbo-q5_0', size: '547 MB', note: 'qualità molto alta, compresso' },
  { name: 'large-v3-turbo', size: '1.6 GB', note: 'qualità massima' }
]

export function modelUrl(name: string): string {
  return `https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-${name}.bin`
}

export async function downloadModel(
  name: string,
  dir: string,
  signal: AbortSignal,
  onProgress: (received: number, total: number) => void
): Promise<string> {
  if (!WHISPER_MODELS.some((m) => m.name === name)) throw new Error(`Modello sconosciuto: ${name}`)
  fs.mkdirSync(dir, { recursive: true })
  const dest = path.join(dir, `ggml-${name}.bin`)
  if (fs.existsSync(dest)) return dest
  const part = dest + '.part'
  const res = await net.fetch(modelUrl(name), { signal })
  if (!res.ok || !res.body) throw new Error(`Download non riuscito (HTTP ${res.status})`)
  const total = Number(res.headers.get('content-length') ?? 0)
  const out = fs.createWriteStream(part)
  let received = 0
  let last = 0
  try {
    const reader = res.body.getReader()
    for (;;) {
      const { done, value } = await reader.read()
      if (done) break
      received += value.length
      if (!out.write(Buffer.from(value))) await new Promise<void>((r) => out.once('drain', () => r()))
      const now = Date.now()
      if (now - last > 200) {
        last = now
        onProgress(received, total)
      }
    }
    await new Promise<void>((resolve, reject) => out.end((err?: Error | null) => (err ? reject(err) : resolve())))
  } catch (e) {
    out.destroy()
    fs.rmSync(part, { force: true })
    throw e
  }
  if (total && received !== total) {
    fs.rmSync(part, { force: true })
    throw new Error('Download incompleto, riprova.')
  }
  fs.renameSync(part, dest)
  onProgress(received, total)
  return dest
}

export function listDownloadedModels(dir: string): string[] {
  if (!fs.existsSync(dir)) return []
  return fs.readdirSync(dir).filter((f) => /^ggml-.*\.bin$/.test(f)).map((f) => path.join(dir, f))
}
