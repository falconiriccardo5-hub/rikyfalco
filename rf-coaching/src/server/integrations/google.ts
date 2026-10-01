import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { encrypt, decrypt } from "@/server/crypto";
/** Google OAuth (server-side only). Refresh token is stored AES-GCM encrypted in `integrations`. */
export const GOOGLE_SCOPES = ["openid", "email", "https://www.googleapis.com/auth/drive.file", "https://www.googleapis.com/auth/calendar.events"];
export const googleConfigured = () => !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET && process.env.TOKEN_ENCRYPTION_KEY);
export const redirectUri = (origin: string) => `${process.env.APP_URL || origin}/api/google/callback`;
export function authUrl(origin: string, state: string) {
  const p = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID!, redirect_uri: redirectUri(origin), response_type: "code",
    scope: GOOGLE_SCOPES.join(" "), access_type: "offline", prompt: "consent", include_granted_scopes: "true", state,
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${p}`;
}
async function tokenRequest(body: Record<string, string>) {
  const r = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ client_id: process.env.GOOGLE_CLIENT_ID!, client_secret: process.env.GOOGLE_CLIENT_SECRET!, ...body }),
  });
  const j = await r.json();
  if (!r.ok) throw new Error(j.error_description || j.error || "OAuth error");
  return j as { access_token: string; refresh_token?: string; scope: string; id_token?: string };
}
export async function exchangeCode(sb: SupabaseClient, code: string, origin: string) {
  const t = await tokenRequest({ code, grant_type: "authorization_code", redirect_uri: redirectUri(origin) });
  if (!t.refresh_token) throw new Error("Google non ha restituito un refresh token: riprova");
  const info = await (await fetch("https://openidconnect.googleapis.com/v1/userinfo", { headers: { Authorization: `Bearer ${t.access_token}` } })).json();
  const { error } = await sb.from("integrations").upsert({
    provider: "google", account_email: info.email ?? null, encrypted_refresh_token: encrypt(t.refresh_token),
    scopes: t.scope.split(" "), connected_at: new Date().toISOString(), updated_at: new Date().toISOString(),
  });
  if (error) throw new Error(error.message);
}
export async function googleStatus(sb: SupabaseClient) {
  const { data } = await sb.from("integrations").select("account_email,scopes,connected_at").eq("provider", "google").maybeSingle();
  if (!data) return { connected: false as const };
  const s = (data.scopes ?? []) as string[];
  return { connected: true as const, email: data.account_email as string | null, drive: s.some((x) => x.includes("drive")), calendar: s.some((x) => x.includes("calendar")), since: data.connected_at as string };
}
/** Returns a fresh access token or null if Google is not connected. */
export async function accessToken(sb: SupabaseClient): Promise<string | null> {
  if (!googleConfigured()) return null;
  const { data } = await sb.from("integrations").select("encrypted_refresh_token").eq("provider", "google").maybeSingle();
  if (!data?.encrypted_refresh_token) return null;
  const t = await tokenRequest({ refresh_token: decrypt(data.encrypted_refresh_token), grant_type: "refresh_token" });
  return t.access_token;
}
export async function disconnect(sb: SupabaseClient) {
  const { data } = await sb.from("integrations").select("encrypted_refresh_token").eq("provider", "google").maybeSingle();
  if (data?.encrypted_refresh_token) {
    try { await fetch(`https://oauth2.googleapis.com/revoke?token=${decrypt(data.encrypted_refresh_token)}`, { method: "POST" }); } catch { /* best effort */ }
  }
  await sb.from("integrations").delete().eq("provider", "google");
}
async function g<T>(token: string, url: string, init: RequestInit = {}): Promise<T> {
  const r = await fetch(url, { ...init, headers: { Authorization: `Bearer ${token}`, ...(init.headers ?? {}) } });
  if (r.status === 204) return undefined as T;
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j?.error?.message || `Google API ${r.status}`);
  return j as T;
}
/* ---------------- Drive ---------------- */
const FOLDER = "application/vnd.google-apps.folder";
async function folder(token: string, name: string, parent?: string) {
  const q = [`name='${name.replace(/'/g, "\\'")}'`, `mimeType='${FOLDER}'`, "trashed=false", parent ? `'${parent}' in parents` : "'root' in parents"].join(" and ");
  const found = await g<{ files: { id: string }[] }>(token, `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(q)}&fields=files(id)`);
  if (found.files[0]) return found.files[0].id;
  const created = await g<{ id: string }>(token, "https://www.googleapis.com/drive/v3/files?fields=id", {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name, mimeType: FOLDER, parents: parent ? [parent] : undefined }),
  });
  return created.id;
}
export async function driveFolders(token: string) {
  const root = await folder(token, "Riccardo Falconi Coaching");
  const [backups, clients, exports, csv] = await Promise.all([
    folder(token, "Backups", root), folder(token, "Clients", root), folder(token, "Exports", root), folder(token, "CSV", root),
  ]);
  return { root, backups, clients, exports, csv };
}

