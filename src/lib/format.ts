export const euro = (cents: number) =>
  new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR', minimumFractionDigits: cents % 100 ? 2 : 0, maximumFractionDigits: 2 })
    .format(cents / 100).replace(/ /g, ' ');

export const toCents = (v: string) => Math.round(parseFloat(v.replace(',', '.') || '0') * 100);
export const fromCents = (c: number) => (c / 100).toFixed(2).replace('.', ',').replace(/,00$/, '');

export const initials = (first: string, last: string) => `${first[0] ?? ''}${last[0] ?? ''}`.toUpperCase();

const MONTHS = ['gennaio', 'febbraio', 'marzo', 'aprile', 'maggio', 'giugno', 'luglio', 'agosto', 'settembre', 'ottobre', 'novembre', 'dicembre'];
const DAYS = ['domenica', 'lunedì', 'martedì', 'mercoledì', 'giovedì', 'venerdì', 'sabato'];
export const MONTHS_SHORT = ['GEN', 'FEB', 'MAR', 'APR', 'MAG', 'GIU', 'LUG', 'AGO', 'SET', 'OTT', 'NOV', 'DIC'];
export const monthName = (m: number) => MONTHS[m];

const d = (s: string) => new Date(s.slice(0, 10) + 'T12:00:00');

export const itDate = (s: string) => { const [y, m, day] = s.slice(0, 10).split('-'); return `${day}/${m}/${y}`; };
export const shortDay = (s: string) => { const x = d(s); return `${DAYS[x.getDay()].slice(0, 3)} ${x.getDate()} ${MONTHS[x.getMonth()].slice(0, 3)}`; };
export const longDay = (s: string) => { const x = d(s); return `${DAYS[x.getDay()]} ${x.getDate()} ${MONTHS[x.getMonth()]}`; };
export const dayMonth = (s: string) => { const [, m, day] = s.slice(0, 10).split('-'); return `${day}/${m}`; };
export const time = (s: string) => s.slice(11, 16);

/** Data di oggi in ora di Roma (YYYY-MM-DD) */
export function todayRome(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Rome', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
}
export function nowRomeLocal(): string {
  const p = Object.fromEntries(new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Rome', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(new Date()).map((x) => [x.type, x.value]));
  return `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}`;
}

export function daysDiff(a: string, b: string) {
  return Math.round((d(b).getTime() - d(a).getTime()) / 86400000);
}

export function relDays(s: string) {
  const n = daysDiff(s, todayRome());
  if (n === 0) return 'oggi';
  if (n === 1) return 'ieri';
  if (n === -1) return 'domani';
  return n > 0 ? `${n} gg fa` : `tra ${-n} gg`;
}

export function addDays(s: string, n: number) {
  const x = new Date(s + 'T12:00:00Z'); x.setUTCDate(x.getUTCDate() + n); return x.toISOString().slice(0, 10);
}
export function addMonths(s: string, n: number) {
  const [y, m] = s.split('-').map(Number);
  const x = new Date(Date.UTC(y, m - 1 + n, 1, 12)); return x.toISOString().slice(0, 7);
}

export const MODE_LABEL: Record<string, string> = { live: 'Live', online: 'Online', misto: 'Misto' };
export const KIND_LABEL: Record<string, string> = { lezione: 'Lezione', consulenza: 'Consulenza', visita: 'Visita' };
export const METHOD_LABEL: Record<string, string> = { contanti: 'Contanti', bonifico: 'Bonifico', carta: 'Carta', paypal: 'PayPal', satispay: 'Satispay', altro: 'Altro' };
export const STATUS_LABEL: Record<string, string> = { attivo: 'Attivo', in_scadenza: 'In scadenza', scaduto: 'Scaduto', archiviato: 'Archiviato', non_iniziato: 'Da iniziare' };

export function greeting() {
  const h = Number(new Intl.DateTimeFormat('it-IT', { timeZone: 'Europe/Rome', hour: 'numeric', hourCycle: 'h23' }).format(new Date()));
  if (h < 5) return 'Buonanotte';
  if (h < 13) return 'Buongiorno';
  if (h < 18) return 'Buon pomeriggio';
  return 'Buonasera';
}

/** Numero per wa.me: solo cifre, prefisso Italia se manca */
export function waNumber(phone: string) {
  let n = phone.replace(/[^\d+]/g, '');
  if (n.startsWith('+')) n = n.slice(1);
  else if (n.startsWith('00')) n = n.slice(2);
  else if (n.length === 10 && n.startsWith('3')) n = '39' + n;
  return n;
}
