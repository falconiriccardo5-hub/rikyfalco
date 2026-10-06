// Ponte verso Google senza Google Cloud Console: un Google Apps Script che gira nell'account
// Google di Riccardo (script.google.com) e fa per l'app le operazioni su Calendario e Drive.
// L'app genera il codice con dentro una chiave segreta; lo script risponde solo a chi la conosce.

export const SCRIPT_VERSION = 1;

export function appsScriptCode(key: string): string {
  return `// RF Coaching – ponte verso Google Calendar e Google Drive (versione ${SCRIPT_VERSION})
// Incolla questo codice in un nuovo progetto su script.google.com e pubblicalo come
// "App web" (Esegui come: Me · Chi può accedere: Chiunque). Non condividere questo codice:
// contiene la chiave che permette all'app di usare il tuo Calendario e il tuo Drive.
const KEY = ${JSON.stringify(key)};
const TZ = 'Europe/Rome';

function doPost(e) {
  let out;
  try {
    const req = JSON.parse(e.postData.contents);
    if (req.key !== KEY) throw new Error('Chiave non valida');
    out = { ok: true, result: handle(req.action, req.args || {}) };
  } catch (err) {
    out = { ok: false, error: String(err && err.message || err) };
  }
  return ContentService.createTextOutput(JSON.stringify(out)).setMimeType(ContentService.MimeType.JSON);
}

function doGet() {
  return ContentService.createTextOutput('RF Coaching: ponte Google attivo.');
}

function parseLocal(s) { return Utilities.parseDate(s, TZ, "yyyy-MM-dd'T'HH:mm"); }

function folderInfo(f) { return { id: f.getId(), name: f.getName(), createdTime: f.getDateCreated().toISOString(), mimeType: 'application/vnd.google-apps.folder' }; }
function fileInfo(f) { return { id: f.getId(), name: f.getName(), createdTime: f.getDateCreated().toISOString(), mimeType: f.getMimeType() }; }

function getCalendar(id) {
  const cal = CalendarApp.getCalendarById(id);
  if (!cal) throw new Error('Calendario non trovato');
  return cal;
}

function handle(action, a) {
  switch (action) {
    case 'ping':
      return { account: Session.getEffectiveUser().getEmail(), version: ${SCRIPT_VERSION} };

    case 'ensureCalendar': {
      if (a.id) { const c = CalendarApp.getCalendarById(a.id); if (c) return { id: c.getId() }; }
      const found = CalendarApp.getOwnedCalendarsByName(a.name);
      const cal = found.length ? found[0] : CalendarApp.createCalendar(a.name, { timeZone: TZ });
      return { id: cal.getId() };
    }

    case 'upsertEvent': {
      const cal = getCalendar(a.calendarId);
      const start = parseLocal(a.start), end = parseLocal(a.end);
      let ev = a.eventId ? cal.getEventById(a.eventId) : null;
      if (ev) {
        ev.setTitle(a.title); ev.setTime(start, end); ev.setLocation(a.location || ''); ev.setDescription(a.description || '');
      } else {
        ev = cal.createEvent(a.title, start, end, { location: a.location || '', description: a.description || '' });
      }
      return { id: ev.getId() };
    }

    case 'deleteEvent': {
      const ev = getCalendar(a.calendarId).getEventById(a.eventId);
      if (ev) ev.deleteEvent();
      return {};
    }

    case 'ensureFolder': {
      if (a.id) {
        try { const f = DriveApp.getFolderById(a.id); if (!f.isTrashed()) return { id: f.getId() }; } catch (err) { /* cartella sparita */ }
      }
      const it = DriveApp.getRootFolder().getFoldersByName(a.name);
      return { id: (it.hasNext() ? it.next() : DriveApp.createFolder(a.name)).getId() };
    }

    case 'saveBackup': {
      const folder = DriveApp.getFolderById(a.parent).createFolder(a.name);
      for (const f of a.files) {
        const blob = f.base64 != null
          ? Utilities.newBlob(Utilities.base64Decode(f.base64), f.mime, f.name)
          : Utilities.newBlob(f.text, f.mime, f.name);
        folder.createFile(blob);
      }
      return { id: folder.getId() };
    }

    case 'list': {
      const parent = DriveApp.getFolderById(a.parent);
      const out = [];
      const folders = parent.getFolders();
      while (folders.hasNext()) out.push(folderInfo(folders.next()));
      if (!a.foldersOnly) { const files = parent.getFiles(); while (files.hasNext()) out.push(fileInfo(files.next())); }
      out.sort(function (x, y) { return x.createdTime < y.createdTime ? 1 : -1; });
      return { files: out };
    }

    case 'download':
      return { text: DriveApp.getFileById(a.id).getBlob().getDataAsString('UTF-8') };

    case 'trash': {
      try { DriveApp.getFolderById(a.id).setTrashed(true); } catch (err) { DriveApp.getFileById(a.id).setTrashed(true); }
      return {};
    }

    default:
      throw new Error('Azione sconosciuta: ' + action);
  }
}
`;
}
