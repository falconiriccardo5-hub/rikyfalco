// Funzioni pure per la manipolazione della timeline: segmenti, mappatura dei
// tempi sorgente -> finale, calcolo dei tagli e raggruppamento sottotitoli.
// Nessuna dipendenza da Node o dal DOM: usate sia dal motore sia dall'interfaccia.

import type { Cue, EndScreen, Range, TransitionSpec, Word } from './types'

export const EPS = 1e-6

export function clamp(v: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, v))
}

export function quantize(t: number, fps: number): number {
  return Math.round(t * fps) / fps
}

/** Ordina e unisce intervalli sovrapposti o adiacenti. */
export function mergeRanges(ranges: Range[], gap = 0): Range[] {
  const sorted = ranges
    .filter((r) => r.end - r.start > EPS)
    .map((r) => ({ start: r.start, end: r.end }))
    .sort((a, b) => a.start - b.start)
  const out: Range[] = []
  for (const r of sorted) {
    const last = out[out.length - 1]
    if (last && r.start <= last.end + gap) last.end = Math.max(last.end, r.end)
    else out.push(r)
  }
  return out
}

/** Sottrae `remove` dagli intervalli `base`. */
export function subtractRanges(base: Range[], remove: Range[]): Range[] {
  const rem = mergeRanges(remove)
  const out: Range[] = []
  for (const b of mergeRanges(base)) {
    let cur = b.start
    for (const r of rem) {
      if (r.end <= cur || r.start >= b.end) continue
      if (r.start > cur) out.push({ start: cur, end: r.start })
      cur = Math.max(cur, r.end)
      if (cur >= b.end) break
    }
    if (cur < b.end - EPS) out.push({ start: cur, end: b.end })
  }
  return out
}

export function complementRanges(ranges: Range[], total: Range): Range[] {
  return subtractRanges([total], ranges)
}

export function totalLength(ranges: Range[]): number {
  return ranges.reduce((s, r) => s + (r.end - r.start), 0)
}

// ---------------------------------------------------------------- layout

export interface LayoutSegment extends Range {
  outStart: number
  outEnd: number
  clip: number
}

export interface LayoutClip {
  index: number
  segments: number[]
  outStart: number
  outEnd: number
  duration: number
}

export interface LayoutTransition {
  /** Indice della clip che precede la transizione. */
  afterClip: number
  duration: number
  /** Istante (tempo finale) in cui inizia la transizione. */
  offset: number
}

export interface Layout {
  fps: number
  segments: LayoutSegment[]
  clips: LayoutClip[]
  transitions: LayoutTransition[]
  mainDuration: number
  endscreen?: { start: number; duration: number; fade: number }
  totalDuration: number
}

/**
 * Calcola la posizione di ogni segmento nel video finale, considerando
 * transizioni (che sovrappongono le clip) e schermata finale.
 * I segmenti vengono quantizzati ai fotogrammi per mantenere audio e video allineati.
 */
