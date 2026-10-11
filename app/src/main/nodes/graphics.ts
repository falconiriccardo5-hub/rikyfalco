// Nodi grafici: "Sottotitoli", "Testi e grafiche", "Schermata finale".

import fs from 'fs'
import path from 'path'
import { computeLayout, extractKeywords, groupWordsIntoCues, mapRangeToOutput, outputToSource, speechGaps } from '../../shared/timeline'
import type { Cue, Keyframe, Overlay, OverlayAnimation, SubtitleAnimation, SubtitleStyle, TextPreset, VerticalPosition } from '../../shared/types'
import { buildSrt } from '../render/ass'
import { mapCues } from '../render/compile'
import { bool, mediaPath, num, requireInput, str, type NodeImpl } from '../engine/context'

function parseCues(v: unknown): Cue[] | null {
  if (!Array.isArray(v)) return null
  const out: Cue[] = []
  v.forEach((c, i) => {
    const x = c as Cue
    if (!x || !(num(x.end, 0) > num(x.start, 0)) || typeof x.text !== 'string') return
    out.push({ id: x.id || `e${i}`, start: num(x.start, 0), end: num(x.end, 0), text: x.text, words: Array.isArray(x.words) ? x.words : undefined })
  })
  return out.sort((a, b) => a.start - b.start)
}

export const subtitlesNode: NodeImpl = {
  async run(ctx, input, s) {
    const tl = requireInput(input)
    const edited = parseCues(s.editedCues)
    let cues: Cue[]
    let generated: Cue[] = []
    if (tl.transcript) {
      generated = groupWordsIntoCues(tl.transcript.words, {
        maxChars: num(s.maxChars, 32) * 2,
        maxWords: num(s.maxWords, 7),
        maxDuration: num(s.maxDuration, 4),
        gapBreak: 0.7
      })
    }
    if (edited && edited.length) cues = edited
    else if (tl.transcript) cues = generated
    else throw new Error('Nessuna trascrizione disponibile: collega prima il nodo "Trascrizione" (oppure inserisci i sottotitoli a mano).')

    const style: SubtitleStyle = {
      font: str(s.font, 'Montserrat'),
      fontSize: num(s.fontSize, 64),
      bold: bool(s.bold, true),
      uppercase: bool(s.uppercase),
      color: str(s.color, '#FFFFFF'),
      outlineColor: str(s.outlineColor, '#000000'),
      outline: num(s.outline, 4),
      shadow: num(s.shadow, 0),
      boxed: bool(s.boxed),
      boxColor: str(s.boxColor, '#000000'),
      boxOpacity: num(s.boxOpacity, 60),
      position: str(s.position, 'bottom') as VerticalPosition,
      marginV: num(s.marginV, 9),
      animation: str(s.animation, 'highlight') as SubtitleAnimation,
      highlightColor: str(s.highlightColor, '#FF8A1F'),
      keywords: str(s.keywords).split(',').map((k) => k.trim()).filter(Boolean)
    }
    const track = { cues, style, burn: bool(s.burn, true), exportSrt: bool(s.exportSrt, true), maxChars: num(s.maxChars, 32) }
    const out = { ...tl, subtitles: track }

    // SRT nel tempo del video montato (fin qui).
    const layout = computeLayout(tl.segments, tl.source.fps, tl.transitions)
    const mapped = mapCues(out, layout)
    const srt = path.join(ctx.nodeDir, 'sottotitoli.srt')
    fs.writeFileSync(srt, buildSrt(mapped), 'utf8')
    const suggestions = tl.transcript ? extractKeywords(tl.transcript.words, 12) : []
    return {
      output: out,
      result: {
        summary: `${cues.length} sottotitoli${edited?.length ? ' (modificati)' : ''}`,
        items: [
          { label: 'Sottotitoli', value: String(cues.length) },
          { label: 'Visibili dopo i tagli', value: String(mapped.length) },
          { label: 'Animazione', value: style.animation },
          { label: 'Incisi nel video', value: track.burn ? 'sì' : 'no' },
          { label: 'Parole chiave suggerite', value: suggestions.join(', ') || '-' }
        ],
        files: [{ label: 'SRT (tempo montato)', path: srt }],
        data: { cues, generated, suggestions }
      }
    }
  }
}

const PRESETS: TextPreset[] = ['minimal', 'bold', 'box', 'accent', 'lowerthird']
const ANIMS: OverlayAnimation[] = ['none', 'fade', 'slide-up', 'slide-left', 'pop', 'typewriter']

