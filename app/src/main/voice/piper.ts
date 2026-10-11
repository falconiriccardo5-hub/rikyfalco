// Sintesi vocale locale con Piper (https://github.com/rhasspy/piper).

import fs from 'fs'
import path from 'path'
import { PIPER_VOICES } from '../../shared/voices'
import { runProcess } from '../ffmpeg/run'

export function voicesDir(dataDir: string): string {
  return path.join(dataDir, 'voices')
}

export function voiceModelPath(dataDir: string, id: string): string {
  return path.join(voicesDir(dataDir), `${id}.onnx`)
}

export function voiceInstalled(dataDir: string, id: string): boolean {
  const p = voiceModelPath(dataDir, id)
  return fs.existsSync(p) && fs.existsSync(p + '.json')
}

export function knownVoice(id: string): boolean {
  return PIPER_VOICES.some((v) => v.id === id)
}

export interface ScriptLine {
  /** Momento di inizio richiesto nel video finale (secondi), se indicato. */
  at: number | null
  text: string
}

/** Righe del testo: "1:05 Testo", "[0:20] Testo", "12.5 Testo" oppure solo "Testo". */
export function parseScript(script: string): ScriptLine[] {
  const out: ScriptLine[] = []
  for (const raw of script.split(/\r?\n/)) {
    const line = raw.trim()
    if (!line) continue
    const m = /^\[?\s*(?:(\d+):)?(\d{1,2}):(\d{2}(?:[.,]\d+)?)\s*\]?\s+(.+)$/.exec(line) ?? null
    if (m) {
      const h = m[1] ? Number(m[1]) : 0
      out.push({ at: h * 3600 + Number(m[2]) * 60 + Number(m[3].replace(',', '.')), text: m[4].trim() })
      continue
    }
    const s = /^\[?\s*(\d+(?:[.,]\d+)?)\s*s?\s*\]\s+(.+)$/.exec(line)
    if (s) {
      out.push({ at: Number(s[1].replace(',', '.')), text: s[2].trim() })
      continue
    }
    out.push({ at: null, text: line })
  }
  return out
}

/** Genera un file WAV per una frase. */
export async function synthesize(
  piper: string,
  model: string,
  text: string,
  outFile: string,
  speed: number,
  signal?: AbortSignal
): Promise<void> {
  // Piper vuole una frase per riga: gli a capo interni diventerebbero file separati.
  const clean = text.replace(/\s+/g, ' ').trim()
  const res = await runProcess(
    piper,
    ['--model', model, '--output_file', outFile, '--length_scale', (1 / Math.max(0.3, speed)).toFixed(3), '--sentence_silence', '0.15'],
    { input: clean + '\n', signal, cwd: path.dirname(piper) }
  )
  if (res.code !== 0 || !fs.existsSync(outFile)) {
    const tail = res.stderr.split('\n').map((l) => l.trim()).filter(Boolean).slice(-3).join(' | ')
    throw new Error(`Piper non è riuscito a generare la voce (codice ${res.code}): ${tail || 'nessun messaggio'}`)
  }
}
