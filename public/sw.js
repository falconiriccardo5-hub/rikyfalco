// Service worker: tiene in cache solo l'interfaccia, mai i dati.
// Cosi' l'app si apre subito e, se il Mac non e' raggiungibile, mostra
// una schermata chiara invece dell'errore di Safari.
const VERSIONE = 'fitmanager-v1';
const GUSCIO = ['/', '/styles.css', '/app.js', '/manifest.webmanifest', '/icone/icona-192.png'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSIONE).then((c) => c.addAll(GUSCIO)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys()
    .then((chiavi) => Promise.all(chiavi.filter((k) => k !== VERSIONE).map((k) => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== location.origin) return;
  // I dati passano sempre dalla rete: niente contabilita' vecchia in cache.
  if (url.pathname.startsWith('/api') || url.pathname === '/login') return;

  e.respondWith(
    fetch(e.request)
      .then((risposta) => {
        // La pagina di login non va messa in cache al posto dell'app.
        if (risposta.ok && risposta.type === 'basic' && !risposta.redirected) {
          const copia = risposta.clone();
          caches.open(VERSIONE).then((c) => c.put(e.request, copia));
        }
        return risposta;
      })
      .catch(async () => (await caches.match(e.request)) || (await caches.match('/')) || offline())
  );
});

const offline = () => new Response(
  `<!doctype html><html lang="it"><head><meta charset="utf-8">
   <meta name="viewport" content="width=device-width, initial-scale=1">
   <title>FitManager non raggiungibile</title>
   <style>body{margin:0;min-height:100vh;display:grid;place-items:center;background:#06080F;color:#F2F5FF;
   font-family:system-ui,sans-serif;text-align:center;padding:24px}p{color:#98A2BD;line-height:1.6;max-width:320px}</style>
   </head><body><div><h1>FitManager non raggiungibile</h1>
   <p>Il Mac su cui gira il gestionale non risponde. Controlla che sia acceso e connesso, poi riprova.</p>
   </div></body></html>`,
  { headers: { 'content-type': 'text/html; charset=utf-8' } }
);
