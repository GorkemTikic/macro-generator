---
title: Use the analytics Worker as a Binance CORS proxy
tags: [decision, worker, cors, networking]
source: in-conversation session
date: 2026-04-27
status: active
---

# Use the existing macro-analytics Worker as a Binance CORS proxy

## Context

GitHub Pages (production) cannot reach Binance fapi/api directly:

- `fapi.binance.com` → `ERR_CONNECTION_RESET` for the user's region.
- `fapi1.binance.com` / `fapi2` / `fapi3` → respond `302` to a regional host that omits `Access-Control-Allow-Origin`, so the browser blocks the response.

This affected **every** Price Lookup mode, not just the new Gap Explainer. The empty `PROXY` constant in [[entities/pricing-ts]] and the [[concepts/binance-fapi-fallback]] note already anticipated this need.

## Options considered

1. **Set up a third-party CORS proxy** — fragile, rate-limited, and trust-shifting.
2. **Run a separate Worker dedicated to proxying** — extra deployment to maintain.
3. **Add proxy routes to the existing `macro-analytics` Worker** — the same Worker that already serves `/track` and `/admin/*` is already in use by the production app, has the right `ALLOWED_ORIGIN`, and was already paid for in deploy time. Chosen.
4. **Move all pricing fetches server-side** — biggest blast radius, would have required reshaping the entire data layer. Deferred.

## Decision

The `macro-analytics` Worker exposes two new GET routes:

- `/fapi/*` → forwards to `fapi.binance.com` → `fapi1` → `fapi2` → `fapi3` (server-side fallback).
- `/api/*` → forwards to `api.binance.com` → `api1` → `api2` → `api3`.

Hard-limit responses (`429` / `418` / `451`) are propagated unchanged so the client's existing error-mapping logic in `fetchWithFallback` still surfaces them. CORS headers are reused from the existing `corsHeaders` helper, gated by `ALLOWED_ORIGIN`.

In [[entities/pricing-ts]], `PROXY` defaults to the Worker URL (overridable via `VITE_BINANCE_PROXY`). When `PROXY` is set, `fetchWithFallback` skips its own multi-base loop because the Worker performs the fallback.

## Why not also keep client-side fallback when proxy is set

When the proxy is configured, every `bases[i]` collapses to the same Worker URL. Looping would just retry the same call N times. Short-circuiting keeps the request count to one and lets the Worker do the only fallback that matters.

## Out of scope

- WebSockets (LiveTicker `wss://fstream.binance.com/ws/...@markPrice`). Proxying WS through a CF Worker is possible but uses a different API surface; ticker is decorative and Lookup features do not depend on it.
- Binance SAPI (margin restrictions). That endpoint is auth-gated with `X-MBX-APIKEY` and goes through a different code path; see [[bugs/2026-04-22-cors-failed-to-fetch]].

## Consequences

- All pricing-dependent features (Trigger, Range, Find Price, Trailing, Last 1s, Closest Miss, Gap Explainer, Funding macro) now work from GitHub Pages.
- One additional Worker request per pricing call. Latency cost is one extra hop; throughput cost is bounded by Workers' free-tier ceilings.
- A regional reachability problem on the **Worker side** would now block all pricing too. Acceptable trade given how broken the direct path was.

## Sources

- [[sources/sessions/2026-04-27-price-lookup-closest-miss-gap-explainer]]

## Related

- [[entities/pricing-ts]]
- [[entities/analytics-system]]
- [[concepts/binance-fapi-fallback]]
- [[bugs/2026-04-27-binance-fapi-cors-on-pages]]
