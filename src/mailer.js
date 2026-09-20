// Client SMTP minimale (AUTH LOGIN, STARTTLS o TLS diretto) senza dipendenze esterne.
// Se SMTP_HOST non e' configurato l'email viene salvata come bozza .eml in data/outbox/.
import net from 'node:net';
import tls from 'node:tls';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const OUTBOX = resolve(process.cwd(), 'data', 'outbox');

const encodeHeader = (s) => (/^[\x20-\x7E]*$/.test(s) ? s : `=?UTF-8?B?${Buffer.from(s, 'utf8').toString('base64')}?=`);

function costruisciMessaggio({ da, daNome, a, oggetto, corpo }) {
  const headers = [
    `From: ${daNome ? `${encodeHeader(daNome)} <${da}>` : da}`,
    `To: ${a}`,
    `Subject: ${encodeHeader(oggetto)}`,
    `Date: ${new Date().toUTCString()}`,
    'MIME-Version: 1.0',
    'Content-Type: text/plain; charset=UTF-8',
    'Content-Transfer-Encoding: base64',
  ];
  const body = Buffer.from(corpo, 'utf8').toString('base64').replace(/(.{76})/g, '$1\r\n');
  return `${headers.join('\r\n')}\r\n\r\n${body}\r\n`;
}

function dialogo(socket) {
  let buffer = '';
  const attese = [];
  socket.setEncoding('utf8');
  socket.on('data', (chunk) => {
    buffer += chunk;
    let idx;
    while ((idx = buffer.indexOf('\r\n')) !== -1) {
      const riga = buffer.slice(0, idx);
      buffer = buffer.slice(idx + 2);
      // Una risposta SMTP e' completa quando il codice non e' seguito da "-".
      const corrente = attese[0];
      if (!corrente) continue;
      corrente.righe.push(riga);
      if (riga[3] !== '-') attese.shift().risolvi(corrente.righe.join('\n'));
    }
  });
  return {
    leggi: () => new Promise((risolvi, rifiuta) => {
      attese.push({ righe: [], risolvi });
      socket.once('error', rifiuta);
    }),
    scrivi: (riga) => socket.write(`${riga}\r\n`),
  };
}

async function comando(conv, riga, attesi) {
  if (riga !== null) conv.scrivi(riga);
  const risposta = await conv.leggi();
  const codice = Number(risposta.slice(0, 3));
  if (!attesi.includes(codice)) throw new Error(`SMTP ${codice}: ${risposta.split('\n')[0]}`);
  return risposta;
}

async function inviaSmtp(cfg, messaggio, { da, a }) {
  const secure = String(cfg.secure) === 'true' || Number(cfg.port) === 465;
  let socket = secure
    ? tls.connect({ host: cfg.host, port: Number(cfg.port), servername: cfg.host })
    : net.connect({ host: cfg.host, port: Number(cfg.port) });
  await new Promise((ok, ko) => {
    socket.once(secure ? 'secureConnect' : 'connect', ok);
    socket.once('error', ko);
    socket.setTimeout(20000, () => ko(new Error('Timeout connessione SMTP')));
  });
  let conv = dialogo(socket);
  try {
    await comando(conv, null, [220]);
    await comando(conv, 'EHLO fitmanager.local', [250]);
    if (!secure) {
      await comando(conv, 'STARTTLS', [220]);
      socket = tls.connect({ socket, servername: cfg.host });
      await new Promise((ok, ko) => { socket.once('secureConnect', ok); socket.once('error', ko); });
      conv = dialogo(socket);
      await comando(conv, 'EHLO fitmanager.local', [250]);
    }
    if (cfg.user) {
      await comando(conv, 'AUTH LOGIN', [334]);
      await comando(conv, Buffer.from(cfg.user).toString('base64'), [334]);
      await comando(conv, Buffer.from(cfg.pass || '').toString('base64'), [235]);
    }
    await comando(conv, `MAIL FROM:<${da}>`, [250]);
    await comando(conv, `RCPT TO:<${a}>`, [250, 251]);
    await comando(conv, 'DATA', [354]);
    socket.write(`${messaggio.replace(/\r\n\./g, '\r\n..')}\r\n.\r\n`);
    await comando(conv, null, [250]);
    conv.scrivi('QUIT');
  } finally {
    socket.end();
  }
}

/** Invia l'email; ritorna { stato: 'inviata' | 'bozza', dettaglio }. Non lancia mai
 *  per un errore di consegna: il chiamante lo registra nel log. */
export async function inviaEmail({ a, oggetto, corpo }) {
  const cfg = {
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT || 587,
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
    secure: process.env.SMTP_SECURE || 'false',
  };
  const da = process.env.PT_EMAIL || cfg.user || 'no-reply@fitmanager.local';
  const messaggio = costruisciMessaggio({ da, daNome: process.env.PT_NOME, a, oggetto, corpo });

  if (!cfg.host) {
    mkdirSync(OUTBOX, { recursive: true });
    const file = resolve(OUTBOX, `${Date.now()}-${a.replace(/[^a-z0-9._-]/gi, '_')}.eml`);
    writeFileSync(file, messaggio);
    return { stato: 'bozza', dettaglio: `SMTP non configurato: bozza salvata in ${file}` };
  }
  try {
    await inviaSmtp(cfg, messaggio, { da, a });
    return { stato: 'inviata', dettaglio: `Consegnata a ${a} via ${cfg.host}` };
  } catch (err) {
    return { stato: 'errore', dettaglio: err.message };
  }
}
