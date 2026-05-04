---
title: Route Vite dev proxy through the Cloudflare Worker (CloudFront-flake mitigation)
tags: [decision, dev-proxy, networking, cloudflare-worker]
source: sources/sessions/2026-05-04-zh-cn-trilingual-and-ux-polish.md
date: 2026-05-04
status: active
---

# Decision: Vite dev proxy targets the Worker, not Binance directly

## Context

Until 2026-05-04 the Vite dev proxy in `vite.config.ts` pointed
*directly* at Binance:

```ts
"/fapi":        { target: "https://fapi.binance.com", … }
"/api/v3":      { target: "https://api.binance.com", … }
"/api-binance": { target: "https://api.binance.com", rewrite: strip /api-binance, … }
```

In production this is fine — the browser hits the deployed Worker
(`PROXY` defaults to `https://macro-analytics.grkmtkc94.workers.dev`
in non-DEV builds, see [[entities/pricing-ts]]) and the Worker has
its own server-side multi-host fallback across `fapi/fapi1/2/3` and
`api/api1/...` per [[decisions/2026-04-27-worker-as-binance-cors-proxy]].
The dev path was the only one that talked to Binance directly.

Mid-session the user reported recurring `Binance temporarily
unavailable (HTTP 500)` from the Macro Generator. Diagnosis showed:

1. **`fapi.binance.com` (CloudFront-fronted) is intermittently dropped on the user's network path.** TCP handshake completes in ~94 ms, then the HTTP request hangs for the full timeout window (15–19 s) and curl returns HTTP 000. The Vite dev proxy bubbles this up as 500 with a 0-byte body (it's the proxy's timeout). Direct `curl` to the same URL has the same symptom.
2. **The numbered mirrors `fapi1/2/3.binance.com` are now redirect-only** — they respond 302 → `https://www.binance.com/en` (the marketing site) for any API path. Binance has effectively decommissioned them as data endpoints from this network. The `pricing.ts` `F_BASES` array therefore can't help — and `_PROXY_CONFIGURED = true` collapses all targets to a single proxy URL anyway.
3. **The deployed Worker** (`macro-analytics.grkmtkc94.workers.dev`) was healthy throughout: the same 19-day BTCUSDT klines call returned **HTTP 200, 181 KB, 0.43 s** when curled at the Worker. The Worker's server-side multi-host fallback walks the `fapi/api` host list and the request succeeds on a host that the user's network *can* reach.

## Decision

Repoint the Vite dev proxy targets at the Worker:

```ts
// vite.config.ts
"/api-binance": { target: "https://macro-analytics.grkmtkc94.workers.dev", rewrite: strip /api-binance, … }
"/fapi":        { target: "https://macro-analytics.grkmtkc94.workers.dev", … }
"/api/v3":      { target: "https://macro-analytics.grkmtkc94.workers.dev", … }
```

The Worker's path allowlist (`worker/index.ts`, `FAPI_PATH_ALLOW` /
`SPOT_PATH_ALLOW` / `SAPI_PATH_ALLOW`) already covers everything the
app calls — no Worker change required.

## Why CORS doesn't bite us

The Worker's `corsHeaders` function returns `Access-Control-Allow-Origin: null`
for any Origin not in `ALLOWED_ORIGIN` — and the dev origin
`http://localhost:5173` is not in the allowlist. Crucially, **CORS is
a browser-only enforcement**. Vite's dev proxy fetches server-side
(Node-side `http-proxy`); the Worker's CORS headers are sent in the
response but Node doesn't enforce them. The browser sees only
`http://localhost:5173/fapi/...` (same-origin), so no CORS check
ever runs.

This is exactly why the *original* dev-proxy decision
[[decisions/2026-04-22-vite-dev-proxy-for-cors]] worked when targeting
Binance directly — same mechanic, different upstream.

## Trade-offs

- **One extra hop in dev.** Browser → Vite → Worker → Binance, instead of Browser → Vite → Binance. Adds ~50–100 ms per request. Worth it for the resilience.
- **Worker free-tier rate limits.** The Cloudflare free tier ships 100k requests/day. A single dev session paginating through 19 days of 1-minute candles is ~20 requests. Easily within budget.
- **`pricing.ts` `F_BASES` is now even more dead code.** Was already collapsed to `[PROXY]` when `_PROXY_CONFIGURED`. Worth a future cleanup but harmless.
- **Margin SAPI works the same way.** The `/api-binance` rewrite strips `/api-binance` and forwards the remaining path; `/api-binance/sapi/v1/margin/...` becomes `https://macro-analytics.../sapi/v1/margin/...` which the Worker's `SAPI_PATH_ALLOW` covers.

## Verification

After the proxy change + Vite restart:
- `curl http://localhost:5173/fapi/v1/ping` → HTTP 200 `{}` in ~1 s (was: HTTP 500 after 19 s).
- The user's failing 19-day BTCUSDT range call → succeeds.
- `npm run build` 6.5 s green; `npm test` 79/79 passed.

## Related production-side bug

[[bugs/2026-04-27-binance-fapi-cors-on-pages]] — the prod-side companion of the same CloudFront / mirror-redirect failure mode. That bug was fixed by introducing the Worker as the prod proxy. This decision applies the same fix to dev.

## Sources

- [[sources/sessions/2026-05-04-zh-cn-trilingual-and-ux-polish]]

## Related

- [[bugs/2026-05-04-cloudfront-fapi-flake-on-user-network]]
- [[bugs/2026-04-27-binance-fapi-cors-on-pages]]
- [[decisions/2026-04-22-vite-dev-proxy-for-cors]] — the original dev proxy decision; superseded by this for `/fapi`, `/api/v3`, `/api-binance`
- [[decisions/2026-04-27-worker-as-binance-cors-proxy]] — the prod-side decision the dev now mirrors
- [[concepts/binance-fapi-fallback]]
- [[entities/vite-config]]
- [[entities/analytics-system]]
- [[entities/pricing-ts]]
