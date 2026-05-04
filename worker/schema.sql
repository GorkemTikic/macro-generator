-- D1 (SQLite) schema for macro-generator analytics.
-- Apply with: wrangler d1 execute macro-analytics-db --file=schema.sql
--
-- For an existing DB, only run the new CREATE INDEX lines below (the existing
-- `idx_events_tab_ts` is the only addition since the original schema). Do
-- not try to drop AUTOINCREMENT on a populated table — keep what's there.

CREATE TABLE IF NOT EXISTS events (
  -- INTEGER PRIMARY KEY auto-increments via ROWID without sqlite_sequence
  -- bookkeeping, which is faster on insert. AUTOINCREMENT was removed to
  -- avoid the per-insert write to sqlite_sequence.
  id          INTEGER PRIMARY KEY,
  event_type  TEXT    NOT NULL,
  session_id  TEXT    NOT NULL,
  device_id   TEXT,
  ip_hash     TEXT,                  -- SHA-256 first 16 hex chars of IP — never raw
  country     TEXT    DEFAULT 'XX',  -- ISO-3166-1 alpha-2 from CF-IPCountry header
  tab         TEXT    DEFAULT '',
  props       TEXT    DEFAULT '{}',  -- JSON blob of event-specific properties
  ts          INTEGER NOT NULL       -- Unix milliseconds (client clock)
);

CREATE INDEX IF NOT EXISTS idx_events_ts      ON events(ts);
CREATE INDEX IF NOT EXISTS idx_events_type    ON events(event_type);
CREATE INDEX IF NOT EXISTS idx_events_tab     ON events(tab);
CREATE INDEX IF NOT EXISTS idx_events_session ON events(session_id);
CREATE INDEX IF NOT EXISTS idx_events_country ON events(country);
CREATE INDEX IF NOT EXISTS idx_events_device  ON events(device_id);
-- Composite index for the common admin query pattern `WHERE tab=? AND ts>=?`.
-- Speeds up Tab Usage breakdowns once the table grows past ~100k rows.
CREATE INDEX IF NOT EXISTS idx_events_tab_ts  ON events(tab, ts);