/** Sottocartella con un nome dato (creata solo se manca). Usata per i CSV datati. */
export async function driveFolder(token: string, name: string, parent: string) {
  return folder(token, name, parent);
}
/** Creates or overwrites (same name in same folder) a file. */
export async function driveUpload(token: string, parent: string, name: string, mime: string, data: Buffer | string) {
  const q = `name='${name}' and '${parent}' in parents and trashed=false`;
  const found = await g<{ files: { id: string }[] }>(token, `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(q)}&fields=files(id)`);
  const boundary = "rf" + Date.now();
  const meta = found.files[0] ? { name } : { name, parents: [parent] };
  const body = Buffer.concat([
    Buffer.from(`--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(meta)}\r\n--${boundary}\r\nContent-Type: ${mime}\r\n\r\n`),
    Buffer.isBuffer(data) ? data : Buffer.from(data), Buffer.from(`\r\n--${boundary}--`),
  ]);
  const url = found.files[0]
    ? `https://www.googleapis.com/upload/drive/v3/files/${found.files[0].id}?uploadType=multipart&fields=id,webViewLink`
    : "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,webViewLink";
  return g<{ id: string; webViewLink: string }>(token, url, { method: found.files[0] ? "PATCH" : "POST", headers: { "Content-Type": `multipart/related; boundary=${boundary}` }, body: new Uint8Array(body) });
}
/* ---------------- Calendar ---------------- */
type Appt = { id: string; starts_at: string; ends_at: string; type: string; notes: string | null; google_event_id: string | null; client?: { first_name: string; last_name: string } | null };
const CAL = "https://www.googleapis.com/calendar/v3/calendars/primary/events";
export async function pushAppointment(token: string, a: Appt) {
  const body = JSON.stringify({
    summary: `${a.client ? `${a.client.first_name} ${a.client.last_name} · ` : ""}${a.type[0].toUpperCase()}${a.type.slice(1)}`,
    description: [a.notes, "Creato da RF Coaching"].filter(Boolean).join("\n\n"),
    start: { dateTime: a.starts_at, timeZone: "Europe/Rome" }, end: { dateTime: a.ends_at, timeZone: "Europe/Rome" },
    extendedProperties: { private: { rfAppointmentId: a.id } },
  });
  const headers = { "Content-Type": "application/json" };
  if (a.google_event_id) {
    try { return await g<{ id: string }>(token, `${CAL}/${a.google_event_id}`, { method: "PATCH", headers, body }); } catch { /* deleted on Google: recreate */ }
  }
  return g<{ id: string }>(token, CAL, { method: "POST", headers, body });
}
export async function deleteEvent(token: string, eventId: string) {
  try { await g(token, `${CAL}/${eventId}`, { method: "DELETE" }); } catch { /* already gone */ }
}
export async function listEvents(token: string, fromISO: string, toISO: string) {
  const p = new URLSearchParams({ timeMin: fromISO, timeMax: toISO, singleEvents: "true", orderBy: "startTime", maxResults: "100" });
  const r = await g<{ items: { id: string; summary?: string; start: { dateTime?: string; date?: string }; extendedProperties?: { private?: { rfAppointmentId?: string } } }[] }>(token, `${CAL}?${p}`);
  return r.items;
}
