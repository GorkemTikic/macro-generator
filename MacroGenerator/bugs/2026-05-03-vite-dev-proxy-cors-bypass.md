---
title: Worker CORS rejects localhost; new Vite dev proxies for /track and /admin
tags: [bug, networking, cors, dev, fixed]
source: sources/sessions/2026-05-03-merge-into-macro-generator-and-redesign.md
date: 2026-05-03
status: fixed
---

# Bug: Admin login + LiveTicker fallback CORS-failed from `localhost`

## Symptom

In dev (`npm run dev` at `http://localhost:5173/macro-generator/`):

- Admin login dialog showed "Failed to fetch" after submitting a
  valid token.
- DevTools console: dozens of CORS errors hitting
  `https://macro-analytics.grkmtkc94.workers.dev/admin/stats?since=…`
  with `Access-Control-Allow-Origin: null`.
- LiveTicker fallback poll (`/fapi/v1/premiumIndex`) CORS-failed
  with the same `null` Allow-Origin.
- Analytics `POST /track` events were silently failing — no rows
  appeared in the Worker's D1 database from local sessions.

## Root cause

The deployed Cloudflare Worker
(`worker/index.ts`, `corsHeaders()` at line 27) is configured with
`ALLOWED_ORIGIN` set to the GitHub Pages production origin. When
the request `Origin` header doesn't match, the helper returns the
literal string `'null'`:

```ts
const allowed = env.ALLOWED_ORIGIN || '*';
const origin  = request.headers.get('Origin') || '';
const effectiveOrigin =
  (allowed === '*' || origin === allowed)
    ? (allowed === '*' ? '*' : origin)
    : 'null';
```

Defense in production. Blocks all local dev. This is the same
foundational issue as
[[bugs/2026-04-27-binance-fapi-cors-on-pages]] (which addressed
`fapi.binance.com` from production), but now manifesting at the
opposite axis: localhost talking to the very Worker that solved
the previous case.

## Fix

### Vite dev proxies

Extended `vite.config.ts` with four new proxy entries that forward
server-to-server (no browser CORS preflight):

```ts
server: {
  proxy: {
    "/api-binance": {                   // SAPI (legacy, prefix-strip)
      target: "https://api.binance.com",
      changeOrigin: true,
      rewrite: (p) => p.replace(/^\/api-binance/, ""),
    },
    "/fapi":   { target: "https://fapi.binance.com",                     changeOrigin: true },
    "/api/v3": { target: "https://api.binance.com",                      changeOrigin: true },
    "/track":  { target: "https://macro-analytics.grkmtkc94.workers.dev", changeOrigin: true },
    "/admin":  { target: "https://macro-analytics.grkmtkc94.workers.dev", changeOrigin: true },
  },
},
```

Browser fetches `/admin/stats` → Vite forwards → Worker accepts
(server-side request, browser doesn't see Worker's `null`
Allow-Origin header).

### Tri-state ENDPOINT

Each client module that previously read `VITE_BINANCE_PROXY` or
`VITE_ANALYTICS_URL` was updated:

```ts
const _ENV = ((import.meta as unknown as { env?: ImportMetaEnv }).env)
  ?? ({} as ImportMetaEnv);
const _RAW = _ENV.VITE_BINANCE_PROXY;
const _DEFAULT = _ENV.DEV
  ? ""
  : "https://macro-analytics.grkmtkc94.workers.dev";
const PROXY = (_RAW ?? _DEFAULT).trim().replace(/\/$/, "");
// URL = `${PROXY}${path}`
//   PROXY = ""        → relative URL → Vite proxy
//   PROXY = "https://" → absolute → direct Worker fetch in prod
```

Same pattern applied to:

- `src/pricing.ts` (was already partly there from a prior session)
- `src/components/LiveTicker.tsx`
- `src/analytics/index.ts` — adds `ANALYTICS_DISABLED` flag for
  prod-no-env-set (replaces the old `if (!ENDPOINT) return;` guard
  that incorrectly silenced dev events too)
- `src/components/AdminDashboard.tsx` — adds `ENDPOINT_AVAILABLE`
  flag (true in dev, true in prod when env var is set)

### Boundary cast for tsx CLI

`pricing.ts` is also imported by `test-trailing-stop.ts` running
under `tsx` in plain Node, where `import.meta.env` does not exist.
A single boundary cast handles this without `as any` everywhere:

```ts
const _ENV = ((import.meta as unknown as { env?: ImportMetaEnv }).env)
  ?? ({} as ImportMetaEnv);
```

## Verification

After landing the fix:

```
$ curl http://localhost:5173/admin/stats?since=…
HTTP 401          # Worker reached, rejected for missing token (expected)

$ curl -X POST -H "Content-Type: application/json" \
  -d '{"event":"page_view","tab":"macros"}' \
  http://localhost:5173/track
HTTP 200          # event accepted

$ curl http://localhost:5173/fapi/v1/premiumIndex?symbol=BTCUSDT
{"symbol":"BTCUSDT","markPrice":"…",…}
```

Admin login dialog accepted a valid token and rendered the dashboard.
LiveTicker fallback poll began returning live mark-price data even
when WebSocket was blocked.

## Production behaviour

Unchanged. In production builds, `_ENV.DEV` is false, so PROXY /
ENDPOINT default to the deployed Worker URL. The Worker's
`ALLOWED_ORIGIN` allowlist accepts the GitHub Pages origin → direct
browser fetch works → no proxy involved.

## Related files

- `vite.config.ts` — proxy table
- `src/pricing.ts` — tri-state PROXY + boundary cast
- `src/components/LiveTicker.tsx` — tri-state PROXY
- `src/analytics/index.ts` — tri-state ENDPOINT + `ANALYTICS_DISABLED`
- `src/components/AdminDashboard.tsx` — tri-state ENDPOINT +
  `ENDPOINT_AVAILABLE`
- `worker/index.ts` line 27 — `corsHeaders()` (unchanged; the
  prod allowlist is intentional)

## Sources

- [[sources/sessions/2026-05-03-merge-into-macro-generator-and-redesign]]

## Related

- [[entities/vite-config]]
- [[entities/pricing-ts]]
- [[entities/live-ticker]]
- [[entities/analytics-system]]
- [[bugs/2026-04-27-binance-fapi-cors-on-pages]] — antecedent CORS issue (same Worker)
- [[decisions/2026-04-22-vite-dev-proxy-for-cors]] — original `/api-binance` proxy decision
- [[decisions/2026-04-27-worker-as-binance-cors-proxy]] — antecedent decision
