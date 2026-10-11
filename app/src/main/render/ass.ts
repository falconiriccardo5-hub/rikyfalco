// Generazione del file ASS (Advanced SubStation Alpha) con sottotitoli,
// testi in sovraimpressione e testi della schermata finale. Il file viene
// poi inciso nel video con il filtro `ass` di FFmpeg (libass).

import type { Keyframe, Overlay, SubtitleStyle, TextPreset } from '../../shared/types'

export interface AssCanvas {
  w: number
  h: number
}

/** Colore #RRGGBB + opacità (0-100) → &HAABBGGRR. */
export function assColor(hex: string, opacity = 100): string {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim())
  const rgb = m ? m[1] : 'FFFFFF'
  const r = rgb.slice(0, 2)
  const g = rgb.slice(2, 4)
  const b = rgb.slice(4, 6)
  const a = Math.round(255 * (1 - Math.min(100, Math.max(0, opacity)) / 100))
    .toString(16)
    .padStart(2, '0')
  return `&H${a}${b}${g}${r}`.toUpperCase()
}

/** Colore per i tag di override (\1c) senza alfa. */
function tagColor(hex: string): string {
  return assColor(hex).replace(/^&H../, '&H') + '&'
}

function alphaTag(opacity: number): string {
  const a = Math.round(255 * (1 - Math.min(100, Math.max(0, opacity)) / 100))
  return `&H${a.toString(16).padStart(2, '0').toUpperCase()}&`
}

