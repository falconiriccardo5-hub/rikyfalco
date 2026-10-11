// Compilatore (codice puro, usato dal PC e dal telefono): trasforma la Timeline
// in un unico filtergraph FFmpeg.
// Il video originale viene solo letto; tutto il resto (grafo, ASS) viene
// scritto nella cartella di lavoro del progetto.
//
// Catena video:  trim/concat dei segmenti → transizioni (xfade) → zoom (zoompan)
//                → adattamento al formato finale → schermata finale → immagini
//                → testi/sottotitoli (ass) → dissolvenze → [vout]
// Catena audio:  atrim/concat → acrossfade → miglioramento voce → schermata finale
//                → musica con ducking → dissolvenze → [aout]

import {
  computeLayout, mapRangeToOutput, mapStartToOutput, sourceToOutput,
  type Layout
} from '../timeline'
import type { Overlay, Range, Timeline } from '../types'
import {
  AssBuilder, addEndscreenText, addSubtitles, addTextOverlay,
  type MappedCue, type MappedOverlay
} from './ass'

export interface RenderSettings {
  width: number
  height: number
  fps: number
  fit: 'fit' | 'fill' | 'blur'
}

export type CompileMode = 'video' | 'audio' | 'audio-measure' | 'audio-original'

export interface CompileInput {
  timeline: Timeline
  render: RenderSettings
  mode: CompileMode
  /** Limita il rendering a un intervallo del video finale (anteprime). */
  range?: { fromOutput: number; seconds: number }
  /** Verifica l'esistenza di un file (immagini, musica). */
  exists: (p: string) => boolean
  /** Nome della sottocartella di `dir` che contiene i font (opzionale). */
  fontsSubdir?: string
  ffmpegMajor: number
}

export interface Compiled {
  args: string[]
  duration: number
  layout: Layout
  cues: { start: number; end: number; text: string }[]
  warnings: string[]
  graph: string
  /** File da scrivere nella cartella di lavoro di FFmpeg (grafo, sottotitoli). */
  files: { name: string; content: string }[]
}

const n3 = (v: number): string => (Math.round(v * 1000) / 1000).toString()

function hexColor(hex: string): string {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim())
  return '0x' + (m ? m[1] : '000000')
}

/** Restringe la timeline a una finestra del video finale. */
function restrictToRange(tl: Timeline, full: Layout, fromOut: number, seconds: number): { segments: Range[]; includeEnd: boolean; outA: number } {
  const total = full.totalDuration
  const outA = Math.max(0, Math.min(fromOut, Math.max(0, total - 0.5)))
  const outB = seconds > 0 ? Math.min(total, outA + seconds) : total
  const segs: Range[] = []
  for (const s of full.segments) {
    const a = Math.max(outA, s.outStart)
    const b = Math.min(outB, s.outEnd)
    if (b - a > 1e-3) segs.push({ start: s.start + (a - s.outStart), end: s.start + (b - s.outStart) })
  }
  const includeEnd = !!full.endscreen && outB > full.mainDuration
  if (!segs.length) {
    const last = full.segments[full.segments.length - 1]
    if (last) segs.push({ start: Math.max(last.start, last.end - 1), end: last.end })
  }
  void tl
  return { segments: segs, includeEnd, outA }
}

/** Espressione FFmpeg lineare a tratti per una sequenza di (t, valore). */
function piecewise(points: { t: number; v: number }[], tv: string): string {
  if (!points.length) return '0'
  if (points.length === 1) return n3(points[0].v)
  let expr = n3(points[points.length - 1].v)
  for (let i = points.length - 2; i >= 0; i--) {
    const a = points[i]
    const b = points[i + 1]
    const seg =
      Math.abs(b.v - a.v) < 1e-9
        ? n3(a.v)
        : `${n3(a.v)}+(${n3(b.v - a.v)})*(${tv}-${n3(a.t)})/${n3(Math.max(1e-3, b.t - a.t))}`
    expr = `if(lt(${tv},${n3(b.t)}),${seg},${expr})`
  }
  return `if(lt(${tv},${n3(points[0].t)}),${n3(points[0].v)},${expr})`
}

function envelope(a: number, b: number, ease: number, tv: string): string {
  if (ease <= 0.001) return `between(${tv},${n3(a)},${n3(b)})`
  const e = n3(Math.min(ease, (b - a) / 2))
  return `(min(1,max(0,(${tv}-${n3(a)})/${e}))*min(1,max(0,(${n3(b)}-${tv})/${e})))`
}

