// Installazione di Piper e download delle voci (dalle Impostazioni dell'app).

import fs from 'fs'
import path from 'path'
import { net } from 'electron'
import { PIPER_VOICES, voiceUrl } from '../../shared/voices'
import { runProcess } from '../ffmpeg/run'
import { voiceModelPath, voicesDir } from './piper'

const PIPER_RELEASE = 'https://github.com/rhasspy/piper/releases/download/2023.11.14-2/'

async function download(url: string, dest: string, signal: AbortSignal, onProgress: (r: number, t: number) => void): Promise<void> {
  fs.mkdirSync(path.dirname(dest), { recursive: true })
  const part = dest + '.part'
  const res = await net.fetch(url, { signal })
  if (!res.ok || !res.body) throw new Error(`Download non riuscito (HTTP ${res.status}): ${url}`)
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
      if (Date.now() - last > 200) {
        last = Date.now()
        onProgress(received, total)
      }
    }
    await new Promise<void>((resolve, reject) => out.end((e?: Error | null) => (e ? reject(e) : resolve())))
  } catch (e) {
    out.destroy()
    fs.rmSync(part, { force: true })
    throw e
  }
  fs.renameSync(part, dest)
  onProgress(received, total)
}

function findExe(dir: string, name: string): string | null {
  if (!fs.existsSync(dir)) return null
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name)
    if (e.isDirectory()) {
      const r = findExe(p, name)
      if (r) return r
    } else if (e.name === name) return p
  }
  return null
}

/** Scarica ed estrae Piper; restituisce il percorso dell'eseguibile. */
export async function installPiper(dataDir: string, signal: AbortSignal, onProgress: (r: number, t: number) => void): Promise<string> {
  const win = process.platform === 'win32'
  const exeName = win ? 'piper.exe' : 'piper'
  const dir = path.join(dataDir, 'piper')
  const existing = findExe(dir, exeName)
  if (existing) return existing
  const asset = win ? 'piper_windows_amd64.zip' : process.platform === 'darwin' ? 'piper_macos_x64.tar.gz' : 'piper_linux_x86_64.tar.gz'
  const archive = path.join(dataDir, asset)
  await download(PIPER_RELEASE + asset, archive, signal, onProgress)
  fs.mkdirSync(dir, { recursive: true })
  // tar è incluso in Windows 10/11 e sa estrarre anche gli archivi zip.
  const r = await runProcess(win ? 'tar.exe' : 'tar', ['-xf', archive, '-C', dir])
  fs.rmSync(archive, { force: true })
  if (r.code !== 0) throw new Error(`Estrazione di Piper non riuscita: ${r.stderr.slice(-300)}`)
  const exe = findExe(dir, exeName)
  if (!exe) throw new Error('Eseguibile di Piper non trovato nell\'archivio.')
  if (!win) fs.chmodSync(exe, 0o755)
  return exe
}

export async function downloadVoice(dataDir: string, id: string, signal: AbortSignal, onProgress: (r: number, t: number) => void): Promise<void> {
  const v = PIPER_VOICES.find((x) => x.id === id)
  if (!v) throw new Error(`Voce sconosciuta: ${id}`)
  fs.mkdirSync(voicesDir(dataDir), { recursive: true })
  const model = voiceModelPath(dataDir, id)
  await download(voiceUrl(v, 'onnx.json'), model + '.json', signal, () => undefined)
  await download(voiceUrl(v, 'onnx'), model, signal, onProgress)
}
