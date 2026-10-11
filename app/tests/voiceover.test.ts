// Voce narrante con Piper reale (eseguito solo se configurato):
//   PIPER_PATH=/percorso/piper PIPER_VOICE_DIR=/cartella/con/it_IT-paola-medium.onnx npx vitest run tests/voiceover.test.ts

import fs from 'fs'
import path from 'path'
import { describe, expect, it } from 'vitest'
import { createNode, newId } from '../src/shared/graph'
import type { EngineEvent, NodeType, ProjectDoc } from '../src/shared/types'
import { probe } from '../src/main/ffmpeg/probe'
import { parseScript } from '../src/main/voice/piper'
import { TEST_DIR, makeEngine, makeEnv, makeTestVideo, tools } from './helpers'

describe('testo della voce narrante', () => {
  it('riconosce i tempi di inizio', () => {
    expect(parseScript('Ciao a tutti\n0:20 Seconda frase\n[1:02:03] Terza\n[12.5] Quarta\n\n  ')).toEqual([
      { at: null, text: 'Ciao a tutti' },
      { at: 20, text: 'Seconda frase' },
      { at: 3723, text: 'Terza' },
      { at: 12.5, text: 'Quarta' }
    ])
  })
})

const piper = process.env.PIPER_PATH
const voiceDir = process.env.PIPER_VOICE_DIR
const enabled = !!(piper && voiceDir && fs.existsSync(piper) && fs.existsSync(path.join(voiceDir, 'it_IT-paola-medium.onnx')))

if (process.env.REQUIRE_PIPER && !enabled) {
  describe('voce narrante con Piper', () => {
    it('è configurata (REQUIRE_PIPER)', () => {
      throw new Error(`Piper non configurato: PIPER_PATH=${piper} PIPER_VOICE_DIR=${voiceDir}`)
    })
  })
}

describe.skipIf(!enabled)('voce narrante con Piper', () => {
  it('genera la voce, la mescola, crea i sottotitoli dal testo ed esporta', async () => {
    const data = path.join(TEST_DIR, 'data-voce')
    fs.mkdirSync(path.join(data, 'voices'), { recursive: true })
    for (const f of ['it_IT-paola-medium.onnx', 'it_IT-paola-medium.onnx.json']) {
      const dst = path.join(data, 'voices', f)
      if (!fs.existsSync(dst)) fs.copyFileSync(path.join(voiceDir!, f), dst)
    }
    const video = path.join(TEST_DIR, 'media', 'clip.mp4')
    await makeTestVideo(video)
    const dir = path.join(TEST_DIR, 'proj_voce')
    fs.rmSync(dir, { recursive: true, force: true })
    const types: NodeType[] = ['import', 'voiceover', 'subtitles', 'export']
    const nodes = types.map((t, i) => createNode(t, { x: i * 200, y: 0 }))
    nodes[0].settings.mediaId = 'v'
    nodes[1].settings = { ...nodes[1].settings, script: 'Ciao e benvenuti in questo tutorial.\n0:06 Adesso vediamo il secondo passaggio.', original: 'duck' }
    const out = path.join(dir, 'export', 'voce.mp4')
    nodes[3].settings = { ...nodes[3].settings, outputPath: out, preset: 'ultrafast', crf: 30 }
    const project: ProjectDoc = {
      version: 1, name: 'voce', createdAt: '', updatedAt: '',
      media: [{ id: 'v', kind: 'video', path: video, name: 'clip.mp4' }],
      workflow: { nodes, edges: nodes.slice(1).map((n, i) => ({ id: newId('e'), source: nodes[i].id, target: n.id })) }
    }
    const env = { ...(await makeEnv({ piperPath: piper! })), dataDir: data }
    const events: EngineEvent[] = []
    const engine = makeEngine(env, events)
    const ok = await engine.run({ projectDir: dir, project })
    const errs = events.filter((e) => e.kind === 'status' && e.runtime.status === 'error').map((e) => e.kind === 'status' && e.runtime.error)
    expect(errs).toEqual([])
    expect(ok).toBe(true)

    const vo = engine.getNodeOutput(dir, nodes[1].id)!
    expect(vo.voiceover!.clips.length).toBe(2)
    expect(vo.voiceover!.clips[1].start).toBeCloseTo(6, 1)
    expect(vo.transcript!.words.map((w) => w.text).join(' ')).toContain('benvenuti')

    const srt = fs.readFileSync(out.replace('.mp4', '.srt'), 'utf8')
    expect(srt).toContain('benvenuti')
    expect(srt).toContain('secondo passaggio')
    const info = await probe(tools, out)
    expect(info.hasAudio).toBe(true)
    expect(Math.abs(info.duration - 12)).toBeLessThan(0.3)
  })
})