function mapOverlays(tl: Timeline, layout: Layout, warnings: string[], exists: (p: string) => boolean): MappedOverlay[] {
  const out: MappedOverlay[] = []
  for (const o of tl.overlays) {
    const s = mapStartToOutput(layout, o.start)
    if (s === null || s >= layout.mainDuration) continue
    const e = Math.min(layout.totalDuration, s + Math.max(0.1, o.duration))
    if (o.kind === 'image' && (!o.imagePath || !exists(o.imagePath))) {
      warnings.push(`Immagine mancante, elemento ignorato: ${o.imagePath ?? '(nessuna)'}`)
      continue
    }
    out.push({ ...o, outStart: s, outEnd: e })
  }
  return out
}

export function mapCues(tl: Timeline, layout: Layout): MappedCue[] {
  if (!tl.subtitles) return []
  const out: MappedCue[] = []
  for (const c of tl.subtitles.cues) {
    let words: MappedCue['words']
    if (c.words?.length) {
      words = []
      for (const w of c.words) {
        const r = mapRangeToOutput(layout, w)
        if (r) words.push({ start: r.start, end: Math.max(r.end, r.start + 0.05), text: w.text })
      }
      if (!words.length) continue
      out.push({ start: words[0].start, end: words[words.length - 1].end, text: words.map((w) => w.text).join(' '), words })
    } else {
      const r = mapRangeToOutput(layout, c)
      if (r) out.push({ start: r.start, end: r.end, text: c.text })
    }
  }
  // Durata minima e nessuna sovrapposizione.
  out.sort((a, b) => a.start - b.start)
  for (let i = 0; i < out.length; i++) {
    const next = out[i + 1]
    let end = Math.max(out[i].end + 0.15, out[i].start + 0.5)
    if (next) end = Math.min(end, next.start)
    out[i].end = Math.max(end, out[i].start + 0.05)
  }
  return out
}

