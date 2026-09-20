import './src/env.js';
import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize, resolve } from 'node:path';
import { db, getImpostazioni, setImpostazioni } from './src/db.js';
import * as M from './src/model.js';
import { eseguiJobPromemoria, inviaPromemoria, componiEmail } from './src/promemoria.js';
import { calcolaFine, diffGiorni, oggi } from './src/dates.js';
import { eseguiBackup } from './src/backup.js';
import { cookieSessione, paginaLogin, passwordAttiva, passwordCorretta, richiestaAutorizzata } from './src/auth.js';

const PORT = Number(process.env.PORT) || 4000;
// In locale si ascolta solo su 127.0.0.1; in cloud si imposta HOST=0.0.0.0.
const HOST = process.env.HOST || '127.0.0.1';
const PUBLIC = resolve(process.cwd(), 'public');
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.png': 'image/png', '.webmanifest': 'application/manifest+json; charset=utf-8' };

const json = (res, dati, status = 200) => {
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(dati));
};

const leggiCorpo = (req) => new Promise((ok, ko) => {
  let dati = '';
  req.on('data', (c) => { dati += c; if (dati.length > 1e6) { ko(new Error('Richiesta troppo grande')); req.destroy(); } });
  req.on('end', () => { try { ok(dati ? JSON.parse(dati) : {}); } catch { ko(new Error('JSON non valido')); } });
  req.on('error', ko);
});

function csvContabilita(dati) {
  const righe = [['Data', 'Cliente', 'Causale', 'Metodo', 'Importo']];
  for (const m of dati.movimenti) {
    righe.push([m.data_pagamento, `${m.nome} ${m.cognome}`,
      m.num_rate > 1 ? `Rata ${m.numero} di ${m.num_rate}` : 'Saldo unico', m.metodo || '', m.importo.toFixed(2)]);
  }
  return righe.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(';')).join('\n');
}

async function api(req, res, url) {
  const parti = url.pathname.replace(/^\/api\/?/, '').split('/').filter(Boolean);
  const [risorsa, id, azione] = parti;
  const metodo = req.method;
  const corpo = ['POST', 'PUT', 'PATCH'].includes(metodo) ? await leggiCorpo(req) : {};

  if (risorsa === 'dashboard' && metodo === 'GET') return json(res, M.dashboard());

  if (risorsa === 'clienti') {
    if (metodo === 'GET' && !id) return json(res, M.listaClienti());
    if (metodo === 'GET') {
      const c = M.getCliente(Number(id));
      return c ? json(res, c) : json(res, { errore: 'Cliente non trovato' }, 404);
    }
    if (metodo === 'POST') return json(res, M.creaCliente(corpo), 201);
    if (metodo === 'PUT') return json(res, M.aggiornaCliente(Number(id), corpo));
    if (metodo === 'DELETE') { M.eliminaCliente(Number(id)); return json(res, { ok: true }); }
  }

  if (risorsa === 'percorsi') {
    if (metodo === 'POST' && !id) return json(res, M.creaPercorso(corpo), 201);
    if (metodo === 'GET' && id) {
      const p = M.getPercorso(Number(id));
      return p ? json(res, p) : json(res, { errore: 'Percorso non trovato' }, 404);
    }
    if (metodo === 'PUT' && id) return json(res, M.aggiornaPercorso(Number(id), corpo));
    if (metodo === 'DELETE' && id) { M.eliminaPercorso(Number(id)); return json(res, { ok: true }); }
    if (metodo === 'POST' && azione === 'promemoria') return json(res, await inviaPromemoria(Number(id), { forza: corpo.forza === true }));
    if (metodo === 'GET' && azione === 'anteprima-email') {
      const p = db.prepare('SELECT p.*, c.nome, c.cognome, c.email FROM percorsi p JOIN clienti c ON c.id = p.cliente_id WHERE p.id = ?').get(Number(id));
      return p ? json(res, { ...componiEmail(p), destinatario: p.email }) : json(res, { errore: 'Percorso non trovato' }, 404);
    }
    if (metodo === 'POST' && azione === 'rinnova') {
      const vecchio = M.getPercorso(Number(id));
      if (!vecchio) return json(res, { errore: 'Percorso non trovato' }, 404);
      const nuovo = M.creaPercorso({ ...corpo, cliente_id: vecchio.cliente_id, rinnovo_di: vecchio.id });
      M.aggiornaPercorso(vecchio.id, { stato: 'rinnovato' });
      return json(res, nuovo, 201);
    }
  }

  if (risorsa === 'rate' && metodo === 'PUT' && id) return json(res, M.pagaRata(Number(id), corpo));

  if (risorsa === 'rinnovi' && metodo === 'GET') {
    const giorni = Number(url.searchParams.get('giorni')) || Number(getImpostazioni().giorni_preavviso) || 30;
    return json(res, {
      giorni,
      percorsi: M.inScadenza(giorni),
      log: db.prepare('SELECT * FROM email_log ORDER BY id DESC LIMIT 30').all(),
    });
  }

  if (risorsa === 'contabilita' && metodo === 'GET') {
    const anno = Number(url.searchParams.get('anno')) || Number(oggi().slice(0, 4));
    const dati = M.contabilita(anno);
    if (url.searchParams.get('formato') === 'csv') {
      res.writeHead(200, { 'content-type': 'text/csv; charset=utf-8', 'content-disposition': `attachment; filename="contabilita-${anno}.csv"` });
      return res.end(csvContabilita(dati));
    }
    return json(res, dati);
  }

  if (risorsa === 'impostazioni') {
    if (metodo === 'GET') return json(res, getImpostazioni());
    if (metodo === 'PUT') return json(res, setImpostazioni(corpo));
  }

  if (risorsa === 'job' && azione === undefined && id === 'promemoria' && metodo === 'POST') {
    return json(res, await eseguiJobPromemoria());
  }

  if (risorsa === 'anteprima-percorso' && metodo === 'POST') {
    const inizio = corpo.data_inizio || oggi();
    const fine = calcolaFine(inizio, corpo.tipo, corpo.durata_giorni);
    const durata = diffGiorni(inizio, fine);
    return json(res, {
      data_inizio: inizio,
      data_fine: fine,
      durata_giorni: durata,
      rate: M.pianoRate({
        importo_totale: Number(corpo.importo_totale) || 0,
        num_rate: corpo.num_rate,
        data_inizio: inizio,
        durata_giorni: durata,
        data_pagamento: corpo.data_pagamento,
      }),
    });
  }

  return json(res, { errore: 'Endpoint non trovato' }, 404);
}

