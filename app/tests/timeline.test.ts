import { describe, expect, it } from 'vitest'
import {
  complementRanges, computeCuts, computeLayout, extractKeywords, groupWordsIntoCues, mapRangeToOutput,
  mergeRanges, outputToSource, sourceToOutput, speechGaps, subtractRanges
} from '../src/shared/timeline'
import { computeHashes, defaultWorkflow, validateConnection } from '../src/shared/graph'
import { assColor, assTime, buildSrt, lineBreaks } from '../src/main/render/ass'
import { dtwPreset, wordsFromWhisperJson } from '../src/main/transcribe/whisper'
import { stripProjectSpecific } from '../src/main/store'

describe('intervalli', () => {
  it('unisce e sottrae', () => {
    expect(mergeRanges([{ start: 2, end: 3 }, { start: 0, end: 1 }, { start: 0.5, end: 2.5 }])).toEqual([{ start: 0, end: 3 }])
    expect(subtractRanges([{ start: 0, end: 10 }], [{ start: 2, end: 3 }, { start: 5, end: 6 }])).toEqual([
      { start: 0, end: 2 }, { start: 3, end: 5 }, { start: 6, end: 10 }
    ])
    expect(complementRanges([{ start: 1, end: 2 }], { start: 0, end: 3 })).toEqual([{ start: 0, end: 1 }, { start: 2, end: 3 }])
  })
})

describe('layout e mappatura dei tempi', () => {
  const segs = [{ start: 0, end: 2 }, { start: 4, end: 6 }, { start: 8, end: 10 }]
  it('senza transizioni', () => {
    const l = computeLayout(segs, 25)
    expect(l.mainDuration).toBeCloseTo(6)
    expect(sourceToOutput(l, 5)).toBeCloseTo(3)
    expect(sourceToOutput(l, 3)).toBeNull()
    expect(outputToSource(l, 4.5)).toBeCloseTo(8.5)
    expect(mapRangeToOutput(l, { start: 1, end: 9 })).toEqual({ start: 1, end: 5 })
  })
  it('con transizioni e schermata finale', () => {
    const l = computeLayout(segs, 25, { type: 'fade', duration: 0.4, cutPoints: [2], fadeInStart: 0, fadeOutEnd: 0 }, { duration: 3, fade: 0.4 })
    expect(l.clips.length).toBe(2)
    expect(l.transitions[0].offset).toBeCloseTo(1.6)
    expect(l.mainDuration).toBeCloseTo(5.6)
    expect(l.endscreen!.start).toBeCloseTo(5.2)
    expect(l.totalDuration).toBeCloseTo(8.2)
    // Un istante del secondo clip si sposta indietro della durata della transizione.
    expect(sourceToOutput(l, 4.5)).toBeCloseTo(2.1)
  })
  it('scarta transizioni più lunghe delle clip', () => {
    const l = computeLayout([{ start: 0, end: 0.4 }, { start: 1, end: 3 }], 25, { type: 'fade', duration: 0.5, cutPoints: [0.4], fadeInStart: 0, fadeOutEnd: 0 })
    expect(l.transitions.length).toBe(0)
    expect(l.clips.length).toBe(1)
  })
  it('quantizza ai fotogrammi', () => {
    const l = computeLayout([{ start: 0.013, end: 1.019 }], 25)
    expect(l.segments[0].start).toBeCloseTo(0)
    expect(l.segments[0].end).toBeCloseTo(1.0)
  })
})

describe('tagli', () => {
  const silences = [{ start: 0, end: 1 }, { start: 3, end: 4 }, { start: 6, end: 6.3 }, { start: 9, end: 10 }]
  const base = { duration: 10, silences, minSilence: 0.5, padding: 0.1, minKeep: 0.2, protectedRanges: [], manualCuts: [], disabledKeys: [] }
  it('rispetta durata minima e margine', () => {
    const r = computeCuts(base)
    expect(r.cuts.map((c) => [c.start, c.end])).toEqual([[0, 0.9], [3.1, 3.9], [9.1, 10]])
    expect(r.segments).toEqual([{ start: 0.9, end: 3.1 }, { start: 3.9, end: 9.1 }])
  })
  it('esclusione manuale, protezione e tagli aggiuntivi', () => {
    const r = computeCuts({ ...base, disabledKeys: ['3.10'], protectedRanges: [{ start: 9.5, end: 10 }], manualCuts: [{ start: 5, end: 5.5 }] })
    expect(r.cuts.find((c) => c.key === '3.10')!.enabled).toBe(false)
    expect(r.cuts.some((c) => c.reason === 'manual')).toBe(true)
    expect(r.segments.some((s) => s.end === 10)).toBe(true)
  })
  it('non taglia dentro le parole', () => {
    const r = computeCuts({ ...base, words: [{ start: 3.3, end: 3.6, text: 'sì' }] })
    const inside = r.cuts.filter((c) => c.enabled).some((c) => c.start < 3.6 && c.end > 3.3)
    expect(inside).toBe(false)
  })
})

