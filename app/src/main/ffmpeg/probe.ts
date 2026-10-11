// Lettura dei metadati con ffprobe (durata, risoluzione, fps, tracce).

import fs from 'fs'
import path from 'path'
import type { MediaInfo, MediaKind } from '../../shared/types'
import { runProcess } from './run'
import type { ToolPaths } from './tools'

export const VIDEO_EXT = ['mp4', 'mov', 'm4v', 'mkv', 'webm', 'avi', 'mts', 'm2ts', 'ts', 'wmv', 'flv', 'mpg', 'mpeg', '3gp']
export const AUDIO_EXT = ['mp3', 'wav', 'm4a', 'aac', 'flac', 'ogg', 'opus', 'wma', 'aiff', 'aif']
export const IMAGE_EXT = ['png', 'jpg', 'jpeg', 'webp', 'bmp', 'gif', 'tif', 'tiff']

export function kindFromPath(p: string): MediaKind | null {
  const ext = path.extname(p).slice(1).toLowerCase()
  if (VIDEO_EXT.includes(ext)) return 'video'
  if (AUDIO_EXT.includes(ext)) return 'audio'
  if (IMAGE_EXT.includes(ext)) return 'image'
  return null
}

function parseRate(r?: string): number {
  if (!r) return 0
  const [a, b] = r.split('/').map(Number)
  if (!b) return a || 0
  return a / b
}

interface ProbeStream {
  codec_type?: string
  codec_name?: string
  width?: number
  height?: number
  avg_frame_rate?: string
  r_frame_rate?: string
  pix_fmt?: string
  sample_rate?: string
  channels?: number
  duration?: string
  tags?: Record<string, string>
  side_data_list?: { rotation?: number }[]
  disposition?: { attached_pic?: number }
}

export async function probe(tools: ToolPaths, file: string): Promise<MediaInfo> {
  if (!fs.existsSync(file)) throw new Error(`File non trovato: ${file}`)
  const stat = fs.statSync(file)
  const r = await runProcess(tools.ffprobe, [
    '-v', 'error', '-print_format', 'json', '-show_format', '-show_streams', file
  ])
  if (r.code !== 0) {
    throw new Error(`Formato non supportato o file danneggiato: ${path.basename(file)} (${r.stderr.trim().slice(0, 300)})`)
  }
  const j = JSON.parse(r.stdout) as { format?: Record<string, string>; streams?: ProbeStream[] }
  const streams = j.streams ?? []
  const v = streams.find((s) => s.codec_type === 'video' && !s.disposition?.attached_pic)
  const a = streams.find((s) => s.codec_type === 'audio')
  let duration = Number(j.format?.duration ?? 0)
  if (!isFinite(duration) || duration <= 0) duration = Number(v?.duration ?? a?.duration ?? 0) || 0
  let fps = parseRate(v?.avg_frame_rate) || parseRate(v?.r_frame_rate)
  if (!isFinite(fps) || fps <= 0 || fps > 240) fps = 30
  const rotation = Number(v?.tags?.rotate ?? v?.side_data_list?.find((d) => d.rotation !== undefined)?.rotation ?? 0) || 0
  let width = v?.width ?? 0
  let height = v?.height ?? 0
  if (Math.abs(rotation) === 90 || Math.abs(rotation) === 270) [width, height] = [height, width]
  return {
    path: file,
    sizeBytes: stat.size,
    mtimeMs: Math.round(stat.mtimeMs),
    formatName: j.format?.format_name ?? '',
    duration,
    hasVideo: !!v,
    hasAudio: !!a,
    width,
    height,
    fps: Math.round(fps * 1000) / 1000,
    videoCodec: v?.codec_name,
    pixFmt: v?.pix_fmt,
    rotation,
    audioCodec: a?.codec_name,
    sampleRate: a?.sample_rate ? Number(a.sample_rate) : undefined,
    channels: a?.channels,
    bitRate: j.format?.bit_rate ? Number(j.format.bit_rate) : undefined
  }
}

/** Chromium (Electron) riproduce nativamente solo alcuni codec. */
export function isPlayableInApp(info: MediaInfo): boolean {
  const okVideo = ['h264', 'vp8', 'vp9', 'av1']
  const okAudio = ['aac', 'mp3', 'opus', 'vorbis', 'flac', 'pcm_s16le', undefined]
  const okFmt = /mp4|mov|webm|matroska|ogg/.test(info.formatName)
  const pixOk = !info.pixFmt || /^yuv420p$|^yuvj420p$|^nv12$/.test(info.pixFmt)
  return okFmt && pixOk && (!info.hasVideo || okVideo.includes(info.videoCodec ?? '')) && okAudio.includes(info.audioCodec)
}