export function assTime(t: number): string {
  if (t < 0) t = 0
  const cs = Math.round(t * 100)
  const h = Math.floor(cs / 360000)
  const m = Math.floor((cs % 360000) / 6000)
  const s = Math.floor((cs % 6000) / 100)
  const c = cs % 100
  return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}.${String(c).padStart(2, '0')}`
}

export function escapeAssText(t: string): string {
  return t.replace(/\\/g, '⧵').replace(/\{/g, '(').replace(/\}/g, ')').replace(/\r?\n/g, '\\N')
}

interface StyleDef {
  name: string
  font: string
  size: number
  primary: string
  secondary: string
  outlineColor: string
  back: string
  bold: boolean
  borderStyle: 1 | 3
  outline: number
  shadow: number
  alignment: number
  marginL: number
  marginR: number
  marginV: number
  spacing?: number
}

function styleLine(s: StyleDef): string {
  return [
    `Style: ${s.name}`,
    s.font,
    Math.round(s.size),
    s.primary,
    s.secondary,
    s.outlineColor,
    s.back,
    s.bold ? -1 : 0,
    0, 0, 0, 100, 100,
    s.spacing ?? 0,
    0,
    s.borderStyle,
    s.outline.toFixed(1),
    s.shadow.toFixed(1),
    s.alignment,
    Math.round(s.marginL),
    Math.round(s.marginR),
    Math.round(s.marginV),
    1
  ].join(',')
}

export interface AssEvent {
  start: number
  end: number
  style: string
  text: string
  layer?: number
}

export class AssBuilder {
  private styles: StyleDef[] = []
  private events: AssEvent[] = []
  constructor(readonly canvas: AssCanvas) {}

  get scale(): number {
    return this.canvas.h / 1080
  }

  /** Dimensione di riferimento basata sul lato corto (per i formati verticali). */
  get refScale(): number {
    return Math.min(this.canvas.w, this.canvas.h) / 1080
  }

  addStyle(s: StyleDef): void {
    if (!this.styles.some((x) => x.name === s.name)) this.styles.push(s)
  }

  add(e: AssEvent): void {
    if (e.end - e.start < 0.01) return
    this.events.push(e)
  }

  get count(): number {
    return this.events.length
  }

  toString(): string {
    const head = [
      '[Script Info]',
      'ScriptType: v4.00+',
      `PlayResX: ${this.canvas.w}`,
      `PlayResY: ${this.canvas.h}`,
      'WrapStyle: 0',
      'ScaledBorderAndShadow: yes',
      'YCbCr Matrix: TV.709',
      '',
      '[V4+ Styles]',
      'Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding',
      ...(this.styles.length ? this.styles : [defaultStyle(this.canvas)]).map(styleLine),
      '',
      '[Events]',
      'Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text'
    ]
    const ev = [...this.events]
      .sort((a, b) => a.start - b.start)
      .map((e) => `Dialogue: ${e.layer ?? 0},${assTime(e.start)},${assTime(e.end)},${e.style},,0,0,0,,${e.text}`)
    return head.concat(ev).join('\n') + '\n'
  }
}

function defaultStyle(c: AssCanvas): StyleDef {
  return {
    name: 'Default', font: 'Arial', size: 48 * (c.h / 1080), primary: '&H00FFFFFF', secondary: '&H00FFFFFF',
    outlineColor: '&H00000000', back: '&H00000000', bold: false, borderStyle: 1, outline: 2, shadow: 0,
    alignment: 2, marginL: 20, marginR: 20, marginV: 40
  }
}

// ---------------------------------------------------------------- sottotitoli

export interface MappedWord {
  start: number
  end: number
  text: string
}

export interface MappedCue {
  start: number
  end: number
  text: string
  words?: MappedWord[]
}

function isKeyword(word: string, keywords: string[]): boolean {
  const w = word.toLowerCase().replace(/[^\p{L}\p{N}'-]/gu, '')
  return !!w && keywords.some((k) => k && w === k.toLowerCase().trim())
}

/** Suddivide le parole in righe di massimo `maxChars` caratteri (al massimo 2 righe bilanciate). */
export function lineBreaks(words: string[], maxChars: number): Set<number> {
  const total = words.join(' ').length
  const breaks = new Set<number>()
  if (total <= maxChars || words.length < 2) return breaks
  // Una sola interruzione nel punto più bilanciato.
  let best = 1
  let bestDiff = Infinity
  let acc = 0
  for (let i = 0; i < words.length - 1; i++) {
    acc += words[i].length + (i ? 1 : 0)
    const diff = Math.abs(total - acc * 2)
    if (diff < bestDiff) {
      bestDiff = diff
      best = i + 1
    }
  }
  breaks.add(best)
  return breaks
}

export function addSubtitles(
  b: AssBuilder,
  cues: MappedCue[],
  st: SubtitleStyle,
  maxChars: number
): void {
  const sc = b.refScale
  const align = st.position === 'top' ? 8 : st.position === 'center' ? 5 : 2
  const base: StyleDef = {
    name: 'Sub',
    font: st.font,
    size: st.fontSize * sc,
    primary: assColor(st.color),
    secondary: assColor(st.color),
    outlineColor: st.boxed ? assColor(st.boxColor, st.boxOpacity) : assColor(st.outlineColor),
    back: assColor('#000000', 50),
    bold: st.bold,
    borderStyle: st.boxed ? 3 : 1,
    outline: (st.boxed ? Math.max(6, st.outline * 2) : st.outline) * sc,
    shadow: st.shadow * sc,
    alignment: align,
    marginL: 60 * sc,
    marginR: 60 * sc,
    marginV: (st.marginV / 100) * (b.scale * 1080)
  }
  b.addStyle(base)
  if (st.animation === 'karaoke') {
    b.addStyle({ ...base, name: 'SubK', primary: assColor(st.highlightColor), secondary: assColor(st.color) })
  }
  const hl = tagColor(st.highlightColor)
  const kw = st.keywords
  const fmt = (t: string): string => escapeAssText(st.uppercase ? t.toUpperCase() : t)

  for (const cue of cues) {
    const words = cue.words?.length ? cue.words : null
    const tokens = words ? words.map((w) => w.text) : cue.text.split(/\s+/).filter(Boolean)
    const breaks = lineBreaks(tokens, maxChars)
    const render = (active: number | null): string =>
      tokens
        .map((t, i) => {
          const sep = i === 0 ? '' : breaks.has(i) ? '\\N' : ' '
          let txt = fmt(t)
          if (i === active) txt = `{\\1c${hl}\\fscx108\\fscy108}${txt}{\\r}`
          else if (isKeyword(t, kw)) txt = `{\\1c${hl}}${txt}{\\r}`
          return sep + txt
        })
        .join('')

    switch (st.animation) {
      case 'highlight': {
        if (!words) {
          b.add({ start: cue.start, end: cue.end, style: 'Sub', text: render(null) })
          break
        }
        // Prima della prima parola e tra le parole: nessuna evidenziata.
        for (let i = 0; i < words.length; i++) {
          const s = i === 0 ? cue.start : words[i].start
          const e = i < words.length - 1 ? words[i + 1].start : cue.end
          b.add({ start: s, end: e, style: 'Sub', text: render(i) })
        }
        break
      }
      case 'karaoke': {
        let t = cue.start
        const parts = tokens.map((tok, i) => {
          const sep = i === 0 ? '' : breaks.has(i) ? '\\N' : ' '
          const wEnd = words ? (i < words.length - 1 ? words[i + 1].start : cue.end) : t + (cue.end - cue.start) / tokens.length
          const cs = Math.max(1, Math.round((wEnd - t) * 100))
          t = wEnd
          return `${sep}{\\kf${cs}}${fmt(tok)}`
        })
        b.add({ start: cue.start, end: cue.end, style: 'SubK', text: parts.join('') })
        break
      }
      case 'word': {
        const list = words ?? tokens.map((tok, i) => {
          const d = (cue.end - cue.start) / tokens.length
          return { start: cue.start + i * d, end: cue.start + (i + 1) * d, text: tok }
        })
        list.forEach((w, i) => {
          const e = i < list.length - 1 ? list[i + 1].start : cue.end
          const color = isKeyword(w.text, kw) ? `\\1c${hl}` : ''
          b.add({
            start: w.start,
            end: Math.max(e, w.start + 0.08),
            style: 'Sub',
            text: `{\\fscx80\\fscy80\\t(0,90,\\fscx100\\fscy100)${color}}${fmt(w.text)}`
          })
        })
        break
      }
      case 'fade':
        b.add({ start: cue.start, end: cue.end, style: 'Sub', text: `{\\fad(120,120)}${render(null)}` })
        break
      case 'pop':
        b.add({
          start: cue.start,
          end: cue.end,
          style: 'Sub',
          text: `{\\fscx85\\fscy85\\t(0,110,\\fscx106\\fscy106)\\t(110,190,\\fscx100\\fscy100)}${render(null)}`
        })
        break
      default:
        b.add({ start: cue.start, end: cue.end, style: 'Sub', text: render(null) })
    }
  }
}

// ---------------------------------------------------------------- testi in sovraimpressione

interface PresetLook {
  font: string
  size: number
  color: string
  bold: boolean
  borderStyle: 1 | 3
  outline: number
  outlineColor: string
  outlineOpacity: number
  shadow: number
  uppercase: boolean
  spacing: number
}

export function presetLook(p: TextPreset, accent = '#FF8A1F'): PresetLook {
  switch (p) {
    case 'bold':
      return { font: 'Montserrat', size: 84, color: '#FFFFFF', bold: true, borderStyle: 1, outline: 5, outlineColor: '#000000', outlineOpacity: 100, shadow: 2, uppercase: true, spacing: 1 }
    case 'box':
      return { font: 'Inter', size: 56, color: '#FFFFFF', bold: true, borderStyle: 3, outline: 16, outlineColor: '#111111', outlineOpacity: 85, shadow: 0, uppercase: false, spacing: 0 }
    case 'accent':
      return { font: 'Montserrat', size: 72, color: accent, bold: true, borderStyle: 1, outline: 4, outlineColor: '#000000', outlineOpacity: 100, shadow: 0, uppercase: true, spacing: 1 }
    case 'lowerthird':
      return { font: 'Inter', size: 46, color: '#FFFFFF', bold: true, borderStyle: 3, outline: 14, outlineColor: accent, outlineOpacity: 100, shadow: 0, uppercase: false, spacing: 0 }
    default:
      return { font: 'Inter', size: 64, color: '#FFFFFF', bold: false, borderStyle: 1, outline: 0, outlineColor: '#000000', outlineOpacity: 100, shadow: 3, uppercase: false, spacing: 0 }
  }
}

export interface MappedOverlay extends Overlay {
  outStart: number
  outEnd: number
}

function kfAt(kfs: Keyframe[], t: number): Keyframe {
  if (t <= kfs[0].t) return kfs[0]
  for (let i = 0; i < kfs.length - 1; i++) {
    const a = kfs[i]
    const c = kfs[i + 1]
    if (t <= c.t) {
      const f = (t - a.t) / Math.max(1e-6, c.t - a.t)
      return {
        t,
        x: a.x + (c.x - a.x) * f,
        y: a.y + (c.y - a.y) * f,
        scale: a.scale + (c.scale - a.scale) * f,
        opacity: a.opacity + (c.opacity - a.opacity) * f
      }
    }
  }
  return kfs[kfs.length - 1]
}

export function addTextOverlay(b: AssBuilder, o: MappedOverlay, accent?: string): void {
  const look = presetLook(o.preset, accent)
  const W = b.canvas.w
  const H = b.canvas.h
  const sc = b.refScale
  const styleName = `T_${o.preset}`
  const lower = o.preset === 'lowerthird'
  b.addStyle({
    name: styleName,
    font: look.font,
    size: look.size * sc,
    primary: assColor(look.color),
    secondary: assColor(look.color),
    outlineColor: assColor(look.outlineColor, look.outlineOpacity),
    back: assColor('#000000', 60),
    bold: look.bold,
    borderStyle: look.borderStyle,
    outline: look.outline * sc,
    shadow: look.shadow * sc,
    alignment: lower ? 1 : 5,
    marginL: 0,
    marginR: 0,
    marginV: 0,
    spacing: look.spacing
  })
  const sizeRatio = o.size > 0 ? o.size / look.size : 1
  const baseScale = Math.round(sizeRatio * 100)
  const text = escapeAssText(look.uppercase ? o.text.toUpperCase() : o.text)
  const colorTag = o.color && o.color.toUpperCase() !== look.color.toUpperCase() ? `\\1c${tagColor(o.color)}` : ''
  const fontTag = o.font ? `\\fn${o.font}` : ''
  const px = (v: number): number => Math.round((v / 100) * W)
  const py = (v: number): number => Math.round((v / 100) * H)
  const common = `${colorTag}${fontTag}`
  const start = o.outStart
  const end = o.outEnd
  const dur = end - start

  // Keyframe: animazione lineare di posizione, scala e opacità tra i punti.
  if (o.keyframes?.length) {
    const kfs = [...o.keyframes].sort((a, c) => a.t - c.t).filter((k) => k.t <= dur + 1e-3)
    if (!kfs.length) kfs.push(o.keyframes[0])
    const times = [0, ...kfs.map((k) => Math.max(0, Math.min(dur, k.t))), dur]
    const uniq = [...new Set(times.map((t) => Math.round(t * 1000) / 1000))].sort((a, c) => a - c)
    for (let i = 0; i < uniq.length - 1; i++) {
      const a = kfAt(kfs, uniq[i])
      const c = kfAt(kfs, uniq[i + 1])
      const ms = Math.round((uniq[i + 1] - uniq[i]) * 1000)
      const sa = Math.round((a.scale / 100) * baseScale)
      const sb = Math.round((c.scale / 100) * baseScale)
      b.add({
        start: start + uniq[i],
        end: start + uniq[i + 1],
        style: styleName,
        layer: 2,
        text:
          `{\\move(${px(a.x)},${py(a.y)},${px(c.x)},${py(c.y)},0,${ms})` +
          `\\fscx${sa}\\fscy${sa}\\alpha${alphaTag(a.opacity)}` +
          `\\t(0,${ms},\\fscx${sb}\\fscy${sb}\\alpha${alphaTag(c.opacity)})${common}}${text}`
      })
    }
    return
  }

  const x = px(o.x)
  const y = py(o.y)
  const ad = Math.max(0, Math.min(o.animDuration, dur / 2))
  const ams = Math.round(ad * 1000)
  const sTag = `\\fscx${baseScale}\\fscy${baseScale}`
  const inA = ad > 0 ? o.animationIn : 'none'
  const outA = ad > 0 ? o.animationOut : 'none'
  const pos = `\\pos(${x},${y})`

  // Parte di entrata
  let tIn = start
  if (inA !== 'none') {
    const e = start + ad
    if (inA === 'typewriter') {
      const chars = [...text.replace(/\\N/g, '\n')]
      const steps = Math.min(chars.length, 40)
      for (let k = 1; k <= steps; k++) {
        const n = Math.round((k / steps) * chars.length)
        const shown = chars.slice(0, n).join('').replace(/\n/g, '\\N')
        const hidden = chars.slice(n).join('').replace(/\n/g, '\\N')
        b.add({
          start: start + ((k - 1) / steps) * ad,
          end: start + (k / steps) * ad,
          style: styleName,
          layer: 2,
          text: `{${pos}${sTag}${common}}${shown}{\\alpha&HFF&}${hidden}`
        })
      }
    } else {
      let tags = ''
      if (inA === 'fade') tags = `${pos}${sTag}\\fad(${ams},0)`
      else if (inA === 'slide-up') tags = `\\move(${x},${y + Math.round(H * 0.05)},${x},${y},0,${ams})${sTag}\\fad(${Math.round(ams * 0.7)},0)`
      else if (inA === 'slide-left') tags = `\\move(${x + Math.round(W * 0.08)},${y},${x},${y},0,${ams})${sTag}\\fad(${Math.round(ams * 0.7)},0)`
      else if (inA === 'pop') {
        const s0 = Math.round(baseScale * 0.6)
        const s1 = Math.round(baseScale * 1.08)
        tags = `${pos}\\fscx${s0}\\fscy${s0}\\alpha&HFF&\\t(0,${Math.round(ams * 0.7)},\\fscx${s1}\\fscy${s1}\\alpha&H00&)\\t(${Math.round(ams * 0.7)},${ams},${sTag})`
      }
      b.add({ start, end: e, style: styleName, layer: 2, text: `{${tags}${common}}${text}` })
    }
    tIn = start + ad
  }
  // Parte centrale
  const tOut = outA !== 'none' ? end - ad : end
  if (tOut > tIn) b.add({ start: tIn, end: tOut, style: styleName, layer: 2, text: `{${pos}${sTag}${common}}${text}` })
  // Parte di uscita
  if (outA !== 'none') {
    let tags = ''
    if (outA === 'fade' || outA === 'typewriter') tags = `${pos}${sTag}\\fad(0,${ams})`
    else if (outA === 'slide-up') tags = `\\move(${x},${y},${x},${y - Math.round(H * 0.05)},0,${ams})${sTag}\\fad(0,${Math.round(ams * 0.7)})`
    else if (outA === 'slide-left') tags = `\\move(${x},${y},${x - Math.round(W * 0.08)},${y},0,${ams})${sTag}\\fad(0,${Math.round(ams * 0.7)})`
    else if (outA === 'pop') {
      const s0 = Math.round(baseScale * 0.6)
      tags = `${pos}${sTag}\\t(0,${ams},\\fscx${s0}\\fscy${s0}\\alpha&HFF&)`
    }
    b.add({ start: tOut, end, style: styleName, layer: 2, text: `{${tags}${common}}${text}` })
  }
}

// ---------------------------------------------------------------- schermata finale

export function addEndscreenText(
  b: AssBuilder,
  e: { title: string; subtitle: string; cta: string; accentColor: string; font: string },
  start: number,
  end: number,
  hasLogo: boolean
): void {
  const sc = b.refScale
  const W = b.canvas.w
  const H = b.canvas.h
  b.addStyle({
    name: 'EndTitle', font: e.font, size: 86 * sc, primary: assColor('#FFFFFF'), secondary: assColor('#FFFFFF'),
    outlineColor: assColor('#000000', 0), back: assColor('#000000', 0), bold: true, borderStyle: 1, outline: 0,
    shadow: 0, alignment: 5, marginL: 0, marginR: 0, marginV: 0
  })
  b.addStyle({
    name: 'EndSub', font: e.font, size: 44 * sc, primary: assColor('#D0D0D0'), secondary: assColor('#D0D0D0'),
    outlineColor: assColor('#000000', 0), back: assColor('#000000', 0), bold: false, borderStyle: 1, outline: 0,
    shadow: 0, alignment: 5, marginL: 0, marginR: 0, marginV: 0
  })
  b.addStyle({
    name: 'EndCta', font: e.font, size: 48 * sc, primary: assColor('#FFFFFF'), secondary: assColor('#FFFFFF'),
    outlineColor: assColor(e.accentColor), back: assColor('#000000', 0), bold: true, borderStyle: 3, outline: 22 * sc,
    shadow: 0, alignment: 5, marginL: 0, marginR: 0, marginV: 0
  })
  const cx = Math.round(W / 2)
  const off = hasLogo ? 0.06 : 0
  const y = (f: number): number => Math.round(H * (f + off))
  const pop = (delay: number): string =>
    `\\fscx80\\fscy80\\alpha&HFF&\\t(${delay},${delay + 260},\\fscx100\\fscy100\\alpha&H00&)`
  if (e.title) b.add({ start, end, style: 'EndTitle', layer: 3, text: `{\\pos(${cx},${y(0.42)})${pop(150)}}${escapeAssText(e.title)}` })
  if (e.subtitle) b.add({ start, end, style: 'EndSub', layer: 3, text: `{\\pos(${cx},${y(0.52)})${pop(300)}}${escapeAssText(e.subtitle)}` })
  if (e.cta) b.add({ start, end, style: 'EndCta', layer: 3, text: `{\\pos(${cx},${y(0.66)})${pop(450)}}${escapeAssText(e.cta)}` })
}

// ---------------------------------------------------------------- SRT

function srtTime(t: number): string {
  const ms = Math.max(0, Math.round(t * 1000))
  const h = Math.floor(ms / 3600000)
  const m = Math.floor((ms % 3600000) / 60000)
  const s = Math.floor((ms % 60000) / 1000)
  const r = ms % 1000
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')},${String(r).padStart(3, '0')}`
}

export function buildSrt(cues: { start: number; end: number; text: string }[]): string {
  return (
    cues
      .map((c, i) => `${i + 1}\n${srtTime(c.start)} --> ${srtTime(c.end)}\n${c.text.trim()}\n`)
      .join('\n') + (cues.length ? '' : '')
  )
}
