// Test d'integrazione: esegue l'intero workflow con FFmpeg reale su media sintetici.

import fs from 'fs'
import path from 'path'
import { beforeAll, describe, expect, it } from 'vitest'
import { createNode, newId } from '../src/shared/graph'
import type { EngineEvent, MediaItem, NodeType, ProjectDoc, WorkflowNode } from '../src/shared/types'
import { probe } from '../src/main/ffmpeg/probe'
import { TEST_DIR, makeEngine, makeEnv, makeTestImage, makeTestMusic, makeTestVideo, tools } from './helpers'

const video = path.join(TEST_DIR, 'media', 'clip.mp4')
const music = path.join(TEST_DIR, 'media', 'music.mp3')
const image = path.join(TEST_DIR, 'media', 'logo.png')

function chain(types: NodeType[], patch: Partial<Record<NodeType, Record<string, unknown>>>): ProjectDoc['workflow'] {
  const nodes: WorkflowNode[] = types.map((t, i) => {
    const n = createNode(t, { x: i * 200, y: 0 })
    Object.assign(n.settings, patch[t] ?? {})
    return n
  })
  const edges = nodes.slice(1).map((n, i) => ({ id: newId('e'), source: nodes[i].id, target: n.id }))
  return { nodes, edges }
}

function project(media: MediaItem[], workflow: ProjectDoc['workflow']): ProjectDoc {
  return { version: 1, name: 'test', createdAt: '', updatedAt: '', media, workflow }
}

