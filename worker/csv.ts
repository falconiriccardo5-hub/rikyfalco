// CSV RFC 4180 con BOM UTF-8 (si apre correttamente in Excel / Google Sheets).
// Protezione "CSV injection": i testi che iniziano con = + - @ vengono prefissati con '
// (rimosso automaticamente in fase di ripristino).

const DANGEROUS = /^[=+\-@\t\r]/;
const NUMERIC = /^-?\d+(\.\d+)?$/;

function cell(v: unknown): string {
  if (v === null || v === undefined) return '';
  let s = String(v);
  if (s === '') return '""'; // distingue la stringa vuota da NULL
  if (DANGEROUS.test(s) && !NUMERIC.test(s)) s = "'" + s;
  return /[",\r\n;]/.test(s) || s !== s.trim() ? `"${s.replace(/"/g, '""')}"` : s;
}

export function toCsv(columns: string[], rows: Record<string, unknown>[]): string {
  const lines = [columns.join(',')];
  for (const r of rows) lines.push(columns.map((c) => cell(r[c])).join(','));
  return '﻿' + lines.join('\r\n') + '\r\n';
}

export function parseCsv(text: string): { columns: string[]; rows: Record<string, string | null>[] } {
  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1);
  const records: string[][] = [];
  let field = '', record: string[] = [], quoted = false, i = 0, wasQuoted = false;
  const pushField = () => { record.push(wasQuoted || field !== '' ? field : '\u0000NULL'); field = ''; wasQuoted = false; };
  while (i < text.length) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"') {
        if (text[i + 1] === '"') { field += '"'; i += 2; continue; }
        quoted = false; i++; continue;
      }
      field += ch; i++; continue;
    }
    if (ch === '"') { quoted = true; wasQuoted = true; i++; continue; }
    if (ch === ',') { pushField(); i++; continue; }
    if (ch === '\r' || ch === '\n') {
      pushField(); records.push(record); record = [];
      if (ch === '\r' && text[i + 1] === '\n') i++;
      i++; continue;
    }
    field += ch; i++;
  }
  if (field !== '' || record.length) { pushField(); records.push(record); }

  const nonEmpty = records.filter((r) => !(r.length === 1 && r[0] === '\u0000NULL'));
  if (!nonEmpty.length) return { columns: [], rows: [] };
  const columns = nonEmpty[0].map((c) => c.replace('\u0000NULL', '').trim());
  const rows = nonEmpty.slice(1).map((r) => {
    const o: Record<string, string | null> = {};
    columns.forEach((c, idx) => {
      let v = r[idx];
      if (v === undefined || v === '\u0000NULL') { o[c] = null; return; }
      if (v.startsWith("'") && DANGEROUS.test(v.slice(1))) v = v.slice(1);
      o[c] = v;
    });
    return o;
  });
  return { columns, rows };
}
