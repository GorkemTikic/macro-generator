-- D1 (SQLite) schema for macro-generator analytics.
-- Apply with: wrangler d1 execute macro-analytics-db --file=schema.sql

CREATE TABLE IF NOT EXISTS events (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
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