export function computeLayout(
  segmentsIn: Range[],
  fps: number,
  transitions?: TransitionSpec,
  endscreen?: Pick<EndScreen, 'duration' | 'fade'>
): Layout {
  const frame = 1 / fps
  const segs: Range[] = []
  for (const s of mergeRanges(segmentsIn)) {
    const start = quantize(s.start, fps)
    let end = quantize(s.end, fps)
    if (end - start < frame - EPS) end = start + frame
    const prev = segs[segs.length - 1]
    if (prev && start < prev.end + EPS) prev.end = Math.max(prev.end, end)
    else segs.push({ start, end })
  }

  // Confini fra clip: dove è richiesta una transizione.
  const tDur = transitions ? Math.max(0, quantize(transitions.duration, fps)) : 0
  const wanted = new Set<number>()
  if (transitions && tDur > 0) {
    for (const p of transitions.cutPoints) {
      for (let i = 0; i < segs.length - 1; i++) {
        if (Math.abs(segs[i].end - p) <= frame * 1.5) wanted.add(i)
      }
    }
  }

  // Forma le clip e scarta transizioni troppo lunghe rispetto alle clip adiacenti.
  let groups: number[][] = []
  let cur: number[] = []
  segs.forEach((_, i) => {
    cur.push(i)
    if (wanted.has(i)) {
      groups.push(cur)
      cur = []
    }
  })
  if (cur.length) groups.push(cur)
  const groupDur = (g: number[]): number => g.reduce((s, i) => s + (segs[i].end - segs[i].start), 0)
  let changed = true
  while (changed && groups.length > 1) {
    changed = false
    for (let k = 0; k < groups.length - 1; k++) {
      if (tDur > Math.min(groupDur(groups[k]), groupDur(groups[k + 1])) * 0.5) {
        groups[k] = groups[k].concat(groups[k + 1])
        groups.splice(k + 1, 1)
        changed = true
        break
      }
    }
  }
  if (!segs.length) groups = []

  const layoutSegs: LayoutSegment[] = []
  const clips: LayoutClip[] = []
  const trans: LayoutTransition[] = []
  let clipStart = 0
  groups.forEach((g, k) => {
    if (k > 0) {
      clipStart = clips[k - 1].outEnd - tDur
      trans.push({ afterClip: k - 1, duration: tDur, offset: clipStart })
    }
    let t = clipStart
    for (const i of g) {
      const d = segs[i].end - segs[i].start
      layoutSegs.push({ ...segs[i], outStart: t, outEnd: t + d, clip: k })
      t += d
    }
    clips.push({ index: k, segments: g, outStart: clipStart, outEnd: t, duration: t - clipStart })
  })
  const mainDuration = clips.length ? clips[clips.length - 1].outEnd : 0
  let total = mainDuration
  let end: Layout['endscreen']
  if (endscreen && endscreen.duration > 0) {
    const dur = quantize(endscreen.duration, fps)
    const fade = Math.min(quantize(Math.max(0, endscreen.fade), fps), dur * 0.5, mainDuration * 0.5)
    end = { start: mainDuration - fade, duration: dur, fade }
    total = mainDuration - fade + dur
  }
  return { fps, segments: layoutSegs, clips, transitions: trans, mainDuration, endscreen: end, totalDuration: total }
}

/** Tempo sorgente -> tempo finale (null se l'istante è stato tagliato). */
export function sourceToOutput(layout: Layout, t: number): number | null {
  const segs = layout.segments
  let lo = 0
  let hi = segs.length - 1
  while (lo <= hi) {
    const mid = (lo + hi) >> 1
    const s = segs[mid]
    if (t < s.start - EPS) hi = mid - 1
    else if (t >= s.end - EPS) lo = mid + 1
    else return s.outStart + (t - s.start)
  }
  return null
}

/** Tempo finale -> tempo sorgente (null nella schermata finale o fuori durata). */
export function outputToSource(layout: Layout, t: number): number | null {
  for (const s of layout.segments) {
    if (t >= s.outStart - EPS && t < s.outEnd - EPS) return s.start + (t - s.outStart)
  }
  const last = layout.segments[layout.segments.length - 1]
  if (last && Math.abs(t - last.outEnd) < 1e-3) return last.end
  return null
}

/** Mappa un intervallo sorgente nell'intervallo finale che lo contiene. */
export function mapRangeToOutput(layout: Layout, r: Range): Range | null {
  let first: number | null = null
  let last: number | null = null
  for (const s of layout.segments) {
    const a = Math.max(s.start, r.start)
    const b = Math.min(s.end, r.end)
    if (b - a > EPS) {
      const oa = s.outStart + (a - s.start)
      const ob = s.outStart + (b - s.start)
      if (first === null) first = oa
      last = ob
    }
  }
  if (first === null || last === null) return null
  return { start: first, end: last }
}

/** Mappa l'istante di inizio di un elemento: se cade in un taglio usa il primo istante successivo mantenuto. */
export function mapStartToOutput(layout: Layout, t: number): number | null {
  const direct = sourceToOutput(layout, t)
  if (direct !== null) return direct
  for (const s of layout.segments) if (s.start >= t) return s.outStart
  return null
}

