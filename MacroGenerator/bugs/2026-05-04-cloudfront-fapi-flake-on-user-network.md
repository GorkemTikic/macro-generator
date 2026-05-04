---
title: Vite dev proxy 500s — fapi.binance.com (CloudFront) hangs from the user's network
tags: [bug, networking, dev-proxy, cloudflare-worker, cloudfront]
source: sources/sessions/2026-05-04-zh-cn-trilingual-and-ux-polish.md
date: 2026-05-04
status: fixed
---

# Vite dev proxy returns HTTP 500 (CloudFront flake)

## Symptom

In the Macro Generator panel:

> **Error:** Binance temporarily unavailable (HTTP 500). Please retry in a moment.

The error format comes from `pricing.ts` `fetchWithFallback` line 103
(any `res.status >= 500`). Reproduces deterministically through the
Vite dev proxy:

```bash
curl -s -o /dev/null -w "HTTP %{http_code} %{time_total}s\n" \
  "http://localhost:5173/fapi/v1/ping"
# HTTP 500  19.4 s    ← timeout, 0-byte body
```

The same request bypassing Vite (direct to Binance) shows the same
underlying behaviour:

```bash
curl -s --max-time 15 "https://fapi.binance.com/fapi/v1/ping"
# HTTP 000  resolve_time=0.005s  connect=0.094s  total=15.0 s
```

Affects every Price Lookup mode and the Macro Generator's range
fetch (which paginates 19 days × 1500 candles per request — any one
of the chunks hanging fails the whole macro).

## Root cause

Three layered facts on the user's network path:

1. **`fapi.binance.com` resolves to CloudFront** (`d2ukl3c6tymv7q.cloudfront.net`) and the user's network path completes the TCP handshake but then drops the HTTP request — the request hangs for the full timeout. Symptom is intermittent: most TLS handshakes succeed in <100 ms; some hang. Classic regional / ISP-level CloudFront interference.
2. **The numbered mirrors `fapi1/2/3.binance.com` are now redirect-only.** They respond `HTTP 302 → https://www.binance.com/en` (the marketing site) for any API path:

   ```bash
   curl -sI --max-time 8 "https://fapi1.binance.com/fapi/v1/ping"
   # HTTP/1.1 302 Moved Temporarily
   # Location: https://www.binance.com/en
   ```

   Binance has deprecated them as data endpoints (they probably still work for a subset of regions). The `pricing.ts` `F_BASES` array (`fapi/fapi1/2/3.binance.com`) is therefore dead in practice when called from this network — and `_PROXY_CONFIGURED = true` collapses it to `[PROXY]` anyway.
3. **The Vite dev proxy was hitting `fapi.binance.com` directly** (the original `vite.config.ts` target). It bubbled up the upstream timeout as a 500 with a 0-byte body.

The deployed Cloudflare Worker (`macro-analytics.grkmtkc94.workers.dev`)
was healthy throughout — its server-side multi-host fallback walks
the host list and the request succeeds on a host the user's network
*can* reach:

```bash
curl -s "https://macro-analytics.grkmtkc94.workers.dev/fapi/v1/markPriceKlines\
?symbol=BTCUSDT&interval=1m&startTime=…&endTime=…&limit=1500"
# HTTP 200  181 KB  0.43 s
```

## Fix

Repoint the Vite dev proxy targets at the Worker (server-to-server,
no CORS issue):

```ts
// vite.config.ts — changed
"/api-binance": { target: "https://macro-analytics.grkmtkc94.workers.dev", rewrite: strip /api-binance, … }
"/fapi":        { target: "https://macro-analytics.grkmtkc94.workers.dev", … }
"/api/v3":      { target: "https://macro-analytics.grkmtkc94.workers.dev", … }
```

Worker's path allowlist already covers everything the app calls.
No Worker change needed.

After the change:

```bash
curl -s -o /dev/null -w "HTTP %{http_code} %{time_total}s\n" \
  "http://localhost:5173/fapi/v1/ping"
# HTTP 200  ~1 s
```

## Why this is distinct from the 2026-04-27 production bug

[[bugs/2026-04-27-binance-fapi-cors-on-pages]] is the production-side
form of the same failure mode (browser hitting fapi via CORS from
GitHub Pages). The 2026-04-27 fix was: introduce the Worker as the
production proxy, and have `pricing.ts` default `PROXY` to the Worker
URL when not in DEV. **Dev was left targeting Binance directly** —
which only became a problem when the user's network started seeing
CloudFront drops in May 2026. This bug closes that loop.

## Trade-offs of the fix

- One extra hop in dev (Browser → Vite → Worker → Binance) — adds 50–100 ms per call. Worth it for the resilience.
- Worker free-tier rate budget (100k req/day) is far above any single dev session.
- `pricing.ts` `F_BASES` is now even more dead code; cleanup deferred.

See [[decisions/2026-05-04-vite-dev-proxy-via-worker]] for the full rationale + verification.

## Files

- `vite.config.ts` — proxy targets (`/fapi`, `/api/v3`, `/api-binance`) repointed at the Worker.

## Sources

- [[sources/sessions/2026-05-04-zh-cn-trilingual-and-ux-polish]]

## Related

- [[decisions/2026-05-04-vite-dev-proxy-via-worker]]
- [[bugs/2026-04-27-binance-fapi-cors-on-pages]] — production-side companion
- [[decisions/2026-04-22-vite-dev-proxy-for-cors]] — original dev-proxy decision (now superseded for these three routes)
- [[decisions/2026-04-27-worker-as-binance-cors-proxy]] — the prod-side decision the dev now mirrors
- [[entities/vite-config]]
- [[entities/pricing-ts]]
- [[entities/analytics-system]]
