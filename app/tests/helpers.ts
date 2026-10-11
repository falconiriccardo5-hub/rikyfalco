// Utilità per i test: generazione di media sintetici con FFmpeg e motore headless.

import fs from 'fs'
import path from 'path'
import { Engine } from '../src/main/engine/executor'
import type { EngineEnv } from '../src/main/engine/context'
import { ffmpeg, ffmpegVersion, listEncoders, resolveTools } from '../src/main/ffmpeg/tools'
import type { AppSettings, EngineEvent } from '../src/shared/types'

export const ROOT = path.resolve(__dirname, '..')
export const TEST_DIR = path.join(ROOT, '.test-work')

export const tools = resolveTools()

export function settings(over: Partial<AppSettings> = {}): AppSettings {
  return {
    ffmpegPath: '',
    ffprobePath: '',
    whisperCliPath: process.env.WHISPER_CLI ?? '',
    whisperModelPath: process.env.WHISPER_MODEL ?? '',
    pythonPath: '',
    defaultLanguage: 'en',
    theme: 'dark',
    threads: 4,
    recentProjects: [],
    remoteEnabled: false,
    remotePort: 7878,
    remoteTokens: [],
    ...over
  }
}

export async function makeEnv(over: Partial<AppSettings> = {}): Promise<EngineEnv> {
  const v = await ffmpegVersion(tools)
  return {
    tools,
    ffmpegMajor: v.major,
    encoders: await listEncoders(tools),
    settings: settings(over),
    resourcesDir: path.join(ROOT, 'resources')
  }
}

export function makeEngine(env: EngineEnv, events: EngineEvent[] = []): Engine {
  return new Engine(async () => env, (e) => {
    events.push(e)
    if (e.kind === 'log' && process.env.VERBOSE) console.log(`[${e.entry.level}] ${e.entry.message}`)
  })
}

/** Video 1280×720 30 fps con tono a 440 Hz e silenzi in 2–3.5 s, 6–8 s, 11–12 s. */
export async function makeTestVideo(file: string, duration = 12): Promise<void> {
  if (fs.existsSync(file)) return
  fs.mkdirSync(path.dirname(file), { recursive: true })
  const gate = 'between(t,0,2)+between(t,3.5,6)+between(t,8,11)'
  await ffmpeg(tools, [
    '-f', 'lavfi', '-i', `testsrc2=s=1280x720:r=30:d=${duration}`,
    '-f', 'lavfi', '-i', `aevalsrc='0.5*sin(2*PI*440*t)*(${gate})':s=48000:d=${duration}`,
    '-c:v', 'libx264', '-preset', 'ultrafast', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-shortest', file
  ])
}

export async function makeTestMusic(file: string): Promise<void> {
  if (fs.existsSync(file)) return
  await ffmpeg(tools, ['-f', 'lavfi', '-i', 'sine=f=220:d=5:sample_rate=44100', '-c:a', 'libmp3lame', '-q:a', '5', file])
}

export async function makeTestImage(file: string): Promise<void> {
  if (fs.existsSync(file)) return
  await ffmpeg(tools, ['-f', 'lavfi', '-i', 'color=c=orange:s=400x200:d=1', '-frames:v', '1', file])
}
