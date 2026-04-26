---
title: Binance multi-base host fallback (4 mirror)
tags: [decision, networking, resilience]
source: src/pricing.ts
date: 2026-04-22
status: active
---

# Verdict: 4 mirror host fallback for Binance fapi/sapi

## Context

Binance occasionally experiences regional or temporary outages. Relying on a single host = single point of failure.

## Decision

[[entities/pricing-ts]]'s `fetchWithFallback` helper tries 4 alternative base URLs for each endpoint, in order:

```
fapi.binance.com → fapi1 → fapi2 → fapi3
api.binance.com  → api1  → api2  → api3
```

The first successful response is returned.

## Hard-fail rules

Does not fallback on errors 429/418/451 — immediate throw. Reason: these errors will give the same result in mirrors (rate limit IP-based, ban IP-based, regional block geographical).

## Trade-off

- ✅ Automatic recovery in case of temporary outages
- ✅ Network glitch resilience (DNS fail vb.)
- ❌ If the first host is slow, total latency is high (timeout + retry)
- ❌ Doesn't solve the CORS issue (all mirrors have the same CORS policy)

Trade-off accepted — this pattern is why Binance offered alternative hosts exist.

## Sources

<!-- This decision existed in pricing.ts code before session 2026-04-22, indirect evidence -->

## Related

- [[entities/pricing-ts]]
- [[concepts/binance-fapi-fallback]]
- [[entities/binance-fapi]]
