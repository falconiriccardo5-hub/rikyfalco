import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import ExcelJS from "exceljs";
import { accessToken, driveFolders, driveUpload } from "./integrations/google";
type Snap = { clients: Record<string, unknown>[]; programs: Record<string, unknown>[]; payments: Record<string, unknown>[]; appointments: Record<string, unknown>[]; visits: Record<string, unknown>[] };
export const ENTITIES = ["clients", "programs", "payments", "appointments", "visits"] as const;
export type Entity = (typeof ENTITIES)[number];
export async function snapshot(sb: SupabaseClient) {
  const { data, error } = await sb.rpc("export_snapshot");
  if (error) throw new Error(error.message);
  return data as Snap & { version: number; exported_at: string };
}
const cell = (v: unknown) => (v === null || v === undefined ? "" : typeof v === "object" ? JSON.stringify(v) : String(v));
export function toCSV(rows: Record<string, unknown>[]) {
  if (!rows.length) return "";
  const cols = Object.keys(rows[0]);
  const esc = (s: string) => (/[",;\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s);
  return "﻿" + [cols.join(";"), ...rows.map((r) => cols.map((c) => esc(cell(r[c]))).join(";"))].join("\n");
}
export async function toXLSX(sheets: Partial<Record<Entity, Record<string, unknown>[]>>) {
  const wb = new ExcelJS.Workbook();
  wb.creator = "RF Coaching";
  for (const [name, rows] of Object.entries(sheets)) {
    const ws = wb.addWorksheet(name);
    if (!rows?.length) continue;
    ws.columns = Object.keys(rows[0]).map((k) => ({ header: k, key: k, width: Math.min(40, Math.max(12, k.length + 4)) }));
    rows.forEach((r) => ws.addRow(Object.fromEntries(Object.entries(r).map(([k, v]) => [k, typeof v === "object" && v !== null ? JSON.stringify(v) : v]))));
    ws.getRow(1).font = { bold: true };
  }
  return Buffer.from(await wb.xlsx.writeBuffer());
}
/**
 * Runs a backup. The snapshot is always stored in the database (last 30 kept);
 * if Google is connected it is also written to Drive. Status reflects what really happened.
 */
export async function runBackup(sb: SupabaseClient, kind: "manuale" | "automatico") {
  const snap = await snapshot(sb);
  const json = JSON.stringify(snap, null, 2);
  const { data: row } = await sb.from("backups").insert({ kind, status: "in_corso", destination: "database", snapshot: snap, size_bytes: Buffer.byteLength(json) }).select("id").single();
  let token: string | null = null;
  try { token = await accessToken(sb); } catch (e) {
    await sb.from("backups").update({ status: "errore", error: "Google: " + (e as Error).message, finished_at: new Date().toISOString() }).eq("id", row!.id);
    return { ok: false, drive: false, error: (e as Error).message };
  }
  if (!token) {
    await sb.from("backups").update({ status: "completato", finished_at: new Date().toISOString() }).eq("id", row!.id);
    return { ok: true, drive: false };
  }
  try {
    const f = await driveFolders(token);
    const day = new Date().toLocaleDateString("sv-SE", { timeZone: "Europe/Rome" });
    const file = await driveUpload(token, f.backups, `backup-${day}.json`, "application/json", json);
    await driveUpload(token, f.clients, "clients.json", "application/json", JSON.stringify(snap.clients, null, 2));
    await driveUpload(token, f.exports, "clients.xlsx", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", await toXLSX({ clients: snap.clients }));
    await driveUpload(token, f.exports, "payments.xlsx", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", await toXLSX({ payments: snap.payments }));
    await sb.from("backups").update({ status: "completato", destination: "google_drive", file_ref: file.id, file_url: file.webViewLink, finished_at: new Date().toISOString() }).eq("id", row!.id);
    return { ok: true, drive: true };
  } catch (e) {
    await sb.from("backups").update({ status: "errore", error: "Drive: " + (e as Error).message, finished_at: new Date().toISOString() }).eq("id", row!.id);
    return { ok: false, drive: false, error: (e as Error).message };
  }
}
