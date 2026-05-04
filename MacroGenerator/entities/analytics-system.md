---
title: Analytics System
tags: [entity, analytics, cloudflare, admin]
source: src/analytics/index.ts, worker/, src/components/AdminDashboard.tsx
date: 2026-04-26
status: active
---

# Analytics System

Product analytics for FD Macro Generator. Tracks real user and agent interactions with each tab and feature, not just page views.

## Architecture

```text
Browser (React app)
  src/analytics/index.ts
    -> track() / trackDebounced()
    -> POST /track via sendBeacon

Cloudflare Worker (macro-analytics)
  -> hashes IP with SHA-256
  -> reads CF-IPCountry header
  -> writes to D1 events table
  -> serves admin routes
  -> serves public Binance proxy routes

Admin Dashboard (src/components/AdminDashboard.tsx)
  -> GET /admin/stats
  -> GET /admin/events
  -> GET /admin/devices
  -> GET /admin/export

Workbook export (src/analytics/exportWorkbook.ts)
  -> ExcelJS `.xlsx` with 5 sheets, generated in-browser
```

## Files

| File | Purpose |
|---|---|
| `src/analytics/index.ts` | Client: `track()`, `trackDebounced()`, session/device IDs |
| `worker/index.ts` | Cloudflare Worker: ingests events, serves admin API, and proxies Binance REST requests |
| `worker/schema.sql` | D1 schema: `events` table + indexes |
| `worker/wrangler.toml` | Cloudflare Wrangler config (D1 binding, ALLOWED_ORIGIN) |
| `src/components/AdminDashboard.tsx` | React admin dashboard component |
| `src/analytics/exportWorkbook.ts` | ExcelJS workbook builder for `.xlsx` exports - see [[entities/export-workbook]] |
| `docs/analytics-dashboard-guide.{html,pdf}` | Leadership-facing PDF guide - see [[entities/analytics-dashboard-guide]] |

## Event Catalog

| Event | Tab | Key Props |
|---|---|---|
| `page_view` | n/a | `lang`, `initial_tab` |
| `tab_switch` | new tab | `from`, `to` |
| `lang_switch` | n/a | `from`, `to` |
| `macro_generated` | macros | `macro_type`, `symbol`, `mode`, `tone`, `lang` |
| `macro_error` | macros | `macro_type`, `symbol`, `error` |
| `grid_paste_used` | macros | `symbol` |
| `lookup_query` | lookup | `mode`, `symbol`, `market`, `price_type`, plus `result_state` for `mode=findPrice` (`reached` / `closest_miss`), plus `trigger_type` + `has_target` for `mode=gapExplainer` |
| `lookup_error` | lookup | `mode`, `symbol`, `error` |
| `trailing_stop_checked` | lookup | `symbol`, `direction`, `market`, `status` |
| `gap_explainer_checked` | lookup | `symbol`, `market`, `trigger_type`, `has_target`, `last_reached`, `mark_reached` - see [[decisions/2026-04-27-gap-explainer-checked-event]] |
| `funding_query` | funding | `symbol`, `side`, `interval`, `mode`, `lang` |
| `funding_error` | funding | `symbol`, `error` |
| `average_calc_run` | average | `trade_count` |
| `margin_view` | margin | `has_api_key` |
| `margin_refresh` | margin | `has_api_key` |
| `margin_error` | margin | `error` |

## Session And Device Identity

- **Session ID** - UUID in `sessionStorage`. Resets on every page close or refresh. Represents one continuous usage session.
- **Device ID** - UUID in `localStorage` under key `_fd_did`. Persists until the user clears browser storage. Identifies a browser profile.
- **IP hash** - Server-side only. `SHA-256(raw_ip)[0..15]` (first 16 hex chars). Raw IP is never written to the database.
- **Country** - From Cloudflare's `CF-IPCountry` header. Free, no external geo-IP database needed.

## Privacy Design

- No cookies. No PII. No fingerprinting beyond the device UUID.
- IP is hashed server-side before storage, so the raw IP never lands in D1.
- The admin dashboard is gated by a bearer token that lives only in the admin browser localStorage (`_fd_admin_token`).
- Tracking is a no-op if `VITE_ANALYTICS_URL` is not set.

## D1 Schema

```sql
-- worker/schema.sql, post-2026-05-03 hardening pass:
CREATE TABLE IF NOT EXISTS events (
  id          INTEGER PRIMARY KEY,         -- AUTOINCREMENT removed for new DBs
  event_type  TEXT    NOT NULL,
  session_id  TEXT    NOT NULL,
  device_id   TEXT,
  ip_hash     TEXT,
  country     TEXT    DEFAULT 'XX',
  tab         TEXT    DEFAULT '',
  props       TEXT    DEFAULT '{}',
  ts          INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_events_ts      ON events(ts);
CREATE INDEX IF NOT EXISTS idx_events_type    ON events(event_type);
CREATE INDEX IF NOT EXISTS idx_events_tab     ON events(tab);
CREATE INDEX IF NOT EXISTS idx_events_session ON events(session_id);
CREATE INDEX IF NOT EXISTS idx_events_country ON events(country);
CREATE INDEX IF NOT EXISTS idx_events_device  ON events(device_id);
-- Composite added 2026-05-03 for the `WHERE tab=? AND ts>=?` admin pattern.
CREATE INDEX IF NOT EXISTS idx_events_tab_ts  ON events(tab, ts);
```

