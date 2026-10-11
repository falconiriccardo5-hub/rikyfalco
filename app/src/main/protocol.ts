// Protocollo media:// per riprodurre file locali nell'interfaccia con supporto
// alle richieste Range (necessarie per lo scorrimento del video).

import fs from 'fs'
import path from 'path'
import { Readable } from 'stream'
import { protocol } from 'electron'

const MIME: Record<string, string> = {
  mp4: 'video/mp4', m4v: 'video/mp4', mov: 'video/quicktime', webm: 'video/webm', mkv: 'video/x-matroska',
  mp3: 'audio/mpeg', m4a: 'audio/mp4', aac: 'audio/aac', wav: 'audio/wav', ogg: 'audio/ogg', opus: 'audio/ogg', flac: 'audio/flac',
  png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', webp: 'image/webp', gif: 'image/gif', bmp: 'image/bmp',
  json: 'application/json', srt: 'text/plain', txt: 'text/plain'
}

export function registerMediaScheme(): void {
  protocol.registerSchemesAsPrivileged([
    { scheme: 'media', privileges: { standard: true, secure: true, supportFetchAPI: true, stream: true, bypassCSP: true } }
  ])
}

export function handleMediaProtocol(): void {
  protocol.handle('media', async (req) => {
    const url = new URL(req.url)
    const file = decodeURIComponent(url.pathname.replace(/^\//, ''))
    const ext = path.extname(file).slice(1).toLowerCase()
    const type = MIME[ext]
    if (!type) return new Response('Tipo non consentito', { status: 403 })
    let stat: fs.Stats
    try {
      stat = fs.statSync(file)
    } catch {
      return new Response('File non trovato', { status: 404 })
    }
    const range = req.headers.get('range')
    if (range) {
      const m = /bytes=(\d*)-(\d*)/.exec(range)
      let start = m && m[1] ? Number(m[1]) : 0
      let end = m && m[2] ? Number(m[2]) : stat.size - 1
      if (m && !m[1] && m[2]) {
        start = Math.max(0, stat.size - Number(m[2]))
        end = stat.size - 1
      }
      end = Math.min(end, stat.size - 1)
      if (start > end || start >= stat.size) {
        return new Response(null, { status: 416, headers: { 'Content-Range': `bytes */${stat.size}` } })
      }
      const stream = Readable.toWeb(fs.createReadStream(file, { start, end })) as ReadableStream
      return new Response(stream, {
        status: 206,
        headers: {
          'Content-Type': type,
          'Content-Length': String(end - start + 1),
          'Content-Range': `bytes ${start}-${end}/${stat.size}`,
          'Accept-Ranges': 'bytes',
          'Cache-Control': 'no-cache'
        }
      })
    }
    const stream = Readable.toWeb(fs.createReadStream(file)) as ReadableStream
    return new Response(stream, {
      status: 200,
      headers: { 'Content-Type': type, 'Content-Length': String(stat.size), 'Accept-Ranges': 'bytes', 'Cache-Control': 'no-cache' }
    })
  })
}
