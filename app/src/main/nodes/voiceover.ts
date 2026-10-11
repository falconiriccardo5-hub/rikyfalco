// Nodo "Voce narrante": genera la voce dal testo con Piper e la colloca nel video.

import fs from 'fs'
import path from 'path'
import { computeLayout, formatTime, hashString, outputToSource } from '../../shared/timeline'
import { PIPER_VOICES } from '../../shared/voices'
import type { VoiceClip, VoiceoverTrack, Word } from '../../shared/types'
import { probe } from '../ffmpeg/probe'
import { bool, num, requireInput, str, type NodeImpl } from '../engine/context'
import { knownVoice, parseScript, synthesize, voiceInstalled, voiceModelPath } from '../voice/piper'

/** Parole di una frase distribuite sulla durata della voce, in proporzione alla lunghezza. */
function wordsForClip(c: VoiceClip): Word[] {
  const toks = c.text.split(/\s+/).filter(Boolean)
  const total = toks.reduce((a, t) => a + t.length + 1, 0)
  const words: Word[] = []
  // Piccolo margine iniziale e finale: Piper aggiunge silenzio ai bordi.
  const lead = Math.min(0.12, c.duration * 0.05)
  const span = Math.max(0.1, c.duration - lead * 2)
  let t = c.start + lead
  for (const tok of toks) {
    const d = (span * (tok.length + 1)) / Math.max(1, total)
    words.push({ start: t, end: t + d * 0.92, text: tok })
    t += d
  }
  return words
}

export const voiceoverNode: NodeImpl = {
  async run(ctx, input, s) {
    const tl = requireInput(input)
    const piper = ctx.settings.piperPath
    if (!piper || !fs.existsSync(piper)) {
      throw new Error('Piper non è installato: aprilo da Impostazioni → Voce narrante → "Installa Piper" (oppure rilancia INSTALLA-FLOWCUT.bat).')
    }
    const voiceId = str(s.voice, 'it_IT-paola-medium')
    if (!knownVoice(voiceId)) throw new Error(`Voce sconosciuta: ${voiceId}`)
    if (!voiceInstalled(ctx.dataDir, voiceId)) {
      const label = PIPER_VOICES.find((v) => v.id === voiceId)?.label ?? voiceId
      throw new Error(`La voce "${label}" non è scaricata: scaricala da Impostazioni → Voce narrante.`)
    }
    const lines = parseScript(str(s.script))
    if (!lines.length) throw new Error('Scrivi il testo da leggere (una frase per riga).')

    const model = voiceModelPath(ctx.dataDir, voiceId)
    const speed = num(s.speed, 1)
    const gap = Math.max(0, num(s.gap, 0.5))
    const layout = computeLayout(tl.segments, tl.source.fps, tl.transitions)
    const warnings: string[] = []
    const clips: VoiceClip[] = []
    let cursor = Math.max(0, num(s.startAt, 0.5))

    for (let i = 0; i < lines.length; i++) {
      const l = lines[i]
      ctx.progress(i / lines.length, `Voce ${i + 1}/${lines.length}`)
      // I file generati restano in cache: cambiare solo la posizione non rigenera la voce.
      const file = path.join(ctx.nodeDir, `voce_${hashString(`${voiceId}|${speed}|${l.text}`)}.wav`)
      if (!fs.existsSync(file)) await synthesize(piper, model, l.text, file, speed, ctx.signal)
      const duration = (await probe(ctx.tools, file)).duration
      let outStart = l.at ?? cursor
      if (l.at !== null && l.at < cursor - 0.05) {
        warnings.push(`La frase a ${formatTime(l.at)} si sovrappone alla precedente: spostata a ${formatTime(cursor)}.`)
        outStart = cursor
      }
      if (outStart >= layout.mainDuration) {
        warnings.push(`"${l.text.slice(0, 40)}…" inizierebbe dopo la fine del video (${formatTime(layout.mainDuration)}): ignorata.`)
        continue
      }
      if (outStart + duration > layout.mainDuration + 0.05) warnings.push(`"${l.text.slice(0, 40)}…" finisce oltre la fine del video e verrà troncata.`)
      const src = outputToSource(layout, outStart)
      if (src === null) continue
      clips.push({ path: file, start: src, duration, text: l.text })
      cursor = outStart + duration + gap
    }
    if (!clips.length) throw new Error('Nessuna frase rientra nella durata del video.')

    const track: VoiceoverTrack = {
      clips,
      volumeDb: num(s.volumeDb, 0),
      original: (['keep', 'duck', 'mute'].includes(str(s.original)) ? s.original : 'duck') as VoiceoverTrack['original']
    }
    const total = clips.reduce((a, c) => a + c.duration, 0)
    const fromText = bool(s.subtitlesFromText, true)
    const words = clips.flatMap(wordsForClip)
    const voice = PIPER_VOICES.find((v) => v.id === voiceId)!
    return {
      output: {
        ...tl,
        voiceover: track,
        transcript: fromText ? { language: voice.language, engine: 'voce narrante', words, text: words.map((w) => w.text).join(' ') } : tl.transcript
      },
      result: {
        summary: `${clips.length} frasi · ${total.toFixed(1)} s di voce`,
        items: [
          { label: 'Voce', value: voice.label },
          { label: 'Frasi', value: String(clips.length) },
          { label: 'Durata voce', value: `${total.toFixed(1)} s` },
          { label: 'Fine dell\'ultima frase', value: formatTime(cursor - gap) },
          { label: 'Audio originale', value: { keep: 'mantenuto', duck: 'abbassato durante la voce', mute: 'tolto' }[track.original] },
          { label: 'Sottotitoli dal testo', value: fromText ? 'sì' : 'no' }
        ],
        files: clips.slice(0, 1).map((c) => ({ label: 'Prima frase (WAV)', path: c.path })),
        warnings
      }
    }
  }
}
