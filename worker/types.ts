export interface Env {
  DB: D1Database;
  ASSETS: Fetcher;
  /** es. "riccardo.cloudflareaccess.com" */
  ACCESS_TEAM_DOMAIN: string;
  /** Application Audience (AUD) tag dell'applicazione Cloudflare Access */
  ACCESS_AUD: string;
  /** Email autorizzate, separate da virgola */
  ALLOWED_EMAILS: string;
  /** Solo sviluppo locale: "true" disattiva Access su localhost */
  DEV_BYPASS_AUTH?: string;
  GOOGLE_CLIENT_ID?: string;
  GOOGLE_CLIENT_SECRET?: string;
  /** Chiave AES-256 in base64 (32 byte) per cifrare i token Google nel DB */
  ENCRYPTION_KEY?: string;
  /** URL pubblico dell'app, es. https://coaching.tuodominio.it */
  APP_URL?: string;
}

export type Vars = { email: string };
export type AppEnv = { Bindings: Env; Variables: Vars };
