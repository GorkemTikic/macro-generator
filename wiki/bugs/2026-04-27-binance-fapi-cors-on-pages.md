---
title: Binance fapi unreachable from GitHub Pages (CORS + connection-reset)
tags: [bug, networking, cors, production]
source: in-conversation session
date: 2026-04-27
status: fixed
---

# Binance fapi unreachable from GitHub Pages

## Symptom

In the browser console on `https://gorkemtikic.github.io/macro-generator/`:

```
fapi.binance.com/fapi/v1/klines?...   net::ERR_CONNECTION_RESET
fapi1.binance.com/fapi/v1/klines?...  302 Found  →  CORS rejection
fapi2…  same
fapi3…  same
```

Affected every Price Lookup mode (Trigger, Range, Find Price, Trailing, Last 1s) and the Funding macro. Not specific to the new Closest Miss / Gap Explainer features — they only made it more visible because the user tested them right after release.

## Root cause

Two layered failures, both pre-existing:

1. **`fapi.binance.com` connection reset** — Binance / its upstream rejects the connection at the network layer for the user's region/IP.
2. **`fapi1/2/3.binance.com` CORS rejection on redirect** — these mirrors respond `302` to a regional host that does not include `Access-Control-Allow-Origin` in its response. The browser's CORS check fails on the redirected response.

The `PROXY` constant in [[entities/pricing-ts]] was empty in production. The Vite dev proxy at `/api-binance` ([[entities/vite-config]]) hides this in dev — see [[decisions/2026-04-22-vite-dev-proxy-for-cors]].

## Fix

Added `/fapi/*` and `/api/*` routes to the existing `macro-analytics` Worker (`worker/index.ts`) that:

- Forward the request to the appropriate Binance pool with server-side multi-base fallback.
- Attach the existing CORS headers (gated by `ALLOWED_ORIGIN = https://gorkemtikic.github.io`).
- Propagate `429` / `418` / `451` unchanged so the client's hard-fail logic in `fetchWithFallback` still triggers.

`PROXY` in pricing.ts now defaults to `https://macro-analytics.grkmtkc94.workers.dev` (overridable via `VITE_BINANCE_PROXY`). When `PROXY` is set, the client skips its own multi-base loop because the Worker handles fallback.

See [[decisions/2026-04-27-worker-as-binance-cors-proxy]] for the alternatives considered and rationale.

## Verification

```
curl -s -o /dev/null -w "%{http_code}\n" \
  "https://macro-analytics.grkmtkc94.workers.dev/fapi/v1/klines?symbol=BTCUSDT&interval=1m&limit=2" \
  -H "Origin: https://gorkemtikic.github.io"
# → 200
```

After Pages auto-deploy from `main`, the production console is clean of `ERR_CONNECTION_RESET` and CORS errors for fapi/api calls.

## Related files

- `src/pricing.ts` — `PROXY` default + `fetchWithFallback` short-circuit when proxy is set
- `worker/index.ts` — `/fapi/*` and `/api/*` routes

## Sources

- [[sources/sessions/2026-04-27-price-lookup-closest-miss-gap-explainer]]

## Related

- [[concepts/binance-fapi-fallback]]
- [[entities/pricing-ts]]
- [[entities/analytics-system]]
- [[decisions/2026-04-27-worker-as-binance-cors-proxy]]
- [[bugs/2026-04-22-cors-failed-to-fetch]] — unrelated SAPI/auth case for context
