import { describe, expect, it } from 'vitest';
import { parseIcs, romeLocalFast, validImportUrl } from '../worker/ical';
import { romeNow } from '../worker/time';

const ICS = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Google Inc//Google Calendar 70.9054//EN
X-WR-TIMEZONE:Europe/Rome
BEGIN:VTIMEZONE
TZID:Europe/Rome
BEGIN:DAYLIGHT
TZOFFSETFROM:+0100
TZOFFSETTO:+0200
TZNAME:CEST
DTSTART:19700329T020000
RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=-1SU
END:DAYLIGHT
BEGIN:STANDARD
TZOFFSETFROM:+0200
TZOFFSETTO:+0100
TZNAME:CET
DTSTART:19701025T030000
RRULE:FREQ=YEARLY;BYMONTH=10;BYDAY=-1SU
END:STANDARD
END:VTIMEZONE
BEGIN:VEVENT
DTSTART:20261006T080000Z
DTEND:20261006T090000Z
UID:single@google.com
SUMMARY:Dentista
LOCATION:Via Roma 1\\, Milano
END:VEVENT
BEGIN:VEVENT
DTSTART;VALUE=DATE:20261010
DTEND;VALUE=DATE:20261012
UID:allday@google.com
SUMMARY:Weekend fuori
END:VEVENT
BEGIN:VEVENT
DTSTART;TZID=Europe/Rome:20261005T190000
DTEND;TZID=Europe/Rome:20261005T200000
RRULE:FREQ=WEEKLY;BYDAY=MO;COUNT=6
EXDATE;TZID=Europe/Rome:20261019T190000
UID:weekly@google.com
SUMMARY:Palestra
END:VEVENT
BEGIN:VEVENT
DTSTART;TZID=Europe/Rome:20261027T200000
DTEND;TZID=Europe/Rome:20261027T210000
RECURRENCE-ID;TZID=Europe/Rome:20261026T190000
UID:weekly@google.com
SUMMARY:Palestra (spostata)
END:VEVENT
BEGIN:VEVENT
DTSTART:20261008T100000Z
DTEND:20261008T110000Z
UID:cancelled@google.com
STATUS:CANCELLED
SUMMARY:Annullato
END:VEVENT
BEGIN:VEVENT
DTSTART:20250101T100000Z
DTEND:20250101T110000Z
UID:old@google.com
SUMMARY:Vecchio
END:VEVENT
END:VCALENDAR
`.replace(/\n/g, '\r\n');

describe('parseIcs', () => {
  const rows = parseIcs(ICS, '2026-09-01', '2027-01-01');
  const by = (s: string) => rows.filter((r) => r.summary.startsWith(s)).map((r) => [r.starts_at, r.ends_at]);

  it('converte gli orari UTC in ora di Roma e decodifica il testo', () => {
    expect(by('Dentista')).toEqual([['2026-10-06T10:00', '2026-10-06T11:00']]);
    expect(rows.find((r) => r.summary === 'Dentista')!.location).toBe('Via Roma 1, Milano');
  });
  it('gestisce gli eventi di giornata intera', () => {
    const r = rows.find((x) => x.summary === 'Weekend fuori')!;
    expect([r.starts_at, r.ends_at, r.all_day]).toEqual(['2026-10-10T00:00', '2026-10-12T00:00', true]);
  });
  it('espande le ricorrenze con eccezioni, date escluse e cambio ora legale', () => {
    expect(by('Palestra')).toEqual([
      ['2026-10-05T19:00', '2026-10-05T20:00'],
      ['2026-10-12T19:00', '2026-10-12T20:00'],
      ['2026-10-27T20:00', '2026-10-27T21:00'],
      ['2026-11-02T19:00', '2026-11-02T20:00'],
      ['2026-11-09T19:00', '2026-11-09T20:00'],
    ]);
    expect(rows.some((r) => r.summary === 'Palestra (spostata)')).toBe(true);
  });
  it('salta eventi annullati o fuori finestra', () => {
    expect(by('Annullato')).toEqual([]);
    expect(by('Vecchio')).toEqual([]);
  });
});

describe('validImportUrl', () => {
  it('accetta solo link https (anche webcal)', () => {
    expect(validImportUrl('https://calendar.google.com/calendar/ical/a%40gmail.com/private-x/basic.ics')).toMatch(/^https:/);
    expect(validImportUrl('webcal://calendar.google.com/x.ics')).toBe('https://calendar.google.com/x.ics');
    expect(validImportUrl('http://example.com/x.ics')).toBeNull();
    expect(validImportUrl('ciao')).toBeNull();
  });
});

describe('romeLocalFast', () => {
  it('coincide con Intl per tutto l\'anno, cambi d\'ora compresi', () => {
    for (let ms = Date.UTC(2026, 0, 1); ms < Date.UTC(2028, 0, 1); ms += 37 * 60_000) expect(romeLocalFast(ms)).toBe(romeNow(new Date(ms)).local);
  });
});

describe('ricorrenze di lunga data', () => {
  const ics = (rule: string, start: string) => `BEGIN:VCALENDAR\r\nVERSION:2.0\r\nBEGIN:VTIMEZONE\r\nTZID:Europe/Rome\r\nBEGIN:DAYLIGHT\r\nTZOFFSETFROM:+0100\r\nTZOFFSETTO:+0200\r\nDTSTART:19700329T020000\r\nRRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=-1SU\r\nEND:DAYLIGHT\r\nBEGIN:STANDARD\r\nTZOFFSETFROM:+0200\r\nTZOFFSETTO:+0100\r\nDTSTART:19701025T030000\r\nRRULE:FREQ=YEARLY;BYMONTH=10;BYDAY=-1SU\r\nEND:STANDARD\r\nEND:VTIMEZONE\r\nBEGIN:VEVENT\r\nDTSTART;TZID=Europe/Rome:${start}\r\nDTEND;TZID=Europe/Rome:${start.slice(0, 9)}200000\r\nRRULE:${rule}\r\nUID:x\r\nSUMMARY:R\r\nEND:VEVENT\r\nEND:VCALENDAR\r\n`;
  const starts = (rule: string, start: string) => parseIcs(ics(rule, start), '2026-10-20', '2026-11-20').map((r) => r.starts_at);

  it('settimanale con più giorni, partita nel 2019', () => {
    expect(starts('FREQ=WEEKLY;BYDAY=MO,TH', '20190107T190000')).toEqual([
      '2026-10-22T19:00', '2026-10-26T19:00', '2026-10-29T19:00', '2026-11-02T19:00', '2026-11-05T19:00',
      '2026-11-09T19:00', '2026-11-12T19:00', '2026-11-16T19:00', '2026-11-19T19:00']);
  });
  it('ogni due settimane mantiene la parità', () => {
    expect(starts('FREQ=WEEKLY;INTERVAL=2', '20190107T190000')).toEqual(['2026-11-02T19:00', '2026-11-16T19:00']);
  });
  it('mensile il secondo martedì e il giorno 15', () => {
    expect(starts('FREQ=MONTHLY;BYDAY=2TU', '20180109T190000')).toEqual(['2026-11-10T19:00']);
    expect(starts('FREQ=MONTHLY', '20180115T190000')).toEqual(['2026-11-15T19:00']);
  });
  it('rispetta UNTIL', () => {
    expect(starts('FREQ=DAILY;UNTIL=20261022T235959Z', '20200101T190000')).toEqual(['2026-10-20T19:00', '2026-10-21T19:00', '2026-10-22T19:00']);
  });
});

describe('fusi senza VTIMEZONE', () => {
  it('usa il TZID anche se il file non lo descrive', () => {
    const t = 'BEGIN:VCALENDAR\r\nVERSION:2.0\r\nBEGIN:VEVENT\r\nUID:a\r\nDTSTART;TZID=America/New_York:20261008T120000\r\nDTEND;TZID=America/New_York:20261008T130000\r\nSUMMARY:Call\r\nEND:VEVENT\r\nEND:VCALENDAR\r\n';
    expect(parseIcs(t, '2026-10-01', '2026-11-01').map((r) => [r.starts_at, r.ends_at])).toEqual([['2026-10-08T18:00', '2026-10-08T19:00']]);
  });
});
