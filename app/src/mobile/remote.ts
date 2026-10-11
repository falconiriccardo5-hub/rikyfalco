// Client delle API del PC (stessa origine: la web app è servita da FlowCut sul PC).

import type { RemoteJob } from '@shared/types'

const KEY = 'flowcut.token'

export function getToken(): string {
  try {
    return localStorage.getItem(KEY) ?? ''
  } catch {
    return ''
  }
}

function setToken(t: string): void {
  try {
    if (t) localStorage.setItem(KEY, t)
    else localStorage.removeItem(KEY)
  } catch {
    /* modalità privata */
  }
}

export interface PcInfo {
  templates: { id: string; name: string }[]
  resolutions: { value: string; label: string }[]
  languages: { value: string; label: string }[]
  defaultLanguage: string
  whisper: boolean
  host: string
}

async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(path, { ...init, headers: { ...(init.headers ?? {}), Authorization: `Bearer ${getToken()}` } })
  const body = (await res.json().catch(() => ({}))) as T & { error?: string }
  if (res.status === 401) setToken('')
  if (!res.ok) throw new Error(body.error ?? `Errore ${res.status}`)
  return body
}

/** Verifica se questa pagina è servita da FlowCut sul PC. */
export async function detectPc(): Promise<{ available: boolean; authorized: boolean }> {
  try {
    const ctrl = new AbortController()
    const t = setTimeout(() => ctrl.abort(), 2500)
    const res = await fetch('api/ping', { headers: { Authorization: `Bearer ${getToken()}` }, signal: ctrl.signal, cache: 'no-store' })
    clearTimeout(t)
    if (!res.ok) return { available: false, authorized: false }
    const j = (await res.json()) as { app?: string; authorized?: boolean }
    return { available: j.app === 'FlowCut', authorized: !!j.authorized }
  } catch {
    return { available: false, authorized: false }
  }
}

export async function pair(code: string): Promise<void> {
  const res = await fetch('api/pair', { method: 'POST', body: JSON.stringify({ code, device: navigator.userAgent.slice(0, 80) }) })
  const j = (await res.json().catch(() => ({}))) as { token?: string; error?: string }
  if (!res.ok || !j.token) throw new Error(j.error ?? 'Abbinamento non riuscito')
  setToken(j.token)
}

export function unpair(): void {
  setToken('')
}

export const getInfo = (): Promise<PcInfo> => api<PcInfo>('api/info')
export const listJobs = async (): Promise<RemoteJob[]> => (await api<{ jobs: RemoteJob[] }>('api/jobs')).jobs
export const cancelJob = (id: string): Promise<unknown> => api(`api/jobs/${id}/cancel`, { method: 'POST' })

export function resultUrl(id: string, download = false): string {
  return `api/jobs/${id}/result?token=${encodeURIComponent(getToken())}${download ? '&download' : ''}`
}

/** Carica il video con avanzamento reale (XMLHttpRequest espone l'upload progress). */
export function upload(file: File, onProgress: (f: number) => void): { promise: Promise<string>; abort: () => void } {
  const xhr = new XMLHttpRequest()
  const promise = new Promise<string>((resolve, reject) => {
    xhr.open('PUT', `api/upload?name=${encodeURIComponent(file.name)}`)
    xhr.setRequestHeader('Authorization', `Bearer ${getToken()}`)
    xhr.upload.onprogress = (e) => e.lengthComputable && onProgress(e.loaded / e.total)
    xhr.onload = () => {
      try {
        const j = JSON.parse(xhr.responseText) as { uploadId?: string; error?: string }
        if (xhr.status === 200 && j.uploadId) resolve(j.uploadId)
        else reject(new Error(j.error ?? `Errore ${xhr.status}`))
      } catch {
        reject(new Error(`Errore ${xhr.status}`))
      }
    }
    xhr.onerror = () => reject(new Error('Connessione con il PC interrotta.'))
    xhr.onabort = () => reject(new Error('Caricamento annullato.'))
    xhr.send(file)
  })
  return { promise, abort: () => xhr.abort() }
}

export async function createJob(p: { uploadId: string; name: string; templateId: string; language: string; resolution: string; title: string }): Promise<RemoteJob> {
  return (await api<{ job: RemoteJob }>('api/jobs', { method: 'POST', body: JSON.stringify(p) })).job
}

/** Salva un video nel rullino tramite il foglio di condivisione di iOS (o lo scarica). */
export async function saveVideo(blob: Blob, name: string): Promise<'shared' | 'downloaded'> {
  const file = new File([blob], name, { type: 'video/mp4' })
  const nav = navigator as Navigator & { canShare?: (d: { files: File[] }) => boolean }
  if (nav.canShare?.({ files: [file] })) {
    await navigator.share({ files: [file], title: name })
    return 'shared'
  }
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = name
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 60000)
  return 'downloaded'
}
