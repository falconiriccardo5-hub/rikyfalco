// Test reale della trascrizione con whisper.cpp (eseguito solo se configurato):
//   WHISPER_CLI=/percorso/whisper-cli WHISPER_MODEL=/percorso/ggml-base.en.bin SPEECH_WAV=/percorso/jfk.wav npm test

import fs from 'fs'
import path from 'path'
import { describe, expect, it } from 'vitest'
import { createNode, newId } from '../src/shared/graph'
import type { EngineEvent, NodeType, ProjectDoc } from '../src/shared/types'
import { ffmpeg } from '../src/main/ffmpeg/tools'
import { probe } from '../src/main/ffmpeg/probe'
import { TEST_DIR, makeEngine, makeEnv, tools } from './helpers'

const cli = process.env.WHISPER_CLI
const model = process.env.WHISPER_MODEL
const wav = process.env.SPEECH_WAV
const enabled = !!(cli && model && wav && fs.existsSync(cli) && fs.existsSync(model) && fs.existsSync(wav))

if (process.env.REQUIRE_WHISPER && !enabled) {
  describe('trascrizione con whisper.cpp', () => {
    it('è configurata (REQUIRE_WHISPER)', () => {
      throw new Error(`whisper non configurato: WHISPER_CLI=${cli} WHISPER_MODEL=${model} SPEECH_WAV=${wav}`)
    })
  })
}

describe.skipIf(!enabled)('trascrizione con whisper.cpp', () => {
  it('trascrive, crea sottotitoli, taglia le pause senza toccare le parole ed esporta', async () => {
    const dir = path.join(TEST_DIR, 'proj_whisper')
    fs.rmSync(dir, { recursive: true, force: true })
    const video = path.join(TEST_DIR, 'media', 'speech.mp4')
    if (!fs.existsSync(video)) {
      fs.mkdirSync(path.dirname(video), { recursive: true })
      // 2 s di silenzio + parlato + 2 s di silenzio, su sfondo grigio.
      await ffmpeg(tools, [
        '-f', 'lavfi', '-i', 'color=c=0x334455:s=960x540:r=25:d=15',
        '-i', wav!,
        '-filter_complex', '[1:a]adelay=2000|2000,apad=whole_dur=15[a]',
        '-map', '0:v', '-map', '[a]', '-c:v', 'libx264', '-preset', 'ultrafast', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-t', '15', video
      ])
    }
    const types: NodeType[] = ['import', 'analyze', 'transcribe', 'silence', 'subtitles', 'export']
    const nodes = types.map((t, i) => createNode(t, { x: i * 200, y: 0 }))
    nodes[0].settings.mediaId = 'v'
    nodes[1].settings.thumbnails = 0
    nodes[2].settings.language = 'en'
    nodes[4].settings.animation = 'highlight'
    const out = path.join(dir, 'export', 'speech_sub.mp4')
    nodes[5].settings = { ...nodes[5].settings, outputPath: out, preset: 'ultrafast', crf: 30 }
    const project: ProjectDoc = {
      version: 1, name: 't', createdAt: '', updatedAt: '',
      media: [{ id: 'v', kind: 'video', path: video, name: 'speech.mp4' }],
      workflow: { nodes, edges: nodes.slice(1).map((n, i) => ({ id: newId('e'), source: nodes[i].id, target: n.id })) }
    }
    const events: EngineEvent[] = []
    const engine = makeEngine(await makeEnv({ whisperCliPath: cli!, whisperModelPath: model! }), events)
    const ok = await engine.run({ projectDir: dir, project })
    const errs = events.filter((e) => e.kind === 'status' && e.runtime.status === 'error').map((e) => e.kind === 'status' && e.runtime.error)
    expect(errs).toEqual([])
    expect(ok).toBe(true)

    const tr = engine.getNodeOutput(dir, nodes[2].id)!.transcript!
    const text = tr.text.toLowerCase()
    expect(text).toContain('country')
    expect(tr.words.length).toBeGreaterThan(15)
    // Le parole cadono dopo i 2 s di silenzio iniziale.
    expect(tr.words[0].start).toBeGreaterThan(1.8)

    const seg = engine.getNodeOutput(dir, nodes[3].id)!.segments
    // Nessuna parola deve cadere in un taglio.
    for (const w of tr.words) {
      const mid = (w.start + w.end) / 2
      expect(seg.some((s) => mid >= s.start && mid <= s.end)).toBe(true)
    }
    // Il silenzio iniziale e finale sono stati rimossi.
    expect(seg[0].start).toBeGreaterThan(1.5)

    const subs = engine.getNodeOutput(dir, nodes[4].id)!.subtitles!
    expect(subs.cues.length).toBeGreaterThan(2)
    expect(fs.existsSync(out)).toBe(true)
    expect(fs.readFileSync(out.replace('.mp4', '.srt'), 'utf8')).toMatch(/-->/)
    const info = await probe(tools, out)
    expect(info.duration).toBeLessThan(13)
  })
})