The live D1 still has `AUTOINCREMENT` on its `id` column — the schema
file change is forward-only for fresh DBs. To pick up the new
composite index on the deployed DB, run
`wrangler d1 execute macro-analytics-db --file=worker/schema.sql`.
Not run as part of the 2026-05-03 audit pass.

## Admin API Surface

| Route | Purpose | Caps |
|---|---|---|
| `GET /admin/stats` | Aggregated KPIs + breakdowns + daily series | n/a |
| `GET /admin/events` | Recent raw events, paginated for the UI browse view | 200 rows |
| `GET /admin/devices` | Per-device summary, or events for a single `?device_id=` | 200 / 100 |
| `GET /admin/export` | Full data dump for workbook generation - see [[entities/export-workbook]] | 5,000 devices, 50,000 events |

All admin routes require `Authorization: Bearer <ADMIN_TOKEN>`.

## Public Binance Proxy Routes

The same Worker also serves public Binance fetches so GitHub Pages can reach Binance despite CORS or regional blocks:

| Route | Purpose |
|---|---|
| `GET /fapi/*` | Forwards to `fapi.binance.com` -> `fapi1` -> `fapi2` -> `fapi3` (server-side fallback) |
| `GET /api/*`  | Forwards to `api.binance.com` -> `api1` -> `api2` -> `api3` |
| `GET /sapi/*` | Forwards to `api.binance.com` SAPI with `X-MBX-APIKEY` injected from `BINANCE_API_KEY` (Margin Restrictions) |

Hard-fail responses (`429` / `418` / `451`) are propagated unchanged. CORS headers come from the same helper that gates `/track`. See [[decisions/2026-04-27-worker-as-binance-cors-proxy]] and [[bugs/2026-04-27-binance-fapi-cors-on-pages]].

### Path allowlist (2026-05-03 hardening)

Each proxy now enforces a string-list allowlist. Anything outside the
list returns 403 — see [[bugs/2026-05-03-worker-open-binance-proxy-and-track-payload]]
and [[decisions/2026-05-03-worker-path-allowlist]]:

- `FAPI_PATH_ALLOW`: `/fapi/v1/{klines, markPriceKlines, aggTrades, premiumIndex, fundingRate, exchangeInfo}`
- `SPOT_PATH_ALLOW`: `/api/v3/{klines, aggTrades, exchangeInfo}`
- `SAPI_PATH_ALLOW`: `/sapi/v1/margin/{exchange-small-liability, restricted-list, exchange-info}`

## /track hardening (2026-05-03)

`POST /track` previously accepted any JSON. After the audit pass it
enforces:

- 16 KB body cap (via `Content-Length` *and* re-checked after read).
- Event-type allowlist — anything outside the catalog above is rejected
  with `400 unknown_event_type`.
- `props` capped at 32 keys × 256 chars/value, primitives only;
  serialized blob capped at 4 KB.

CORS headers now also include `Vary: Origin` (prevents preflight cache
poisoning) and `Access-Control-Max-Age: 86400` (skips the OPTIONS RTT
on subsequent requests). Admin token compare uses a constant-time
helper.

## Sources

- [[sources/sessions/2026-04-26-analytics-build]]
- [[sources/sessions/2026-04-26-analytics-workbook-export]]
- [[sources/sessions/2026-04-27-price-lookup-closest-miss-gap-explainer]]
- [[sources/docs/2026-04-26-analytics-setup]]
- [[sources/sessions/2026-05-03-full-codebase-audit-and-remediation]]

## Related

- [[entities/export-workbook]] - `.xlsx` export pipeline
- [[entities/analytics-dashboard-guide]] - leadership-facing PDF doc
- [[decisions/github-pages-deploy]] - why a separate backend is required
- [[decisions/2026-04-26-cloudflare-workers-d1-analytics-backend]] - backend selection rationale
- [[decisions/2026-04-26-ip-hash-privacy]] - IP hashing design
- [[decisions/2026-04-26-localstorage-admin-token-gate]] - admin tab visibility
- [[decisions/2026-04-26-xlsx-workbook-over-csv]] - workbook over CSV
- [[decisions/2026-04-26-admin-export-endpoint]] - dedicated export route
- [[decisions/2026-04-26-devices-not-users-framing]] - honest user-count labelling
- [[entities/app-tsx]] - admin tab is conditionally rendered
- [[bugs/2026-05-03-worker-open-binance-proxy-and-track-payload]]
- [[bugs/2026-05-03-admin-dashboard-401-swallowed]]
- [[decisions/2026-05-03-worker-path-allowlist]]