describe('pipeline completa', () => {
  const media: MediaItem[] = [
    { id: 'v1', kind: 'video', path: video, name: 'clip.mp4' },
    { id: 'm1', kind: 'audio', path: music, name: 'music.mp3' },
    { id: 'i1', kind: 'image', path: image, name: 'logo.png' }
  ]

  beforeAll(async () => {
    await makeTestVideo(video)
    await makeTestMusic(music)
    await makeTestImage(image)
  })

  it('taglia le pause, applica grafica, audio, musica, transizioni ed esporta', async () => {
    const dir = path.join(TEST_DIR, 'proj_full')
    fs.rmSync(dir, { recursive: true, force: true })
    const out = path.join(dir, 'export', 'final.mp4')
    const wf = chain(
      ['import', 'analyze', 'silence', 'subtitles', 'texts', 'zoom', 'audio', 'music', 'transitions', 'endscreen', 'export'],
      {
        import: { mediaId: 'v1' },
        analyze: { thumbnails: 3, scenes: true },
        silence: { thresholdMode: 'manual', thresholdDb: -40, minSilence: 0.5, padding: 0.1 },
        subtitles: {
          editedCues: [
            { id: 'a', start: 0.2, end: 1.8, text: 'Ciao a tutti e benvenuti' },
            { id: 'b', start: 4, end: 5.8, text: 'Questa è una prova reale' },
            { id: 'c', start: 8.5, end: 10.5, text: 'Fine del test' }
          ],
          animation: 'pop',
          keywords: 'prova'
        },
        texts: {
          items: [
            { id: 't1', kind: 'text', text: 'Titolo di prova', start: 0.5, duration: 2, preset: 'bold', x: 50, y: 20, size: 0, color: '', animationIn: 'pop', animationOut: 'fade', animDuration: 0.3, keyframes: [] },
            { id: 't2', kind: 'text', text: 'Keyframe', start: 4, duration: 2, preset: 'box', x: 50, y: 50, size: 0, color: '', animationIn: 'fade', animationOut: 'fade', animDuration: 0.3, keyframes: [{ t: 0, x: 20, y: 30, scale: 80, opacity: 0 }, { t: 1, x: 70, y: 60, scale: 120, opacity: 100 }] },
            { id: 'i', kind: 'image', mediaId: 'i1', text: '', start: 8.2, duration: 2, preset: 'minimal', x: 80, y: 20, size: 20, color: '', animationIn: 'slide-left', animationOut: 'fade', animDuration: 0.4, keyframes: [] }
          ]
        },
        zoom: { auto: 'jumpcut', everyN: 1, scale: 1.2, ease: 0.2, zooms: [{ id: 'z', start: 0.5, end: 1.5, scale: 1.4, x: 30, y: 30, ease: 0.2 }] },
        music: { mediaId: 'm1', volumeDb: -18 },
        transitions: { apply: 'all', type: 'fade', duration: 0.3 },
        endscreen: { duration: 2, logoMediaId: 'i1', fade: 0.4 },
        export: { outputPath: out, resolution: '720p', preset: 'ultrafast', crf: 28 }
      }
    )
    const env = await makeEnv()
    const events: EngineEvent[] = []
    const engine = makeEngine(env, events)
    const ok = await engine.run({ projectDir: dir, project: project(media, wf) })
    const errors = events.filter((e) => e.kind === 'status' && e.runtime.status === 'error')
    expect(errors.map((e) => e.kind === 'status' && e.runtime.error)).toEqual([])
    expect(ok).toBe(true)

    const silence = engine.getNodeOutput(dir, wf.nodes[2].id)!
    // 3 parti parlate → 3 segmenti mantenuti.
    expect(silence.segments.length).toBe(3)
    const kept = silence.segments.reduce((s, r) => s + r.end - r.start, 0)
    expect(kept).toBeGreaterThan(7.5)
    expect(kept).toBeLessThan(9)

    expect(fs.existsSync(out)).toBe(true)
    expect(fs.existsSync(out.replace('.mp4', '.srt'))).toBe(true)
    const info = await probe(tools, out)
    expect(info.width).toBe(1280)
    expect(info.height).toBe(720)
    expect(info.hasAudio).toBe(true)
    // durata = segmenti − 2 transizioni da 0.3 s + schermata finale 2 s − dissolvenza 0.4 s
    const expected = kept - 2 * 0.3 + 2 - 0.4
    expect(Math.abs(info.duration - expected)).toBeLessThan(0.25)

    // Esecuzione successiva: tutto dalla cache, nessun nodo rieseguito.
    const ev2: EngineEvent[] = []
    const engine2 = makeEngine(env, ev2)
    expect(await engine2.run({ projectDir: dir, project: project(media, wf) })).toBe(true)
    expect(ev2.filter((e) => e.kind === 'status' && e.runtime.status === 'running').length).toBe(0)

    // Modifica di un'impostazione: si rieseguono solo il nodo e i successivi.
    const wf2 = structuredClone(wf)
    wf2.nodes.find((n) => n.type === 'zoom')!.settings.scale = 1.3
    const ev3: EngineEvent[] = []
    expect(await makeEngine(env, ev3).run({ projectDir: dir, project: project(media, wf2) })).toBe(true)
    const rerun = ev3.filter((e) => e.kind === 'status' && e.runtime.status === 'running').map((e) => e.kind === 'status' && wf2.nodes.find((n) => n.id === e.runtime.nodeId)!.type)
    expect(rerun).toEqual(['zoom', 'audio', 'music', 'transitions', 'endscreen', 'export'])
  })

  it('anteprima veloce e anteprima audio A/B', async () => {
    const dir = path.join(TEST_DIR, 'proj_preview')
    fs.rmSync(dir, { recursive: true, force: true })
    const wf = chain(['import', 'silence', 'audio', 'music'], {
      import: { mediaId: 'v1' },
      silence: { thresholdMode: 'auto' },
      music: { mediaId: 'm1' }
    })
    const env = await makeEnv()
    const engine = makeEngine(env)
    const p = project(media, wf)
    const pv = await engine.preview({ projectDir: dir, project: p, nodeId: wf.nodes[3].id, fromSource: 3.6, seconds: 3 })
    const info = await probe(tools, pv.path)
    expect(info.height).toBeLessThanOrEqual(540)
    expect(Math.abs(info.duration - 3)).toBeLessThan(0.3)
    const ab = await engine.audioPreview({ projectDir: dir, project: p, nodeId: wf.nodes[2].id, fromSource: 0, seconds: 4 })
    expect(fs.existsSync(ab.original)).toBe(true)
    expect(fs.existsSync(ab.processed)).toBe(true)
  })

  it('gestisce file mancanti e annullamento', async () => {
    const dir = path.join(TEST_DIR, 'proj_err')
    fs.rmSync(dir, { recursive: true, force: true })
    const wf = chain(['import', 'analyze'], { import: { mediaId: 'missing' } })
    const events: EngineEvent[] = []
    const engine = makeEngine(await makeEnv(), events)
    const ok = await engine.run({ projectDir: dir, project: project([{ id: 'missing', kind: 'video', path: '/non/esiste.mp4', name: 'x' }], wf) })
    expect(ok).toBe(false)
    const st = events.filter((e) => e.kind === 'status').map((e) => e.kind === 'status' && e.runtime.status)
    expect(st).toContain('error')
    expect(st).toContain('idle') // il nodo successivo resta bloccato

    // Annullamento durante un'elaborazione.
    const wf2 = chain(['import', 'analyze'], { import: { mediaId: 'v1', proxy: 'always' }, analyze: { scenes: true, thumbnails: 0 } })
    const ev2: EngineEvent[] = []
    const eng2 = makeEngine(await makeEnv(), ev2)
    const pr = eng2.run({ projectDir: path.join(TEST_DIR, 'proj_cancel'), project: project(media, wf2) })
    setTimeout(() => eng2.cancel(), 150)
    await pr
    const fin = ev2.find((e) => e.kind === 'run-finished')
    expect(fin && fin.kind === 'run-finished' && fin.cancelled).toBe(true)
  })
})
