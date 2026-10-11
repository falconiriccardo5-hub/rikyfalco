// Esecuzione di processi esterni (FFmpeg, whisper…) con avanzamento reale,
// annullamento tramite AbortSignal e messaggi d'errore leggibili.

import { spawn } from 'child_process'

export class CancelledError extends Error {
  constructor() {
    super('Operazione annullata')
    this.name = 'CancelledError'
  }
}

export interface ProcOptions {
  cwd?: string
  signal?: AbortSignal
  onStdout?: (chunk: string) => void
  onStderr?: (chunk: string) => void
  onStdoutData?: (chunk: Buffer) => void
  /** Numero di righe finali di stderr da conservare per i messaggi d'errore. */
  keepStderrLines?: number
  env?: NodeJS.ProcessEnv
  /** Testo da inviare sullo standard input (UTF-8). */
  input?: string
}

export interface ProcResult {
  code: number
  stdout: string
  stderr: string
}

export function runProcess(cmd: string, args: string[], o: ProcOptions = {}): Promise<ProcResult> {
  return new Promise((resolve, reject) => {
    if (o.signal?.aborted) return reject(new CancelledError())
    const child = spawn(cmd, args, {
      cwd: o.cwd,
      env: o.env ?? process.env,
      windowsHide: true,
      stdio: [o.input !== undefined ? 'pipe' : 'ignore', 'pipe', 'pipe']
    })
    if (o.input !== undefined && child.stdin) {
      child.stdin.on('error', () => undefined)
      child.stdin.end(o.input, 'utf8')
    }
    let stdout = ''
    const errLines: string[] = []
    let errBuf = ''
    const keep = o.keepStderrLines ?? 400
    let killed = false
    const onAbort = (): void => {
      killed = true
      child.kill('SIGKILL')
    }
    o.signal?.addEventListener('abort', onAbort, { once: true })

    child.stdout!.on('data', (d: Buffer) => {
      if (o.onStdoutData) o.onStdoutData(d)
      else {
        const s = d.toString('utf8')
        if (stdout.length < 50_000_000) stdout += s
        o.onStdout?.(s)
      }
    })
    child.stderr!.on('data', (d: Buffer) => {
      const s = d.toString('utf8')
      o.onStderr?.(s)
      errBuf += s
      const parts = errBuf.split(/\r?\n|\r/)
      errBuf = parts.pop() ?? ''
      for (const p of parts) {
        errLines.push(p)
        if (errLines.length > keep) errLines.shift()
      }
    })
    child.on('error', (err: NodeJS.ErrnoException) => {
      o.signal?.removeEventListener('abort', onAbort)
      if (err.code === 'ENOENT') reject(new Error(`Programma non trovato: ${cmd}`))
      else reject(err)
    })
    child.on('close', (code) => {
      o.signal?.removeEventListener('abort', onAbort)
      if (errBuf) errLines.push(errBuf)
      if (killed) return reject(new CancelledError())
      resolve({ code: code ?? -1, stdout, stderr: errLines.join('\n') })
    })
  })
}

/** Estrae dalle ultime righe di stderr di FFmpeg il messaggio più significativo. */
export function ffmpegErrorSummary(stderr: string): string {
  const lines = stderr
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
    .filter((l) => !/^(frame=|size=|video:|\[out#|Press \[q\]|Stream #|Input #|Output #|Duration:|Metadata:)/.test(l))
    .filter((l) => !/Terminating thread|Task finished with error|Conversion failed|Error reinitializing|Nothing was written/.test(l))
  const important = lines.filter((l) =>
    /error|invalid|no such|not found|cannot|unable|failed|unknown|does not|not supported|permission|denied/i.test(l)
  )
  const pick = (important.length ? important : lines).slice(0, 3)
  return pick.join(' | ').slice(0, 800) || 'Errore sconosciuto di FFmpeg'
}