async function statico(req, res, url) {
  const richiesto = url.pathname === '/' ? '/index.html' : url.pathname;
  const file = join(PUBLIC, normalize(richiesto).replace(/^(\.\.[/\\])+/, ''));
  if (!file.startsWith(PUBLIC)) return json(res, { errore: 'Percorso non valido' }, 403);
  try {
    const contenuto = await readFile(file);
    res.writeHead(200, { 'content-type': MIME[extname(file)] || 'application/octet-stream' });
    res.end(contenuto);
  } catch {
    // Rotte lato client: si ricade sempre sulla pagina principale.
    const html = await readFile(join(PUBLIC, 'index.html'));
    res.writeHead(200, { 'content-type': MIME['.html'] });
    res.end(html);
  }
}

async function login(req, res) {
  let dati = '';
  for await (const pezzo of req) dati += pezzo;
  const password = new URLSearchParams(dati).get('password');
  if (!passwordCorretta(password)) {
    res.writeHead(401, { 'content-type': 'text/html; charset=utf-8' });
    return res.end(paginaLogin('Password errata.'));
  }
  res.writeHead(303, { location: '/', 'set-cookie': cookieSessione() });
  res.end();
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  try {
    if (passwordAttiva() && url.pathname === '/login') {
      if (req.method === 'POST') return await login(req, res);
      res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
      return res.end(paginaLogin());
    }
    const PUBBLICI = ['/styles.css', '/sw.js', '/manifest.webmanifest'];
    if (!richiestaAutorizzata(req) && !PUBBLICI.includes(url.pathname) && !url.pathname.startsWith('/icone/')) {
      if (url.pathname.startsWith('/api')) return json(res, { errore: 'Non autorizzato' }, 401);
      res.writeHead(302, { location: '/login' });
      return res.end();
    }
    if (url.pathname.startsWith('/api')) await api(req, res, url);
    else await statico(req, res, url);
  } catch (err) {
    json(res, { errore: err.message }, 400);
  }
});

// Promemoria e backup: al primo avvio e poi ogni 24 ore.
const ORE_24 = 24 * 60 * 60 * 1000;
const lavoriGiornalieri = () => {
  eseguiJobPromemoria()
    .then((r) => r.inviati && console.log(`[promemoria] ${r.inviati} email elaborate`))
    .catch((e) => console.error('[promemoria]', e.message));
  try {
    const b = eseguiBackup();
    console.log(`[backup] ${b.file}`);
  } catch (e) {
    console.error('[backup]', e.message);
  }
};

server.listen(PORT, HOST, () => {
  console.log(`FitManager e' in ascolto su http://${HOST === '0.0.0.0' ? 'localhost' : HOST}:${PORT}`);
  if (passwordAttiva()) console.log('Accesso protetto da password.');
  lavoriGiornalieri();
  setInterval(lavoriGiornalieri, ORE_24);
});
