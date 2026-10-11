// Test di carico (eseguito solo con PERF=1): video lungo con centinaia di tagli.

import fs from 'fs'
import path from 'path'
import { describe, expect, it } from 'vitest'
import { createNode, newId } from '../src/shared/graph'
import type { NodeType, ProjectDoc } from '../src/shared/types'
import { ffmpeg } from '../src/main/ffmpeg/tools'
import { probe } from '../src/main/ffmpeg/probe'
import { TEST_DIR, makeEngine, makeEnv, tools } from './helpers'

const MINUTES = Number(process.env.PERF_MINUTES ?? 10)

describe.skipIf(!process.env.PERF)('prestazioni', () => {
  it(`video di ${MINUTES} minuti con molti tagli`, async () => {
    const dur = MINUTES * 60
    const video = path.join(TEST_DIR, 'media', `long_${MINUTES}.mp4`)
    if (!fs.existsSync(video)) {
      // 1.2 s di tono + 0.8 s di silenzio, ripetuti.
      await ffmpeg(tools, [
        '-f', 'lavfi', '-i', `testsrc2=s=1280x720:r=30:d=${dur}`,
        '-f', 'lavfi', '-i', `aevalsrc='0.4*sin(2*PI*330*t)*lt(mod(t,2),1.2)':s=48000:d=${dur}`,
        '-c:v', 'libx264', '-preset', 'ultrafast', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-shortest', video
      ])
    }
    const dir = path.join(TEST_DIR, 'proj_perf')
    fs.rmSync(dir, { recursive: true, force: true })
    const types: NodeType[] = ['import', 'silence', 'zoom', 'transitions', 'export']
    const nodes = types.map((t, i) => createNode(t, { x: i * 200, y: 0 }))
    nodes[0].settings.mediaId = 'v'
    nodes[1].settings = { ...nodes[1].settings, thresholdMode: 'manual', thresholdDb: -40, minSilence: 0.5, padding: 0.05, minKeep: 0.1 }
    nodes[3].settings = { ...nodes[3].settings, apply: 'every', everyN: 25, maxCount: 40 }
    const out = path.join(dir, 'export', 'long.mp4')
    nodes[4].settings = { ...nodes[4].settings, outputPath: out, preset: 'ultrafast', crf: 30, resolution: '720p' }
    const project: ProjectDoc = {
      version: 1, name: 'perf', createdAt: '', updatedAt: '',
      media: [{ id: 'v', kind: 'video', path: video, name: 'long.mp4' }],
      workflow: { nodes, edges: nodes.slice(1).map((n, i) => ({ id: newId('e'), source: nodes[i].id, target: n.id })) }
    }
    const engine = makeEngine(await makeEnv())
    const t0 = Date.now()
    expect(await engine.run({ projectDir: dir, project })).toBe(true)
    const secs = (Date.now() - t0) / 1000
    const segs = engine.getNodeOutput(dir, nodes[1].id)!.segments
    const info = await probe(tools, out)
    const kept = segs.reduce((s, r) => s + r.end - r.start, 0)
    console.log(`[perf] ${MINUTES} min, ${segs.length} segmenti, durata finale ${info.duration.toFixed(1)}s (attesa ~${kept.toFixed(1)}s meno transizioni), tempo totale ${secs.toFixed(1)}s`)
    expect(segs.length).toBeGreaterThan(MINUTES * 25)
    expect(Math.abs(info.duration - kept)).toBeLessThan(40 * 0.4 + 1)
  })
})
