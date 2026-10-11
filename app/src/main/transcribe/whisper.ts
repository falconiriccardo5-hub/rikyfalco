// Adattatori per la trascrizione locale.
//  - whisper.cpp: eseguibile `whisper-cli` + modello ggml (nessun Python richiesto)
//  - faster-whisper: script Python incluso in resources/python

import fs from 'fs'
import path from 'path'
import type { Word } from '../../shared/types'
import { runProcess } from '../ffmpeg/run'

export interface TranscribeOptions {
  wavPath: string
  outDir: string
  language: string
  prompt: string
  threads: number
  signal: AbortSignal
  onProgress: (fraction: number) => void
  onLog: (msg: string) => void
}

interface WhisperToken {
  text: string
  offsets?: { from: number; to: number }
  t_dtw?: number
}

interface WhisperCppJson {
  result?: { language?: string }
  transcription?: { offsets?: { from: number; to: number }; text?: string; tokens?: WhisperToken[] }[]
}

/** Nome del preset DTW di whisper.cpp ricavato dal nome del file del modello. */
export function dtwPreset(modelPath: string): string | null {
  const m = /ggml-(tiny|base|small|medium|large-v1|large-v2|large-v3-turbo|large-v3)(\.en)?/i.exec(path.basename(modelPath))
  if (!m) return null
  return m[1].toLowerCase().replace('large-v', 'large.v').replace('-turbo', '.turbo') + (m[2] ?? '')
}

/** Durata plausibile di una parola (usata quando i tempi di fine non sono affidabili). */
function maxWordDuration(text: string): number {
  return Math.min(1.2, 0.15 + text.trim().length * 0.075)
}

/**
 * Converte i token di whisper.cpp in parole. Con DTW ogni token ha un istante
 * preciso (t_dtw, in centesimi di secondo); senza DTW si usano gli offset.
 */
