---
title: Binance API Multi-Base Fallback
tags: [concept, networking, resilience]
source: src/pricing.ts
date: 2026-04-25
status: active
---

# Binance API Multi-Base Fallback

Binance serves the same API for geographic resilience through 4 alternative hosts. [[entities/pricing-ts]] uses this in the `fetchWithFallback` helper.

## Row

```
fapi.binance.com   → fapi1 → fapi2 → fapi3   (futures)
api.binance.com    → api1  → api2  → api3    (spot/sapi)
```

The first successful response is returned; If all fail, the final error is `throw`.

## Hard-fail rules

For these errors, it does not fallback** — it throws an error immediately:

| HTTP | Meaning | Reason |
|---|---|---|
| 429 | Rate limit | Too many requests; Another host also falls to the same limit |
| 418 | IP banned | Mirrors also ban the same IP |
| 451 | Regional block | All Binance hosts are subject to the same geo-block list |

Since these errors will give the same result in mirror, no requests will be wasted.

## CORS

The 4-base fallback **does not fix the CORS issue** — all mirrors share the same CORS policy and the same regional reachability problems on GitHub Pages. Solutions in use:

- **Production**: `PROXY` in [[entities/pricing-ts]] points to the `macro-analytics` Worker, which exposes `/fapi/*` and `/api/*` routes that perform the same multi-base fallback **server-side** and attach CORS headers. See [[decisions/2026-04-27-worker-as-binance-cors-proxy]] and [[bugs/2026-04-27-binance-fapi-cors-on-pages]].
- **Dev**: Vite dev proxy via `/api-binance` ([[entities/vite-config]]).

When `PROXY` is set, the client's `fetchWithFallback` short-circuits its loop because the Worker handles fallback.

## COW difference

Endpoint `/sapi/v1/margin/restricted-asset` is **with auth** (X-MBX-APIKEY header). Browser cannot send this header cross-origin → multi-base fallback is not enough. See [[bugs/2026-04-22-cors-failed-to-fetch]].

## Sources

- [[sources/sessions/2026-04-22-margin-restrictions-build]] — user "failed to fetch" error opened this context

## Related

- [[entities/pricing-ts]]
- [[entities/binance-fapi]]
- [[entities/binance-sapi-margin]]
- [[entities/analytics-system]] — Worker that hosts the proxy routes
- [[decisions/2026-04-22-multi-base-fallback]]
- [[decisions/2026-04-27-worker-as-binance-cors-proxy]]
- [[bugs/2026-04-22-cors-failed-to-fetch]]
- [[bugs/2026-04-27-binance-fapi-cors-on-pages]]
