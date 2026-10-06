-- Eventi letti da Google Calendar: dal link iCal segreto ('ical') oppure, con il collegamento
-- OAuth facoltativo, dal calendario principale ('primary') e dal calendario "RF Coaching" ('app').
-- È una copia di sola lettura,
-- rigenerata a ogni sincronizzazione: non va nei backup.
CREATE TABLE gcal_events (
  id TEXT PRIMARY KEY,            -- <calendarId>:<eventId>
  calendar TEXT NOT NULL,         -- 'ical' | 'primary' | 'app'
  summary TEXT NOT NULL DEFAULT '',
  location TEXT NOT NULL DEFAULT '',
  starts_at TEXT NOT NULL,        -- ora di Roma 'YYYY-MM-DDTHH:MM' (giornata intera: 'YYYY-MM-DDT00:00')
  ends_at TEXT NOT NULL,
  all_day INTEGER NOT NULL DEFAULT 0,
  html_link TEXT NOT NULL DEFAULT '',
  synced_at TEXT NOT NULL
);
CREATE INDEX idx_gcal_events_start ON gcal_events (starts_at);
