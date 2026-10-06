import { describe, expect, it } from 'vitest';
import { authenticate } from '../worker/auth';
import type { Env } from '../worker/types';

const b64url = (o: object) => btoa(JSON.stringify(o)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const token = (payload: object) => `${b64url({ alg: 'RS256', kid: 'k1' })}.${b64url(payload)}.c2ln`;
const req = (jwt?: string) =>
  new Request('https://rf-coaching.example.workers.dev/', jwt ? { headers: { 'cf-access-jwt-assertion': jwt } } : {});
const env = (over: Partial<Env> = {}) =>
  ({ ACCESS_TEAM_DOMAIN: 'team.cloudflareaccess.com', ACCESS_AUD: 'aud123', ALLOWED_EMAILS: 'a@b.it', ...over }) as Env;
const reason = async (r: Request, e: Env) => {
  const res = await authenticate(r, e);
  return res.email === null ? res.reason : `ok:${res.email}`;
};

describe('authenticate: motivo del rifiuto', () => {
  it('segnala i secret mancanti', async () => {
    expect(await reason(req('x'), env({ ACCESS_AUD: '' }))).toMatch(/mancano i secret/);
  });

  it('segnala l\'assenza del token di Access', async () => {
    expect(await reason(req(), env())).toMatch(/Nessun token/);
  });

  it('mostra da quale team arriva il login se ACCESS_TEAM_DOMAIN è diverso', async () => {
    const jwt = token({ iss: 'https://altro.cloudflareaccess.com', aud: ['aud123'] });
    expect(await reason(req(jwt), env())).toMatch(/Il login arriva da: altro\.cloudflareaccess\.com/);
  });

  it('mostra l\'AUD del login se ACCESS_AUD è diverso', async () => {
    const jwt = token({ iss: 'https://team.cloudflareaccess.com', aud: ['audGiusto'] });
    expect(await reason(req(jwt), env())).toMatch(/AUD del login: audGiusto/);
  });

  it('accetta ACCESS_TEAM_DOMAIN e ACCESS_AUD incollati con https://, percorso JWKS e spazi', async () => {
    const jwt = token({ iss: 'https://team.cloudflareaccess.com', aud: ['aud123'] });
    const e = env({ ACCESS_TEAM_DOMAIN: ' https://team.cloudflareaccess.com/cdn-cgi/access/certs ', ACCESS_AUD: ' aud123\n' });
    // supera i controlli su team e AUD: il rifiuto ora riguarda le chiavi (qui non raggiungibili), non la configurazione
    expect(await reason(req(jwt), e)).not.toMatch(/non corrisponde|mancano/);
  });
});
