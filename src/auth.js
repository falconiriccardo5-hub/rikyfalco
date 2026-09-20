// Protezione con password, attiva solo se APP_PASSWORD e' impostata.
// Serve quando l'app viene pubblicata su internet: in locale si lascia vuota.
import { createHmac, timingSafeEqual } from 'node:crypto';

const SEGRETO = process.env.APP_SECRET || 'fitmanager-locale';
export const passwordAttiva = () => Boolean(process.env.APP_PASSWORD);

const tokenAtteso = () => createHmac('sha256', SEGRETO).update(String(process.env.APP_PASSWORD)).digest('hex');

const confrontaSicuro = (a, b) => {
  const x = Buffer.from(String(a));
  const y = Buffer.from(String(b));
  return x.length === y.length && timingSafeEqual(x, y);
};

export const passwordCorretta = (inserita) => confrontaSicuro(inserita ?? '', process.env.APP_PASSWORD);
export const tokenValido = (token) => Boolean(token) && confrontaSicuro(token, tokenAtteso());

export function cookieSessione() {
  // 30 giorni: l'app resta aperta senza richiedere la password a ogni accesso.
  return `fm_sessione=${tokenAtteso()}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${60 * 60 * 24 * 30}`;
}

export function leggiCookie(intestazione, nome) {
  return (intestazione || '').split(';')
    .map((c) => c.trim().split('='))
    .find(([k]) => k === nome)?.[1];
}

export const richiestaAutorizzata = (req) =>
  !passwordAttiva() || tokenValido(leggiCookie(req.headers.cookie, 'fm_sessione'));

export const paginaLogin = (errore = '') => `<!doctype html>
<html lang="it"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>FitManager — Accesso</title>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@600;700&family=Manrope:wght@400;600&display=swap">
<link rel="stylesheet" href="/styles.css"></head>
<body style="display:grid;place-items:center;min-height:100vh">
  <form method="post" action="/login" class="card" style="width:min(400px,92vw);display:grid;gap:18px">
    <div>
      <h1 style="margin:0;font-size:26px">FitManager</h1>
      <p class="nota" style="margin:6px 0 0">Inserisci la password per accedere al gestionale.</p>
    </div>
    <label class="campo"><span>Password</span><input type="password" name="password" autofocus required></label>
    ${errore ? `<div class="avviso warm">${errore}</div>` : ''}
    <button class="btn primario" style="justify-content:center" type="submit">Entra</button>
  </form>
</body></html>`;
