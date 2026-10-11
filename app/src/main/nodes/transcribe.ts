// Nodo "Trascrizione": riconoscimento vocale locale.

import fs from 'fs'
import path from 'path'
import type { Transcript } from '../../shared/types'
import { requireInput, str, type NodeImpl } from '../engine/context'
import { transcribeFasterWhisper, transcribeWhisperCpp } from '../transcribe/whisper'
import { extractWav } from './source'

export const transcribeNode: NodeImpl = {
  async run(ctx, input, s) {
    const tl = requireInput(input)
    // Con la voce narrante il testo è già noto: niente riconoscimento vocale (e Whisper non serve).
    if (tl.transcript?.engine === 'voce narrante') {
      return {
        output: tl,
        result: {
          summary: `Testo della voce narrante (${tl.transcript.words.length} parole)`,
          items: [{ label: 'Fonte', value: 'Testo del nodo "Voce narrante": trascrizione non necessaria' }],
          files: []
        }
      }
    }
    if (!tl.source.hasAudio) throw new Error('Il video non contiene una traccia audio da trascrivere.')
    let wav = tl.analysis.audioPath
    if (!wav || !fs.existsSync(wav)) {
      wav = path.join(ctx.nodeDir, 'audio16k.wav')
      await extractWav(ctx, tl.source.path, tl.source.duration, wav, [0, 0.1])
    }
    const engine = str(s.engine, 'whisper.cpp')
    const language = str(s.language, ctx.settings.defaultLanguage || 'auto')
    const opts = {
      wavPath: wav,
      outDir: ctx.nodeDir,
      language,
      prompt: str(s.prompt),
      threads: Math.max(1, ctx.settings.threads || 4),
      signal: ctx.signal,
      onProgress: (f: number) => ctx.progress(0.1 + f * 0.9, `Trascrizione ${Math.round(f * 100)}%`),
      onLog: (m: string) => ctx.log('debug', m)
    }
    ctx.progress(0.1, `Trascrizione con ${engine}`)
    const r =
      engine === 'faster-whisper'
        ? await transcribeFasterWhisper(
            ctx.settings.pythonPath,
            path.join(ctx.resourcesDir, 'python', 'transcribe_fw.py'),
            str(s.model, 'small'),
            opts
          )
        : await transcribeWhisperCpp(ctx.settings.whisperCliPath, ctx.settings.whisperModelPath, opts)

    const text = r.words.map((w) => w.text).join(' ')
    const transcript: Transcript = { language: r.language, engine, words: r.words, text }
    const txt = path.join(ctx.nodeDir, 'trascrizione.txt')
    fs.writeFileSync(txt, text, 'utf8')
    fs.writeFileSync(path.join(ctx.nodeDir, 'transcript.json'), JSON.stringify(transcript), 'utf8')
    const warnings = r.words.length ? [] : ['Nessuna parola riconosciuta: verifica lingua e volume dell\'audio.']
    return {
      output: { ...tl, transcript },
      result: {
        summary: `${r.words.length} parole · ${r.language}`,
        items: [
          { label: 'Motore', value: engine },
          { label: 'Lingua', value: r.language },
          { label: 'Parole', value: String(r.words.length) },
          { label: 'Anteprima', value: text.slice(0, 280) + (text.length > 280 ? '…' : '') }
        ],
        files: [{ label: 'Testo trascritto', path: txt }],
        warnings
      }
    }
  }
}
