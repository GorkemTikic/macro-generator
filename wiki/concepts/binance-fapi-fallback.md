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

This fallback **does not fix the CORS issue** — they all have the same CORS policy. Separate solution for CORS: `PROXY` constant ([[entities/pricing-ts]]) or Vite dev proxy ([[entities/vite-config]]).

## COW difference

Endpoint `/sapi/v1/margin/restricted-asset` is **with auth** (X-MBX-APIKEY header). Browser cannot send this header cross-origin → multi-base fallback is not enough. See [[bugs/2026-04-22-cors-failed-to-fetch]].

## Sources

- [[sources/sessions/2026-04-22-margin-restrictions-build]] — user "failed to fetch" error opened this context

## Related

- [[entities/pricing-ts]]
- [[entities/binance-fapi]]
- [[entities/binance-sapi-margin]]
- [[decisions/2026-04-22-multi-base-fallback]]
- [[bugs/2026-04-22-cors-failed-to-fetch]]