export const textsNode: NodeImpl = {
  async run(ctx, input, s) {
    const tl = requireInput(input)
    const warnings: string[] = []
    const items: Overlay[] = []
    const raw = Array.isArray(s.items) ? (s.items as (Overlay & { mediaId?: string })[]) : []
    for (const it of raw) {
      const kind = it.kind === 'image' ? 'image' : 'text'
      const imagePath = kind === 'image' ? mediaPath(ctx.media, it.mediaId) : undefined
      if (kind === 'image' && (!imagePath || !fs.existsSync(imagePath))) {
        warnings.push(`Immagine non trovata per l'elemento a ${num(it.start, 0).toFixed(1)}s`)
        continue
      }
      if (kind === 'text' && !String(it.text ?? '').trim()) continue
      items.push({
        id: it.id || `o${items.length}`,
        kind,
        text: String(it.text ?? ''),
        imagePath,
        start: Math.max(0, num(it.start, 0)),
        duration: Math.max(0.2, num(it.duration, 3)),
        preset: PRESETS.includes(it.preset) ? it.preset : 'minimal',
        x: num(it.x, 50),
        y: num(it.y, 50),
        size: num(it.size, kind === 'image' ? 25 : 64),
        color: str(it.color, '#FFFFFF'),
        animationIn: ANIMS.includes(it.animationIn) ? it.animationIn : 'fade',
        animationOut: ANIMS.includes(it.animationOut) ? it.animationOut : 'fade',
        animDuration: num(it.animDuration, 0.35),
        keyframes: Array.isArray(it.keyframes) ? (it.keyframes as Keyframe[]) : [],
        font: it.font
      })
    }

    let autoCount = 0
    if (bool(s.autoGap)) {
      const texts = str(s.gapTexts).split(/\r?\n/).map((t) => t.trim()).filter(Boolean)
      if (!tl.transcript) warnings.push('Testi automatici: serve la trascrizione a monte per trovare le pause.')
      else if (!texts.length) warnings.push('Testi automatici: nessun testo inserito.')
      else {
        const layout = computeLayout(tl.segments, tl.source.fps, tl.transitions)
        const wordsOut = tl.transcript.words.map((w) => mapRangeToOutput(layout, w)).filter((r): r is NonNullable<typeof r> => !!r)
        const gaps = speechGaps(wordsOut, layout.mainDuration, num(s.minGap, 1.2))
        const maxD = num(s.gapMaxDuration, 3)
        gaps.slice(0, texts.length).forEach((g, i) => {
          const startSrc = outputToSource(layout, g.start + 0.1)
          if (startSrc === null) return
          items.push({
            id: `gap${i}`, kind: 'text', text: texts[i], start: startSrc,
            duration: Math.max(0.5, Math.min(maxD, g.end - g.start - 0.2)),
            preset: (PRESETS.includes(s.gapPreset as TextPreset) ? s.gapPreset : 'box') as TextPreset,
            x: 50, y: 50, size: 0, color: '', animationIn: 'pop', animationOut: 'fade', animDuration: 0.3, keyframes: []
          })
          autoCount++
        })
        if (gaps.length < texts.length) warnings.push(`Trovate solo ${gaps.length} pause per ${texts.length} testi.`)
      }
    }
    // Colore vuoto = colore del preset.
    const fixed = items.map((o) => (o.color ? o : { ...o, color: '' }))
    return {
      output: { ...tl, overlays: [...tl.overlays, ...fixed] },
      result: {
        summary: `${fixed.length} elementi${autoCount ? ` (${autoCount} automatici)` : ''}`,
        items: [
          { label: 'Testi', value: String(fixed.filter((o) => o.kind === 'text').length) },
          { label: 'Immagini', value: String(fixed.filter((o) => o.kind === 'image').length) },
          { label: 'Automatici nelle pause', value: String(autoCount) }
        ],
        files: [],
        warnings,
        data: { overlays: fixed }
      }
    }
  }
}

export const endscreenNode: NodeImpl = {
  async run(ctx, input, s) {
    const tl = requireInput(input)
    const warnings: string[] = []
    const bg = mediaPath(ctx.media, s.bgMediaId)
    const logo = mediaPath(ctx.media, s.logoMediaId)
    if (s.bgMediaId && !bg) warnings.push('Immagine di sfondo non trovata nel progetto.')
    if (s.logoMediaId && !logo) warnings.push('Logo non trovato nel progetto.')
    const endscreen = {
      duration: Math.max(0.5, num(s.duration, 5)),
      bgColor: str(s.bgColor, '#111111'),
      bgImagePath: bg,
      title: str(s.title),
      subtitle: str(s.subtitle),
      cta: str(s.cta),
      accentColor: str(s.accentColor, '#FF8A1F'),
      logoPath: logo,
      logoSize: num(s.logoSize, 18),
      fade: Math.max(0, num(s.fade, 0.6)),
      font: str(s.font, 'Montserrat')
    }
    return {
      output: { ...tl, endscreen },
      result: {
        summary: `${endscreen.duration}s · "${endscreen.title || endscreen.cta}"`,
        items: [
          { label: 'Durata', value: `${endscreen.duration}s` },
          { label: 'Titolo', value: endscreen.title || '-' },
          { label: 'Invito all\'azione', value: endscreen.cta || '-' },
          { label: 'Logo', value: logo ? path.basename(logo) : '-' },
          { label: 'Sfondo', value: bg ? path.basename(bg) : endscreen.bgColor }
        ],
        files: [],
        warnings
      }
    }
  }
}
