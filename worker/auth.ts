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

/** Restituisce l'email autenticata oppure null. */
export async function authenticate(req: Request, env: Env): Promise<string | null> {
  const url = new URL(req.url);
  if (env.DEV_BYPASS_AUTH === 'true' && (url.hostname === 'localhost' || url.hostname === '127.0.0.1')) {
    return allowedEmails(env)[0] ?? 'dev@localhost';
  }
  if (!env.ACCESS_TEAM_DOMAIN || !env.ACCESS_AUD) return null;

  const token = req.headers.get('cf-access-jwt-assertion') ?? getCookie(req, 'CF_Authorization');
  if (!token) return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;

  try {
    const header = JSON.parse(new TextDecoder().decode(b64urlToBytes(parts[0])));
    const payload = JSON.parse(new TextDecoder().decode(b64urlToBytes(parts[1])));
    if (header.alg !== 'RS256') return null;

    let keys = await getKeys(env.ACCESS_TEAM_DOMAIN);
    if (!keys.has(header.kid)) keys = await getKeys(env.ACCESS_TEAM_DOMAIN, true); // rotazione chiavi
    const key = keys.get(header.kid);
    if (!key) return null;

    const ok = await crypto.subtle.verify('RSASSA-PKCS1-v1_5', key, b64urlToBytes(parts[2]),
      new TextEncoder().encode(`${parts[0]}.${parts[1]}`));
    if (!ok) return null;

    const now = Math.floor(Date.now() / 1000);
    if (typeof payload.exp !== 'number' || payload.exp < now) return null;
    if (typeof payload.nbf === 'number' && payload.nbf > now + 60) return null;
    if (payload.iss !== `https://${env.ACCESS_TEAM_DOMAIN}`) return null;
    const aud: string[] = Array.isArray(payload.aud) ? payload.aud : [payload.aud];
    if (!aud.includes(env.ACCESS_AUD)) return null;

    const email = String(payload.email || '').toLowerCase();
    if (!email || !allowedEmails(env).includes(email)) return null;
    return email;
  } catch {
    return null;
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