describe('sottotitoli e parole', () => {
  const words = 'Ciao a tutti. Oggi vediamo come montare un video in modo automatico con FlowCut'.split(' ').map((t, i) => ({ start: i * 0.4, end: i * 0.4 + 0.35, text: t }))
  it('raggruppa le parole', () => {
    const cues = groupWordsIntoCues(words, { maxChars: 30, maxWords: 6, maxDuration: 4, gapBreak: 0.7 })
    expect(cues[0].text).toBe('Ciao a tutti.')
    expect(cues.every((c) => c.text.length <= 36)).toBe(true)
    expect(cues.map((c) => c.text).join(' ')).toBe(words.map((w) => w.text).join(' '))
  })
  it('a capo bilanciato', () => {
    const b = lineBreaks(['uno', 'due', 'tre', 'quattro', 'cinque'], 10)
    expect(b.size).toBe(1)
  })
  it('parole chiave e pause', () => {
    const w = ['montaggio', 'video', 'montaggio', 'automatico', 'video', 'il'].map((t, i) => ({ start: i, end: i + 0.5, text: t }))
    expect(extractKeywords(w)).toEqual(['montaggio', 'video'])
    expect(speechGaps([{ start: 0, end: 1 }, { start: 3, end: 4 }], 6, 1.5)).toEqual([{ start: 1, end: 3 }, { start: 4, end: 6 }])
  })
  it('formato ASS e SRT', () => {
    expect(assColor('#FF8000')).toBe('&H000080FF')
    expect(assColor('#000000', 50)).toBe('&H80000000')
    expect(assTime(3661.256)).toBe('1:01:01.26')
    expect(buildSrt([{ start: 1.5, end: 2.25, text: 'Ciao' }])).toBe('1\n00:00:01,500 --> 00:00:02,250\nCiao\n')
  })
})

describe('whisper.cpp', () => {
  it('preset DTW dal nome del modello', () => {
    expect(dtwPreset('/x/ggml-base.en.bin')).toBe('base.en')
    expect(dtwPreset('C:\\m\\ggml-large-v3-turbo-q5_0.bin')).toBe('large.v3.turbo')
    expect(dtwPreset('ggml-small.bin')).toBe('small')
    expect(dtwPreset('modello.bin')).toBeNull()
  })
  it('converte i token in parole usando i tempi DTW', () => {
    const w = wordsFromWhisperJson({
      transcription: [{
        offsets: { from: 0, to: 3000 },
        tokens: [
          { text: '[_BEG_]', offsets: { from: 0, to: 0 }, t_dtw: -1 },
          { text: ' Ciao', offsets: { from: 0, to: 500 }, t_dtw: 210 },
          { text: ',', offsets: { from: 500, to: 600 }, t_dtw: 240 },
          { text: ' mon', offsets: { from: 600, to: 900 }, t_dtw: 260 },
          { text: 'do', offsets: { from: 900, to: 1000 }, t_dtw: 280 },
          { text: '[_TT_150]', offsets: { from: 3000, to: 3000 }, t_dtw: -1 }
        ]
      }]
    })
    expect(w.map((x) => x.text)).toEqual(['Ciao,', 'mondo'])
    expect(w[0].start).toBeCloseTo(2.1)
    expect(w[0].end).toBeCloseTo(2.6)
    expect(w[1].start).toBeCloseTo(2.6)
  })
})

describe('grafo', () => {
  it('impedisce cicli e ingressi multipli; gli hash cambiano a valle', () => {
    const wf = defaultWorkflow()
    const [a, b, c] = wf.nodes
    expect(validateConnection(wf, c.id, a.id)).toMatch(/ingressi/)
    expect(validateConnection({ ...wf, edges: wf.edges.filter((e) => e.target !== b.id) }, c.id, b.id)).toMatch(/ciclo/)
    const h1 = computeHashes(wf, [])
    const wf2 = structuredClone(wf)
    wf2.nodes[3].settings.minSilence = 1
    const h2 = computeHashes(wf2, [])
    expect(h2.get(wf.nodes[2].id)).toBe(h1.get(wf.nodes[2].id))
    expect(h2.get(wf.nodes[3].id)).not.toBe(h1.get(wf.nodes[3].id))
    expect(h2.get(wf.nodes[11].id)).not.toBe(h1.get(wf.nodes[11].id))
  })
  it('i modelli non contengono file del progetto', () => {
    const wf = defaultWorkflow()
    wf.nodes[0].settings.mediaId = 'abc'
    wf.nodes[11].settings.outputPath = 'C:/video.mp4'
    const t = stripProjectSpecific(wf)
    expect(t.nodes[0].settings.mediaId).toBe('')
    expect(t.nodes[11].settings.outputPath).toBe('')
  })
})
