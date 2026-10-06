// Cifratura AES-256-GCM per i segreti salvati nel database (es. refresh token Google).
const enc = new TextEncoder();
const dec = new TextDecoder();

const toB64 = (b: Uint8Array) => btoa(String.fromCharCode(...b));
const fromB64 = (s: string) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));

async function key(secretB64: string) {
  const raw = fromB64(secretB64);
  if (raw.length !== 32) throw new Error('ENCRYPTION_KEY deve essere di 32 byte in base64');
  return crypto.subtle.importKey('raw', raw, 'AES-GCM', false, ['encrypt', 'decrypt']);
}

export async function encrypt(plain: string, secretB64: string): Promise<string> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, await key(secretB64), enc.encode(plain)));
  return `v1.${toB64(iv)}.${toB64(ct)}`;
}

export async function decrypt(blob: string, secretB64: string): Promise<string> {
  const [v, iv, ct] = blob.split('.');
  if (v !== 'v1') throw new Error('Formato cifrato sconosciuto');
  const pt = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: fromB64(iv) }, await key(secretB64), fromB64(ct));
  return dec.decode(pt);
}

export function randomToken(bytes = 32): string {
  return toB64(crypto.getRandomValues(new Uint8Array(bytes))).replace(/[+/=]/g, (c) => ({ '+': '-', '/': '_', '=': '' })[c]!);
}
