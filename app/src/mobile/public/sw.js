// Service worker di FlowCut: rende la web app utilizzabile offline.
// - pagina: rete prima, cache se offline
// - risorse statiche (JS, motore video, font): cache prima
// - libreria e modelli di trascrizione (CDN, Hugging Face): cache dopo il primo uso
// - API del PC: mai in cache
const CACHE = 'flowcut-v1'

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(['./', 'manifest.webmanifest', 'icons/icon-180.png', 'icons/icon-192.png'])).then(() => self.skipWaiting()))
})

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim())
  )
})

const CROSS_ORIGIN_CACHE = /^https:\/\/(cdn\.jsdelivr\.net|huggingface\.co|cdn-lfs[\w.-]*\.huggingface\.co|[\w-]+\.hf\.co)\//

self.addEventListener('fetch', (e) => {
  const req = e.request
  if (req.method !== 'GET') return
  const url = new URL(req.url)
  if (url.pathname.includes('/api/')) return
  const sameOrigin = url.origin === self.location.origin
  if (!sameOrigin && !CROSS_ORIGIN_CACHE.test(req.url)) return

  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone()
          caches.open(CACHE).then((c) => c.put('./', copy))
          return res
        })
        .catch(() => caches.match('./'))
    )
    return
  }
  e.respondWith(
    caches.match(req).then(
      (hit) =>
        hit ||
        fetch(req).then((res) => {
          if (res.ok && (res.type === 'basic' || res.type === 'cors')) {
            const copy = res.clone()
            caches.open(CACHE).then((c) => c.put(req, copy))
          }
          return res
        })
    )
  )
})