export function buildRender(input: CompileInput): Compiled {
  const { render: rs, mode } = input
  let tl = input.timeline
  const warnings: string[] = []
  const files: { name: string; content: string }[] = []
  const fps = rs.fps
  const W = rs.width
  const H = rs.height
  const isVideo = mode === 'video'
  const withFx = mode !== 'audio-original'
  const withMusic = mode === 'video' || mode === 'audio'
  const endCfg = (mode === 'video' || mode === 'audio') && tl.endscreen ? tl.endscreen : undefined

  // Layout completo ed eventuale restrizione a una finestra (anteprima).
  let segments = tl.segments
  let includeEnd = !!endCfg
  let musicShift = 0
  if (input.range) {
    const full = computeLayout(tl.segments, fps, tl.transitions, endCfg)
    const r = restrictToRange(tl, full, input.range.fromOutput, input.range.seconds)
    segments = r.segments
    includeEnd = includeEnd && r.includeEnd
    musicShift = r.outA
  }
  const layout = computeLayout(segments, fps, withFx ? tl.transitions : undefined, includeEnd ? endCfg : undefined)
  if (!layout.segments.length) throw new Error('La timeline non contiene segmenti da esportare.')
  const total = layout.totalDuration

  // ------------------------------------------------------------ input
  const args: string[] = []
  const inputs: string[][] = []
  const src = tl.source
  const seek = input.range ? Math.max(0, layout.segments[0].start - 0.0) : 0
  const lastEnd = layout.segments[layout.segments.length - 1].end
  const srcArgs: string[] = []
  if (seek > 0) srcArgs.push('-ss', n3(seek))
  if (input.range) srcArgs.push('-t', n3(lastEnd - seek + 0.25))
  srcArgs.push('-i', src.path)
  inputs.push(srcArgs)
  let audioIn = '0:a'
  if (!src.hasAudio) {
    inputs.push(['-f', 'lavfi', '-t', n3(lastEnd - seek + 1), '-i', 'anullsrc=r=48000:cl=stereo'])
    audioIn = `${inputs.length - 1}:a`
  }
  if (isVideo && !src.hasVideo) throw new Error('Il file sorgente non contiene una traccia video.')

  const f: string[] = []
  const segs = layout.segments
  const N = segs.length
  const afmt = 'aformat=sample_fmts=fltp:sample_rates=48000:channel_layouts=stereo'

  // ------------------------------------------------------------ segmenti
  if (isVideo) {
    const head = `[0:v]fps=${fps},format=yuv420p,setsar=1`
    if (N === 1) f.push(`${head}[vs0]`)
    else f.push(`${head},split=${N}${segs.map((_, i) => `[vs${i}]`).join('')}`)
    segs.forEach((s, i) => f.push(`[vs${i}]trim=start=${n3(s.start - seek)}:end=${n3(s.end - seek)},setpts=PTS-STARTPTS[v${i}]`))
  }
  {
    const head = `[${audioIn}]${afmt}`
    if (N === 1) f.push(`${head}[as0]`)
    else f.push(`${head},asplit=${N}${segs.map((_, i) => `[as${i}]`).join('')}`)
    segs.forEach((s, i) => f.push(`[as${i}]atrim=start=${n3(s.start - seek)}:end=${n3(s.end - seek)},asetpts=PTS-STARTPTS[a${i}]`))
  }

  // ------------------------------------------------------------ clip e transizioni
  for (const c of layout.clips) {
    const m = c.segments.length
    if (isVideo) {
      if (m === 1) {
        f.push(`[v${c.segments[0]}]fps=${fps}[cv${c.index}]`)
        f.push(`[a${c.segments[0]}]anull[ca${c.index}]`)
      } else {
        f.push(`${c.segments.map((i) => `[v${i}][a${i}]`).join('')}concat=n=${m}:v=1:a=1[cc${c.index}][ca${c.index}]`)
        f.push(`[cc${c.index}]fps=${fps}[cv${c.index}]`)
      }
    } else if (m === 1) f.push(`[a${c.segments[0]}]anull[ca${c.index}]`)
    else f.push(`${c.segments.map((i) => `[a${i}]`).join('')}concat=n=${m}:v=0:a=1[ca${c.index}]`)
  }
  let vMain = isVideo ? 'cv0' : ''
  let aMain = 'ca0'
  const xType = tl.transitions?.type ?? 'fade'
  layout.transitions.forEach((t, k) => {
    const next = k + 1
    if (isVideo) {
      f.push(`[${vMain}][cv${next}]xfade=transition=${xType}:duration=${n3(t.duration)}:offset=${n3(t.offset)}[xv${next}]`)
      vMain = `xv${next}`
    }
    f.push(`[${aMain}][ca${next}]acrossfade=d=${n3(t.duration)}:c1=tri:c2=tri[xa${next}]`)
    aMain = `xa${next}`
  })

  // ------------------------------------------------------------ video
  let cur = vMain
  const ass = new AssBuilder({ w: W, h: H })
  const cues = mapCues(tl, layout)
  if (isVideo) {
    // Zoom / keyframe inquadratura (in tempo finale).
    const zooms = tl.zooms
      .map((z) => ({ z, r: mapRangeToOutput(layout, z) }))
      .filter((x): x is { z: typeof x.z; r: Range } => !!x.r && x.r.end - x.r.start > 0.05)
    const kfs = tl.zoomKeyframes
      .map((k) => ({ k, t: sourceToOutput(layout, k.t) }))
      .filter((x): x is { k: typeof x.k; t: number } => x.t !== null)
      .sort((a, b) => a.t - b.t)
    if (zooms.length || kfs.some((k) => Math.abs(k.k.scale - 1) > 1e-3)) {
      if (zooms.length > 1500) warnings.push(`Troppi zoom (${zooms.length}): verranno usati solo i primi 1500.`)
      const zl = zooms.slice(0, 1500)
      const tv = 'it'
      const kS = kfs.length ? piecewise(kfs.map((x) => ({ t: x.t, v: x.k.scale })), tv) : '1'
      const kX = kfs.length ? piecewise(kfs.map((x) => ({ t: x.t, v: x.k.x / 100 })), tv) : '0.5'
      const kY = kfs.length ? piecewise(kfs.map((x) => ({ t: x.t, v: x.k.y / 100 })), tv) : '0.5'
      const envs = zl.map((x) => envelope(x.r.start, x.r.end, x.z.ease, tv))
      const zExpr = `min(4,max(1,(${kS})${zl.map((x, i) => `+${n3(x.z.scale - 1)}*${envs[i]}`).join('')}))`
      const sumE = zl.length ? `min(1,${envs.join('+')})` : '0'
      const cx = zl.length
        ? `((${kX})*(1-${sumE})${zl.map((x, i) => `+${n3(x.z.x / 100)}*${envs[i]}`).join('')})`
        : `(${kX})`
      const cy = zl.length
        ? `((${kY})*(1-${sumE})${zl.map((x, i) => `+${n3(x.z.y / 100)}*${envs[i]}`).join('')})`
        : `(${kY})`
      const zw = src.width % 2 ? src.width - 1 : src.width
      const zh = src.height % 2 ? src.height - 1 : src.height
      const pre = tl.zoomSmooth && zw <= 1920 ? 'scale=iw*2:ih*2:flags=bicubic,' : ''
      f.push(
        `[${cur}]${pre}zoompan=z='${zExpr}':x='max(0,min(iw-iw/zoom,${cx}*iw-iw/zoom/2))':y='max(0,min(ih-ih/zoom,${cy}*ih-ih/zoom/2))':d=1:s=${zw}x${zh}:fps=${fps},fps=${fps},setsar=1[zm]`
      )
      cur = 'zm'
    }

    // Adattamento al formato finale.
    const srcAR = src.width / Math.max(1, src.height)
    const dstAR = W / H
    if (Math.abs(srcAR - dstAR) < 0.01) {
      f.push(`[${cur}]scale=${W}:${H}:flags=bicubic,setsar=1[cn]`)
    } else if (rs.fit === 'fill') {
      f.push(`[${cur}]scale=${W}:${H}:force_original_aspect_ratio=increase,crop=${W}:${H},setsar=1[cn]`)
    } else if (rs.fit === 'fit') {
      f.push(`[${cur}]scale=${W}:${H}:force_original_aspect_ratio=decrease,pad=${W}:${H}:(ow-iw)/2:(oh-ih)/2:color=black,setsar=1[cn]`)
    } else {
      const bw = Math.max(2, Math.round(W / 8 / 2) * 2)
      const bh = Math.max(2, Math.round(H / 8 / 2) * 2)
      f.push(`[${cur}]split=2[bgsrc][fgsrc]`)
      f.push(`[bgsrc]scale=${bw}:${bh}:force_original_aspect_ratio=increase,crop=${bw}:${bh},boxblur=8:2,scale=${W}:${H},setsar=1[bgb]`)
      f.push(`[fgsrc]scale=${W}:${H}:force_original_aspect_ratio=decrease,setsar=1[fgs]`)
      f.push(`[bgb][fgs]overlay=(W-w)/2:(H-h)/2,format=yuv420p,setsar=1[cn]`)
    }
    cur = 'cn'

    // Schermata finale.
    const es = layout.endscreen
    if (es && endCfg) {
      f.push(`color=c=${hexColor(endCfg.bgColor)}:s=${W}x${H}:r=${fps}:d=${n3(es.duration)},format=yuv420p,setsar=1[endbg]`)
      let endv = 'endbg'
      if (endCfg.bgImagePath && input.exists(endCfg.bgImagePath)) {
        inputs.push(['-loop', '1', '-framerate', String(fps), '-t', n3(es.duration), '-i', endCfg.bgImagePath])
        const ii = inputs.length - 1
        f.push(`[${ii}:v]scale=${W}:${H}:force_original_aspect_ratio=increase,crop=${W}:${H},format=yuv420p,setsar=1[endimg]`)
        f.push(`[endbg][endimg]overlay=0:0:eof_action=pass[endbgi]`)
        endv = 'endbgi'
      } else if (endCfg.bgImagePath) warnings.push('Immagine di sfondo della schermata finale non trovata.')
      if (es.fade > 0.01) f.push(`[${cur}][${endv}]xfade=transition=fade:duration=${n3(es.fade)}:offset=${n3(es.start)}[withend]`)
      else f.push(`[${cur}][${endv}]concat=n=2:v=1:a=0[withend]`)
      cur = 'withend'
      const hasLogo = !!endCfg.logoPath && input.exists(endCfg.logoPath)
      addEndscreenText(ass, endCfg, es.start + es.fade * 0.5, total, hasLogo)
      if (hasLogo) {
        tl = {
          ...tl,
          overlays: [
            ...tl.overlays,
            {
              id: '__logo', kind: 'image', text: '', imagePath: endCfg.logoPath, start: -1, duration: 0,
              preset: 'minimal', x: 50, y: 24, size: endCfg.logoSize, color: '#FFFFFF', animationIn: 'fade',
              animationOut: 'none', animDuration: 0.5, keyframes: []
            } as Overlay
          ]
        }
      }
    }

    // Elementi grafici.
    const mapped = mapOverlays({ ...tl, overlays: tl.overlays.filter((o) => o.id !== '__logo') }, layout, warnings, input.exists)
    const logo = tl.overlays.find((o) => o.id === '__logo')
    if (logo && layout.endscreen) mapped.push({ ...logo, outStart: layout.endscreen.start + layout.endscreen.fade * 0.5, outEnd: total })
    let imgN = 0
    for (const o of mapped) {
      if (o.kind === 'text') {
        addTextOverlay(ass, o, endCfg?.accentColor)
        continue
      }
      const dur = o.outEnd - o.outStart
      inputs.push(['-loop', '1', '-framerate', String(fps), '-t', n3(dur), '-i', o.imagePath!])
      const ii = inputs.length - 1
      const wpx = Math.max(2, Math.round(((o.size > 0 ? o.size : 30) / 100) * W / 2) * 2)
      const ad = Math.max(0, Math.min(o.animDuration, dur / 2))
      const fades: string[] = []
      if (ad > 0 && o.animationIn !== 'none') fades.push(`fade=t=in:st=0:d=${n3(ad)}:alpha=1`)
      if (ad > 0 && o.animationOut !== 'none') fades.push(`fade=t=out:st=${n3(dur - ad)}:d=${n3(ad)}:alpha=1`)
      f.push(`[${ii}:v]scale=${wpx}:-2,format=rgba${fades.length ? ',' + fades.join(',') : ''},setpts=PTS-STARTPTS+${n3(o.outStart)}/TB[img${imgN}]`)
      // Posizione: keyframe oppure animazione di scorrimento.
      const tl0 = `(t-${n3(o.outStart)})`
      let xe = `${n3(o.x / 100)}`
      let ye = `${n3(o.y / 100)}`
      if (o.keyframes?.length) {
        const k = [...o.keyframes].sort((a, b) => a.t - b.t)
        xe = piecewise(k.map((p) => ({ t: p.t, v: p.x / 100 })), tl0)
        ye = piecewise(k.map((p) => ({ t: p.t, v: p.y / 100 })), tl0)
      } else if (ad > 0) {
        if (o.animationIn === 'slide-up') ye = `${n3(o.y / 100)}+0.05*max(0,1-${tl0}/${n3(ad)})`
        if (o.animationIn === 'slide-left') xe = `${n3(o.x / 100)}+0.08*max(0,1-${tl0}/${n3(ad)})`
      }
      f.push(
        `[${cur}][img${imgN}]overlay=x='main_w*(${xe})-overlay_w/2':y='main_h*(${ye})-overlay_h/2':eval=frame:eof_action=pass:enable='between(t,${n3(o.outStart)},${n3(o.outEnd)})'[ov${imgN}]`
      )
      cur = `ov${imgN}`
      imgN++
    }

    // Sottotitoli incisi.
    if (tl.subtitles?.burn && cues.length) addSubtitles(ass, cues, tl.subtitles.style, tl.subtitles.maxChars)
    if (ass.count > 0) {
      files.push({ name: 'subs.ass', content: ass.toString() })
      const fontOpt = input.fontsSubdir ? `:fontsdir=${input.fontsSubdir}` : ''
      f.push(`[${cur}]ass=filename=subs.ass${fontOpt}[txt]`)
      cur = 'txt'
    }
  }

  // ------------------------------------------------------------ audio
  let aCur = aMain
  const fx = withFx ? tl.audio : undefined
  if (fx) {
    const chain: string[] = []
    if (fx.highpass > 0) chain.push(`highpass=f=${fx.highpass}`)
    const nr = { off: 0, light: 6, medium: 12, strong: 20 }[fx.denoise]
    if (nr) chain.push(`afftdn=nr=${nr}:nf=-45:tn=1`)
    if (fx.deesser) chain.push('deesser=i=0.4:m=0.5:f=0.5')
    if (fx.compressor) chain.push('acompressor=threshold=0.089:ratio=3:attack=15:release=200:makeup=1.6')
    if (fx.voiceGainDb) chain.push(`volume=${fx.voiceGainDb}dB`)
    if (mode === 'audio-measure') {
      chain.push(`loudnorm=I=${fx.targetLufs}:TP=${fx.truePeak}:LRA=11:print_format=json`)
    } else if (fx.normalize) {
      // Seconda passata: valori misurati dal nodo audio → normalizzazione lineare precisa.
      const m = fx.measured
      const meas = m
        ? `:measured_I=${m.input_i}:measured_TP=${m.input_tp}:measured_LRA=${m.input_lra}:measured_thresh=${m.input_thresh}:offset=${m.target_offset}:linear=true`
        : ''
      chain.push(`loudnorm=I=${fx.targetLufs}:TP=${fx.truePeak}:LRA=11${meas}`)
      chain.push('aresample=48000')
    }
    if (chain.length) {
      f.push(`[${aCur}]${chain.join(',')},${afmt}[voice]`)
      aCur = 'voice'
    }
  }

  if (mode !== 'audio-measure' && mode !== 'audio-original') {
    const es = layout.endscreen
    if (es) {
      f.push(`aevalsrc=0|0:s=48000:d=${n3(es.duration)},${afmt}[endsil]`)
      if (es.fade > 0.01) f.push(`[${aCur}][endsil]acrossfade=d=${n3(es.fade)}:c1=tri:c2=tri[voicefull]`)
      else f.push(`[${aCur}][endsil]concat=n=2:v=0:a=1[voicefull]`)
      aCur = 'voicefull'
    }
    const mu = withMusic ? tl.music : undefined
    if (mu) {
      if (!input.exists(mu.path)) warnings.push(`Brano musicale non trovato: ${mu.path}`)
      else {
        const len = mu.coverEndscreen || !layout.endscreen ? total : layout.mainDuration
        const off = Math.max(0, mu.startOffset + musicShift)
        const mi: string[] = []
        if (mu.loop) mi.push('-stream_loop', '-1')
        if (off > 0) mi.push('-ss', n3(off))
        mi.push('-i', mu.path)
        inputs.push(mi)
        const ii = inputs.length - 1
        const fo = Math.min(mu.fadeOut, len / 2)
        const fi = input.range && musicShift > 0 ? 0 : Math.min(mu.fadeIn, len / 2)
        const mchain = [
          afmt,
          `atrim=0:${n3(len)}`,
          'asetpts=PTS-STARTPTS',
          `volume=${mu.volumeDb}dB`,
          fi > 0 ? `afade=t=in:st=0:d=${n3(fi)}` : '',
          fo > 0 ? `afade=t=out:st=${n3(Math.max(0, len - fo))}:d=${n3(fo)}` : ''
        ].filter(Boolean)
        f.push(`[${ii}:a]${mchain.join(',')}[mus]`)
        const ratio = { off: 0, light: 3, medium: 6, strong: 12 }[mu.ducking]
        if (ratio) {
          f.push(`[${aCur}]asplit=2[vmain][vsc]`)
          f.push(`[mus][vsc]sidechaincompress=threshold=0.03:ratio=${ratio}:attack=20:release=400:makeup=1[mduck]`)
          f.push(`[vmain][mduck]amix=inputs=2:duration=first:dropout_transition=0:normalize=0[mixed]`)
        } else {
          f.push(`[${aCur}][mus]amix=inputs=2:duration=first:dropout_transition=0:normalize=0[mixed]`)
        }
        aCur = 'mixed'
      }
    }
  }

  // ------------------------------------------------------------ finale
  const fin = tl.transitions && withFx && !input.range ? tl.transitions : undefined
  const fiDur = fin ? Math.min(fin.fadeInStart, total / 3) : 0
  const foDur = fin ? Math.min(fin.fadeOutEnd, total / 3) : 0
  if (isVideo) {
    const vf: string[] = []
    if (fiDur > 0) vf.push(`fade=t=in:st=0:d=${n3(fiDur)}`)
    if (foDur > 0) vf.push(`fade=t=out:st=${n3(total - foDur)}:d=${n3(foDur)}`)
    vf.push('format=yuv420p')
    f.push(`[${cur}]${vf.join(',')}[vout]`)
  }
  const af: string[] = []
  if (mode !== 'audio-measure') {
    if (fiDur > 0) af.push(`afade=t=in:st=0:d=${n3(fiDur)}`)
    if (foDur > 0) af.push(`afade=t=out:st=${n3(total - foDur)}:d=${n3(foDur)}`)
    if (tl.music && withMusic) af.push('alimiter=limit=0.97:level=0')
  }
  af.push(afmt)
  f.push(`[${aCur}]${af.join(',')}[aout]`)

  // ------------------------------------------------------------ argomenti
  const graph = f.join(';\n')
  files.push({ name: 'graph.txt', content: graph })
  for (const i of inputs) args.push(...i)
  if (input.ffmpegMajor >= 7) args.push('-/filter_complex', 'graph.txt')
  else args.push('-filter_complex_script', 'graph.txt')
  if (isVideo) args.push('-map', '[vout]')
  args.push('-map', '[aout]')
  args.push('-t', n3(total))

  return {
    args,
    duration: total,
    layout,
    cues: cues.map((c) => ({ start: c.start, end: c.end, text: c.text })),
    warnings,
    graph,
    files
  }
}
