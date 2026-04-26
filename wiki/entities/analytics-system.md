---
title: Analytics System
tags: [entity, analytics, cloudflare, admin]
source: src/analytics/index.ts, worker/, src/components/AdminDashboard.tsx
date: 2026-04-26
status: active
---

# Analytics System

Product analytics for FD Macro Generator. Tracks real user/agent interactions with each tab and feature — not just page views.

## Architecture

```
Browser (React app)
  └── src/analytics/index.ts   ← track() / trackDebounced()
        │  POST /track  (sendBeacon)
        ▼
Cloudflare Worker (macro-analytics)
  ├── Hashes IP with SHA-256  (raw IP never stored)
  ├── Reads CF-IPCountry header  (free geo, no DB)
  └── D1 (SQLite) → events table
        │
        ▼
Admin Dashboard (src/components/AdminDashboard.tsx)
  └── GET /admin/stats  (bearer token auth)
  └── GET /admin/events (bearer token auth)
```

## Files

| File | Purpose |
|---|---|
| `src/analytics/index.ts` | Client: `track()`, `trackDebounced()`, session/device IDs |
| `worker/index.ts` | Cloudflare Worker: ingests events, serves admin API |
| `worker/schema.sql` | D1 schema: `events` table + indexes |
| `worker/wrangler.toml` | Cloudflare Wrangler config (D1 binding, ALLOWED_ORIGIN) |
| `src/components/AdminDashboard.tsx` | React admin dashboard component |

## Event Catalog

| Event | Tab | Key Props |
|---|---|---|
| `page_view` | — | `lang`, `initial_tab` |
| `tab_switch` | new tab | `from`, `to` |
| `lang_switch` | — | `from`, `to` |
| `macro_generated` | macros | `macro_type`, `symbol`, `mode`, `tone`, `lang` |
| `macro_error` | macros | `macro_type`, `symbol`, `error` |
| `grid_paste_used` | macros | `symbol` |
| `lookup_query` | lookup | `mode`, `symbol`, `market`, `price_type` |
| `lookup_error` | lookup | `mode`, `symbol`, `error` |
| `trailing_stop_checked` | lookup | `symbol`, `direction`, `market`, `status` |
| `funding_query` | funding | `symbol`, `side`, `interval`, `mode`, `lang` |
| `funding_error` | funding | `symbol`, `error` |
| `average_calc_run` | average | `trade_count` |
| `margin_view` | margin | `has_api_key` |
| `margin_refresh` | margin | `has_api_key` |
| `margin_error` | margin | `error` |

## Session & Device Identity

- **Session ID** — UUID in `sessionStorage`. Resets on every page close/refresh. Represents one continuous usage session.
- **Device ID** — UUID in `localStorage` under key `_fd_did`. Persists until the user clears browser storage. Identifies a browser profile.
- **IP hash** — Server-side only. `SHA-256(raw_ip)[0..15]` (first 16 hex chars). Raw IP is never written to the database.
- **Country** — From Cloudflare's `CF-IPCountry` header. Free, no external geo-IP database needed.

## Privacy Design

- No cookies. No PII. No fingerprinting beyond the device UUID.
- IP is hashed server-side before storage; Cloudflare Workers execute before the Worker code in Cloudflare's network, so the raw IP never leaves the Worker's memory.
- The admin dashboard is gated by a bearer token that lives only in the admin's browser localStorage (`_fd_admin_token`).
- Tracking is a no-op if `VITE_ANALYTICS_URL` is not set.

## D1 Schema

```sql
CREATE TABLE IF NOT EXISTS events (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  event_type  TEXT    NOT NULL,
  session_id  TEXT    NOT NULL,
  device_id   TEXT,
  ip_hash     TEXT,
  country     TEXT    DEFAULT 'XX',
  tab         TEXT    DEFAULT '',
  props       TEXT    DEFAULT '{}',  -- JSON
  ts          INTEGER NOT NULL       -- Unix ms (client clock)
);
```

## Sources
- Implemented 2026-04-26

## Related
- [[decisions/github-pages-deploy]] — why a separate backend is required
- [[entities/app-tsx]] — admin tab is conditionally rendered