// ---------------------------------------------------------------- tagli

export interface Cut extends Range {
  key: string
  enabled: boolean
  reason: 'silence' | 'manual'
}

export interface CutOptions {
  duration: number
  silences: Range[]
  minSilence: number
  padding: number
  minKeep: number
  protectedRanges: Range[]
  manualCuts: Range[]
  disabledKeys: string[]
  words?: Word[]
}

export function cutKey(r: Range): string {
  return r.start.toFixed(2)
}

/** Calcola i tagli proposti e i segmenti risultanti. */
export function computeCuts(o: CutOptions): { cuts: Cut[]; segments: Range[] } {
  const total: Range = { start: 0, end: o.duration }
  let candidates: Range[] = []
  for (const s of o.silences) {
    const len = s.end - s.start
    if (len < o.minSilence) continue
    const a = s.start <= 0.05 ? 0 : s.start + o.padding
    const b = s.end >= o.duration - 0.05 ? o.duration : s.end - o.padding
    if (b - a > 0.05) candidates.push({ start: a, end: b })
  }
  // Non tagliare mai dentro una parola riconosciuta (con un piccolo margine).
  if (o.words?.length) {
    const guard = Math.min(o.padding, 0.08)
    candidates = subtractRanges(
      candidates,
      o.words.map((w) => ({ start: w.start - guard, end: w.end + guard }))
    ).filter((r) => r.end - r.start >= Math.min(o.minSilence, 0.25))
  }
  candidates = subtractRanges(candidates, o.protectedRanges)

  const disabled = new Set(o.disabledKeys)
  const cuts: Cut[] = []
  for (const c of candidates) {
    const key = cutKey(c)
    cuts.push({ ...c, key, enabled: !disabled.has(key), reason: 'silence' })
  }
  for (const m of o.manualCuts) {
    const r = { start: clamp(m.start, 0, o.duration), end: clamp(m.end, 0, o.duration) }
    if (r.end - r.start <= EPS) continue
    const key = 'm' + cutKey(r)
    cuts.push({ ...r, key, enabled: !disabled.has(key), reason: 'manual' })
  }
  cuts.sort((a, b) => a.start - b.start)

  let segments = complementRanges(
    cuts.filter((c) => c.enabled),
    total
  )
  // Elimina i frammenti mantenuti troppo corti (salvo che contengano parlato o siano protetti).
  if (o.minKeep > 0) {
    const keepAlways = mergeRanges([...(o.words ?? []), ...o.protectedRanges])
    segments = segments.filter((s) => {
      if (s.end - s.start >= o.minKeep) return true
      return keepAlways.some((w) => w.start < s.end && w.end > s.start)
    })
  }
  if (!segments.length && o.duration > 0) segments = [total]
  return { cuts, segments }
}

// ---------------------------------------------------------------- sottotitoli

export interface CueOptions {
  maxChars: number
  maxWords: number
  maxDuration: number
  gapBreak: number
}

/** Raggruppa le parole in sottotitoli leggibili. */
export function groupWordsIntoCues(words: Word[], o: CueOptions): Cue[] {
  const cues: Cue[] = []
  let cur: Word[] = []
  const flush = (): void => {
    if (!cur.length) return
    const text = cur.map((w) => w.text.trim()).join(' ').replace(/\s+([,.!?;:])/g, '$1')
    cues.push({ id: `c${cues.length + 1}`, start: cur[0].start, end: cur[cur.length - 1].end, text, words: cur })
    cur = []
  }
  for (const w of words) {
    const t = w.text.trim()
    if (!t) continue
    if (cur.length) {
      const prev = cur[cur.length - 1]
      const chars = cur.reduce((s, x) => s + x.text.trim().length + 1, 0) + t.length
      if (
        w.start - prev.end > o.gapBreak ||
        chars > o.maxChars ||
        cur.length >= o.maxWords ||
        w.end - cur[0].start > o.maxDuration
      ) {
        flush()
      }
    }
    cur.push({ start: w.start, end: w.end, text: t })
    if (/[.!?…]$/.test(t)) flush()
  }
  flush()
  return cues
}