export function wordsFromWhisperJson(j: WhisperCppJson): Word[] {
  const tokens: { text: string; t: number; end: number }[] = []
  for (const seg of j.transcription ?? []) {
    for (const tk of seg.tokens ?? []) {
      if (!tk.text || /^\[_.*_?\]$/.test(tk.text.trim()) || /^\[_/.test(tk.text)) continue
      const dtw = typeof tk.t_dtw === 'number' && tk.t_dtw >= 0 ? tk.t_dtw / 100 : null
      const from = (tk.offsets?.from ?? seg.offsets?.from ?? 0) / 1000
      const to = (tk.offsets?.to ?? seg.offsets?.to ?? 0) / 1000
      tokens.push({ text: tk.text, t: dtw ?? from, end: dtw === null ? to : NaN })
    }
  }
  // Raggruppa i token in parole: un token che inizia con uno spazio apre una nuova parola.
  const words: { text: string; start: number; endHint: number }[] = []
  for (const tk of tokens) {
    const prev = words[words.length - 1]
    if (prev && !/^\s/.test(tk.text)) {
      prev.text += tk.text
      if (isFinite(tk.end)) prev.endHint = Math.max(prev.endHint, tk.end)
      continue
    }
    words.push({ text: tk.text, start: tk.t, endHint: tk.end })
  }
  const out: Word[] = []
  for (let i = 0; i < words.length; i++) {
    const w = words[i]
    const text = w.text.trim()
    if (!text || /^\[.*\]$/.test(text) || /^\(.*\)$/.test(text)) continue
    const next = words[i + 1]?.start
    let end = isFinite(w.endHint) ? w.endHint : w.start + maxWordDuration(text)
    if (next !== undefined && next > w.start) end = Math.min(end, next)
    out.push({ start: w.start, end: Math.max(end, w.start + 0.05), text })
  }
  return out
}

export async function transcribeWhisperCpp(
  cli: string,
  model: string,
  o: TranscribeOptions
): Promise<{ words: Word[]; language: string }> {
  if (!cli || !fs.existsSync(cli)) {
    throw new Error('whisper.cpp non configurato: imposta il percorso di whisper-cli nelle Impostazioni (vedi README).')
  }
  if (!model || !fs.existsSync(model)) {
    throw new Error('Modello Whisper non trovato: scaricalo dalle Impostazioni o indica il file ggml-*.bin.')
  }
  const base = path.join(o.outDir, 'whisper')
  // Percorsi relativi alla cartella di lavoro: su Windows whisper.cpp può non aprire
  // file con caratteri accentati nel percorso assoluto (es. nome utente).
  const relWav = path.relative(o.outDir, o.wavPath) || o.wavPath
  const common = ['-m', model, '-f', relWav, '-l', o.language || 'auto', '-t', String(o.threads), '-ojf', '-of', 'whisper', '-pp']
  if (o.prompt.trim()) common.push('--prompt', o.prompt.trim())
  const preset = dtwPreset(model)
  // Tentativi: DTW (tempi precisi) → DTW con build più vecchie → senza DTW.
  const attempts: string[][] = preset ? [['--dtw', preset, '-nfa'], ['--dtw', preset], []] : [[]]
  let lastErr = ''
  for (const extra of attempts) {
    const args = [...common, ...extra]
    o.onLog(`whisper.cpp: ${path.basename(cli)} ${args.join(' ')}`)
    fs.rmSync(base + '.json', { force: true })
    const res = await runProcess(cli, args, {
      cwd: o.outDir,
      signal: o.signal,
      onStderr: (s) => {
        const m = /progress\s*=\s*(\d+)%/.exec(s)
        if (m) o.onProgress(Number(m[1]) / 100)
      }
    })
    if (res.code === 0 && fs.existsSync(base + '.json')) {
      const j = JSON.parse(fs.readFileSync(base + '.json', 'utf8')) as WhisperCppJson
      if (!extra.length && preset) o.onLog('whisper.cpp: DTW non disponibile, tempi delle parole meno precisi')
      return { words: wordsFromWhisperJson(j), language: j.result?.language ?? o.language }
    }
    lastErr = res.stderr.split('\n').filter(Boolean).slice(-5).join(' | ')
    if (!/unknown argument|invalid argument|unrecognized|dtw|flash/i.test(res.stderr)) break
  }
  throw new Error(`whisper.cpp terminato con errore: ${lastErr}`)
}

export async function transcribeFasterWhisper(
  python: string,
  script: string,
  modelName: string,
  o: TranscribeOptions
): Promise<{ words: Word[]; language: string }> {
  if (!fs.existsSync(script)) throw new Error(`Script mancante: ${script}`)
  const out = path.join(o.outDir, 'faster_whisper.json')
  const args = [
    script, '--audio', o.wavPath, '--model', modelName, '--language', o.language || 'auto',
    '--threads', String(o.threads), '--out', out
  ]
  if (o.prompt.trim()) args.push('--prompt', o.prompt.trim())
  const res = await runProcess(python || (process.platform === 'win32' ? 'python' : 'python3'), args, {
    signal: o.signal,
    env: { ...process.env, PYTHONIOENCODING: 'utf-8', PYTHONUNBUFFERED: '1' },
    onStdout: (s) => {
      for (const line of s.split('\n')) {
        const m = /^PROGRESS\s+([\d.]+)/.exec(line.trim())
        if (m) o.onProgress(Number(m[1]))
        else if (line.startsWith('LOG ')) o.onLog(line.slice(4))
      }
    }
  })
  if (res.code !== 0) {
    const tail = res.stderr.split('\n').filter(Boolean).slice(-6).join(' | ')
    if (/No module named ['"]?faster_whisper/.test(res.stderr)) {
      throw new Error('Modulo Python "faster-whisper" non installato. Esegui: pip install faster-whisper')
    }
    throw new Error(`faster-whisper terminato con errore: ${tail}`)
  }
  const j = JSON.parse(fs.readFileSync(out, 'utf8')) as { language: string; words: Word[] }
  const words = j.words
    .map((w) => ({ start: w.start, end: Math.max(w.end, w.start + 0.05), text: w.text.trim() }))
    .filter((w) => w.text && !/^\[.*\]$/.test(w.text))
  return { words, language: j.language }
}

export async function checkFasterWhisper(python: string): Promise<{ ok: boolean; error?: string }> {
  try {
    const r = await runProcess(python || (process.platform === 'win32' ? 'python' : 'python3'), [
      '-c', 'import faster_whisper,sys;print(faster_whisper.__version__)'
    ])
    return r.code === 0 ? { ok: true } : { ok: false, error: 'faster-whisper non installato' }
  } catch (e) {
    return { ok: false, error: (e as Error).message }
  }
}
