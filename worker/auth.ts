// Verifica del JWT di Cloudflare Access (difesa in profondità: anche se qualcuno
// raggiungesse il Worker aggirando Access, senza un token valido firmato da Cloudflare
// per questa applicazione e per un'email autorizzata, la richiesta viene rifiutata).
import type { Env } from './types';

type Jwk = JsonWebKey & { kid: string };
let jwksCache: { keys: Map<string, CryptoKey>; fetchedAt: number; domain: string } | null = null;

const b64urlToBytes = (s: string) => {
  const b64 = s.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((s.length + 3) % 4);
  return Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
};

async function getKeys(domain: string, force = false): Promise<Map<string, CryptoKey>> {
  if (!force && jwksCache && jwksCache.domain === domain && Date.now() - jwksCache.fetchedAt < 3600_000) return jwksCache.keys;
  const res = await fetch(`https://${domain}/cdn-cgi/access/certs`);
  if (!res.ok) throw new Error('Impossibile scaricare le chiavi di Cloudflare Access');
  const { keys } = (await res.json()) as { keys: Jwk[] };
  const map = new Map<string, CryptoKey>();
  for (const k of keys) {
    map.set(k.kid, await crypto.subtle.importKey('jwk', k, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['verify']));
  }
  jwksCache = { keys: map, fetchedAt: Date.now(), domain };
  return map;
}

export function allowedEmails(env: Env): string[] {
  return (env.ALLOWED_EMAILS || '').split(',').map((e) => e.trim().toLowerCase()).filter(Boolean);
}

export type AuthResult = { email: string } | { email: null; reason: string };

const deny = (reason: string): AuthResult => ({ email: null, reason });

/**
 * Restituisce l'email autenticata oppure il motivo del rifiuto. Il motivo descrive solo
 * il token ricevuto (che appartiene a chi sta facendo login) e mai i valori dei secret.
 */
export async function authenticate(req: Request, env: Env): Promise<AuthResult> {
  const url = new URL(req.url);
  if (env.DEV_BYPASS_AUTH === 'true' && (url.hostname === 'localhost' || url.hostname === '127.0.0.1')) {
    return { email: allowedEmails(env)[0] ?? 'dev@localhost' };
  }
  // Tollera i valori incollati con spazi, https:// o l'intero indirizzo JWKS
  const teamDomain = (env.ACCESS_TEAM_DOMAIN || '').trim().replace(/^https?:\/\//, '').replace(/\/.*$/, '');
  const accessAud = (env.ACCESS_AUD || '').trim();
  if (!teamDomain || !accessAud) {
    return deny('Sul Worker mancano i secret ACCESS_TEAM_DOMAIN e/o ACCESS_AUD.');
  }

  const token = req.headers.get('cf-access-jwt-assertion') ?? getCookie(req, 'CF_Authorization');
  if (!token) return deny('Nessun token di Cloudflare Access: il login di Access non è attivo su questo indirizzo.');
  const parts = token.split('.');
  if (parts.length !== 3) return deny('Token di Cloudflare Access non valido.');

  try {
    const header = JSON.parse(new TextDecoder().decode(b64urlToBytes(parts[0])));
    const payload = JSON.parse(new TextDecoder().decode(b64urlToBytes(parts[1])));
    if (header.alg !== 'RS256') return deny('Token di Cloudflare Access non valido (algoritmo).');

    // Questi controlli vengono prima della firma solo per dare un messaggio utile:
    // l'accesso è concesso soltanto se più sotto anche la firma risulta valida.
    if (payload.iss !== `https://${teamDomain}`) {
      const issHost = typeof payload.iss === 'string' ? payload.iss.replace(/^https:\/\//, '') : '?';
      return deny(`ACCESS_TEAM_DOMAIN non corrisponde. Il login arriva da: ${issHost}`);
    }
    const aud: string[] = Array.isArray(payload.aud) ? payload.aud : [payload.aud];
    if (!aud.includes(accessAud)) {
      return deny(`ACCESS_AUD non corrisponde. AUD del login: ${aud.join(', ')}`);
    }

    let keys: Map<string, CryptoKey>;
    try {
      keys = await getKeys(teamDomain);
      if (!keys.has(header.kid)) keys = await getKeys(teamDomain, true); // rotazione chiavi
    } catch {
      return deny(`Impossibile scaricare le chiavi da https://${teamDomain}/cdn-cgi/access/certs: controlla ACCESS_TEAM_DOMAIN.`);
    }
    const key = keys.get(header.kid);
    if (!key) return deny('Il token non è firmato con le chiavi di questo team Access.');

    const ok = await crypto.subtle.verify('RSASSA-PKCS1-v1_5', key, b64urlToBytes(parts[2]),
      new TextEncoder().encode(`${parts[0]}.${parts[1]}`));
    if (!ok) return deny('Firma del token non valida.');

    const now = Math.floor(Date.now() / 1000);
    if (typeof payload.exp !== 'number' || payload.exp < now) return deny('Login scaduto: ricarica la pagina.');
    if (typeof payload.nbf === 'number' && payload.nbf > now + 60) return deny('Token non ancora valido.');

    const email = String(payload.email || '').toLowerCase();
    if (!email) return deny('Il login non contiene un indirizzo email.');
    if (!allowedEmails(env).includes(email)) return deny(`L'email ${email} non è in ALLOWED_EMAILS.`);
    return { email };
  } catch {
    return deny('Token di Cloudflare Access non leggibile.');
  }
}

function getCookie(req: Request, name: string): string | null {
  const raw = req.headers.get('cookie');
  if (!raw) return null;
  for (const part of raw.split(';')) {
    const [k, ...v] = part.trim().split('=');
    if (k === name) return v.join('=');
  }
  return null;
}
