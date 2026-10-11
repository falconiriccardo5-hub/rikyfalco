// Nodi audio: "Miglioramento audio" e "Musica".

import fs from 'fs'
import path from 'path'
import { formatTime } from '../../shared/timeline'
import type { AudioFx, MusicTrack } from '../../shared/types'
import { probe } from '../ffmpeg/probe'
import { ffmpeg } from '../ffmpeg/tools'
import { compile } from '../render/compile'
import { bool, mediaPath, num, requireInput, str, type NodeImpl } from '../engine/context'

export const audioNode: NodeImpl = {
  async run(ctx, input, s) {
    const tl = requireInput(input)
    if (!tl.source.hasAudio) throw new Error('Il video non contiene audio da migliorare.')
    const fx: AudioFx = {
      denoise: (['off', 'light', 'medium', 'strong'].includes(str(s.denoise)) ? s.denoise : 'medium') as AudioFx['denoise'],
      highpass: num(s.highpass, 80),
      deesser: bool(s.deesser),
      compressor: bool(s.compressor, true),
      normalize: bool(s.normalize, true),
      targetLufs: num(s.targetLufs, -14),
      truePeak: num(s.truePeak, -1.5),
      voiceGainDb: num(s.voiceGainDb, 0)
    }
    const items = [
      { label: 'Riduzione rumore', value: fx.denoise },
      { label: 'Passa-alto', value: fx.highpass ? `${fx.highpass} Hz` : 'off' },
      { label: 'Compressore', value: fx.compressor ? 'sì' : 'no' },
      { label: 'De-esser', value: fx.deesser ? 'sì' : 'no' }
    ]
    // Prima passata di loudnorm sull'audio montato: misura reale per una normalizzazione precisa.
    if (fx.normalize) {
      const dir = ctx.jobDir('measure')
      const c = compile({
        timeline: { ...tl, audio: fx },
        render: { width: 2, height: 2, fps: tl.source.fps, fit: 'fit' },
        mode: 'audio-measure',
        dir,
        ffmpegMajor: ctx.ffmpegMajor
      })
      const err = await ffmpeg(ctx.tools, [...c.args, '-f', 'null', '-'], {
        cwd: dir,
        signal: ctx.signal,
        duration: c.duration,
        onProgress: (f) => ctx.progress(f, `Misura loudness ${Math.round(f * 100)}%`)
      })
      const start = err.lastIndexOf('{')
      const end = err.lastIndexOf('}')
      if (start >= 0 && end > start) {
        try {
          const j = JSON.parse(err.slice(start, end + 1)) as Record<string, string>
          fx.measured = j
          items.push({ label: 'Loudness misurata', value: `${j.input_i} LUFS (picco ${j.input_tp} dBTP)` })
          items.push({ label: 'Obiettivo', value: `${fx.targetLufs} LUFS` })
        } catch {
          ctx.log('warn', 'Impossibile leggere la misura di loudness: verrà usata la normalizzazione dinamica.')
        }
      }
    }
    return {
      output: { ...tl, audio: fx },
      result: {
        summary: fx.normalize ? `Voce → ${fx.targetLufs} LUFS` : 'Filtri voce attivi',
        items,
        files: [],
        data: { measured: fx.measured ?? null }
      }
    }
  }
}

export const musicNode: NodeImpl = {
  async run(ctx, input, s) {
    const tl = requireInput(input)
    const p = mediaPath(ctx.media, s.mediaId)
    if (!p) throw new Error('Seleziona un brano: importa un file audio nell\'area Progetto.')
    if (!fs.existsSync(p)) throw new Error(`Brano mancante: ${p}`)
    const info = await probe(ctx.tools, p)
    if (!info.hasAudio) throw new Error('Il file scelto non contiene audio.')
    const music: MusicTrack = {
      path: p,
      volumeDb: num(s.volumeDb, -20),
      fadeIn: num(s.fadeIn, 2),
      fadeOut: num(s.fadeOut, 3),
      ducking: (['off', 'light', 'medium', 'strong'].includes(str(s.ducking)) ? s.ducking : 'medium') as MusicTrack['ducking'],
      startOffset: Math.max(0, num(s.startOffset, 0)),
      loop: bool(s.loop, true),
      coverEndscreen: bool(s.coverEndscreen, true)
    }
    const warnings: string[] = []
    if (music.startOffset >= info.duration) warnings.push('L\'inizio scelto supera la durata del brano.')
    return {
      output: { ...tl, music },
      result: {
        summary: `${path.basename(p)} · ${music.volumeDb} dB`,
        items: [
          { label: 'Brano', value: path.basename(p) },
          { label: 'Durata brano', value: formatTime(info.duration) },
          { label: 'Volume', value: `${music.volumeDb} dB` },
          { label: 'Ducking', value: music.ducking },
          { label: 'Loop', value: music.loop ? 'sì' : 'no' }
        ],
        files: [],
        warnings
      }
    }
  }
}