// ---------------------------------------------------------------- parole chiave

const STOP = new Set(
  (
    'il lo la i gli le un uno una di a da in con su per tra fra e ed o ma se che chi cui non più ' +
    'come anche quando dove perché quindi però poi già solo molto tutto tutti questa questo quello quella ' +
    'sono sei è siamo siete hanno ho hai ha abbiamo avete era erano essere avere fare fa fatto ' +
    'del dello della dei degli delle al allo alla ai agli alle dal dalla dai dalle nel nello nella nei nelle ' +
    'sul sulla sui sulle col coi mi ti si ci vi ne lo li gli me te noi voi lui lei loro mio tuo suo nostro ' +
    'cosa così allora ecco tipo cioè bene ok okay sì no qui qua lì là adesso ora oggi c\'è ' +
    'the a an and or but if then of to in on at by for with from as is are was were be been being ' +
    'it its this that these those i you he she we they me him her us them my your our their ' +
    'do does did have has had not no yes so just very can will would should could about into ' +
    'what which who when where why how all any some more most other also there here than too'
  ).split(/\s+/)
)

/** Parole più frequenti e significative del parlato (analisi locale, senza AI). */
export function extractKeywords(words: Word[], max = 10): string[] {
  const counts = new Map<string, number>()
  for (const w of words) {
    const t = w.text.toLowerCase().replace(/[^\p{L}\p{N}'-]/gu, '')
    if (t.length < 4 || STOP.has(t)) continue
    counts.set(t, (counts.get(t) ?? 0) + 1)
  }
  return [...counts.entries()]
    .filter(([, c]) => c >= 2)
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, max)
    .map(([w]) => w)
}

/** Pause nel parlato (tempo finale) più lunghe di `minGap`. */
export function speechGaps(wordsOut: Range[], duration: number, minGap: number): Range[] {
  const speech = mergeRanges(wordsOut, 0.05)
  return complementRanges(speech, { start: 0, end: duration }).filter((g) => g.end - g.start >= minGap)
}

// ---------------------------------------------------------------- hash

export function stableStringify(v: unknown): string {
  if (v === null || typeof v !== 'object') return JSON.stringify(v) ?? 'null'
  if (Array.isArray(v)) return '[' + v.map(stableStringify).join(',') + ']'
  const o = v as Record<string, unknown>
  return (
    '{' +
    Object.keys(o)
      .filter((k) => o[k] !== undefined)
      .sort()
      .map((k) => JSON.stringify(k) + ':' + stableStringify(o[k]))
      .join(',') +
    '}'
  )
}

/** Hash veloce non crittografico (cyrb53) restituito in esadecimale. */
export function hashString(str: string, seed = 0): string {
  let h1 = 0xdeadbeef ^ seed
  let h2 = 0x41c6ce57 ^ seed
  for (let i = 0; i < str.length; i++) {
    const ch = str.charCodeAt(i)
    h1 = Math.imul(h1 ^ ch, 2654435761)
    h2 = Math.imul(h2 ^ ch, 1597334677)
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909)
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909)
  return (h2 >>> 0).toString(16).padStart(8, '0') + (h1 >>> 0).toString(16).padStart(8, '0')
}

export function formatTime(t: number, withMs = false): string {
  if (!isFinite(t)) return '--:--'
  const sign = t < 0 ? '-' : ''
  t = Math.abs(t)
  const h = Math.floor(t / 3600)
  const m = Math.floor((t % 3600) / 60)
  const s = Math.floor(t % 60)
  const ms = Math.floor((t % 1) * 1000)
  const base = (h ? `${h}:${String(m).padStart(2, '0')}` : `${m}`) + `:${String(s).padStart(2, '0')}`
  return sign + base + (withMs ? `.${String(ms).padStart(3, '0')}` : '')
}
