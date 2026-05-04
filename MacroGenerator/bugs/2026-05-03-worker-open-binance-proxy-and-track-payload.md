---
title: Worker had open Binance proxy and unbounded /track payload
tags: [bug, security, worker, fixed]
source: sources/sessions/2026-05-03-full-codebase-audit-and-remediation.md
date: 2026-05-03
status: fixed
---

# Bug: Worker had open Binance proxy and unbounded /track payload

## Symptom

Two distinct gaps on the deployed Cloudflare Worker
(`worker/index.ts`):

### A. Open Binance proxy

`/sapi/*`, `/fapi/*`, `/api/*` forwarded **any** path to Binance with
no allowlist. CORS headers were applied (so a browser from a non-allowed
origin would CORS-fail), but a server-side caller (`curl`, scraper)
ignores CORS entirely. The `/sapi/*` route additionally injected
`X-MBX-APIKEY` (a real Binance MARKET_DATA key from
`env.BINANCE_API_KEY`), so anyone could issue authenticated SAPI calls
via this Worker.

Risks:

- Worker IP gets banned (HTTP 418/451) — the deployed Pages app stops
  working.
- Cloudflare quota burned by anonymous traffic.
- Binance API key's per-IP rate limit consumed.

### B. Unbounded `/track`

```ts
const body = await request.json() as Record<string, unknown>;
const eventType = String(body.event || 'unknown').slice(0, 64);
const sessionId = String(body.session_id || '').slice(0, 64);
...
const props = JSON.stringify(body.props && typeof body.props === 'object' ? body.props : {});
```

No body size cap. A 10 MB `props` blob would write straight into D1.
Event type was untyped — any string value passed through. No per-key
limit on `props`, no value-type sanity (`props.foo = {nested: deep}`
got serialized as-is).

## Fix

Both issues fixed in `worker/index.ts`:

### A1. Path allowlists

```ts
const FAPI_PATH_ALLOW = [
  '/fapi/v1/klines',
  '/fapi/v1/markPriceKlines',
  '/fapi/v1/aggTrades',
  '/fapi/v1/premiumIndex',
  '/fapi/v1/fundingRate',
  '/fapi/v1/exchangeInfo',
];
const SPOT_PATH_ALLOW = [
  '/api/v3/klines',
  '/api/v3/aggTrades',
  '/api/v3/exchangeInfo',
];
const SAPI_PATH_ALLOW = [
  '/sapi/v1/margin/exchange-small-liability',
  '/sapi/v1/margin/restricted-list',
  '/sapi/v1/margin/exchange-info',
];
```

Each handler checks `if (!ALLOW.includes(url.pathname)) return 403`
before the upstream fetch.

### A2. CORS hardening

`corsHeaders()` now also returns:

- `Vary: Origin` — prevents a denied preflight from poisoning a
  permitted origin's cached response.
- `Access-Control-Max-Age: 86400` — caches successful preflights so
  every request doesn't pay the extra OPTIONS RTT.

`requireAdmin()` now uses a constant-time string compare
(`timingSafeEqual` helper) instead of `===`. Token timing attacks aren't
realistic against a Worker (network jitter dominates), but the defense
is one line.

### B1. /track caps

```ts
// 16 KB body cap (legitimate payload is ~300 B).
if (lenHeader && Number(lenHeader) > 16_384) return 413;
const text = await request.text();
if (text.length > 16_384) return 413;

// Event-type allowlist
const ALLOWED_EVENTS = new Set([
  'page_view', 'tab_switch', 'lang_switch',
  'macro_generated', 'macro_error', 'grid_paste_used',
  'lookup_query', 'lookup_error', 'trailing_stop_checked', 'gap_explainer_checked',
  'funding_query', 'funding_error',
  'average_calc_run',
  'margin_view', 'margin_refresh', 'margin_error',
  'error',
]);
if (!ALLOWED_EVENTS.has(eventType)) return 400 'unknown_event_type';

// Props caps
const entries = Object.entries(body.props as Record<string, unknown>).slice(0, 32);
for (const [k, v] of entries) {
  const safeKey = String(k).slice(0, 64);
  if (v === null || ['string', 'number', 'boolean'].includes(typeof v)) {
    propsObj[safeKey] = typeof v === 'string' ? v.slice(0, 256) : v;
  }
}
let props = JSON.stringify(propsObj);
if (props.length > 4096) props = '{}';
```

## What still needs to land

- **Per-IP rate limit**: not added in this pass. Needs a
  `RATE_LIMIT_KV` binding in `wrangler.toml` and a deploy. Open issue.
- **Pre-aggregated D1 daily rollup**: not added. The 10-query
  `Promise.all` on `/admin/stats` will eventually trip Worker CPU
  budget once the events table grows past ~1M rows.

## Schema note

`worker/schema.sql` was updated:

- `id INTEGER PRIMARY KEY` (dropped `AUTOINCREMENT` for new DBs only —
  the existing live DB keeps its current schema; the file change is
  forward-only).
- New composite index `idx_events_tab_ts(tab, ts)` for the
  `WHERE tab = ? AND ts >= ?` admin query pattern.

These need `wrangler d1 execute macro-analytics-db --file=worker/schema.sql`
to apply to the deployed DB. Not run in this session.

## Related files

- `worker/index.ts`
- `worker/schema.sql`

## Sources

- [[sources/sessions/2026-05-03-full-codebase-audit-and-remediation]]

## Related

- [[decisions/2026-05-03-worker-path-allowlist]]
- [[entities/analytics-system]]
- [[entities/binance-fapi]]
- [[entities/binance-sapi-margin]]
