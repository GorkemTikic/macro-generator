---
title: Price Lookup — Closest Miss + Gap Explainer + Worker CORS proxy
tags: [session, price-lookup, analytics, worker, proxy]
source: in-conversation session
date: 2026-04-27
status: active
---

# 2026-04-27 — Closest Miss, Gap Explainer, Worker CORS proxy

In-conversation session. Three layered tasks: feature build, verification pass, then a production-blocking CORS fix.

## What changed

### 1. Closest Miss (inside Find Price)
- `findPriceOccurrences` returning null no longer ends in a generic "not reached" message.
- New helper [[entities/pricing-ts]] `findClosestMiss(symbol, from, to, target, market, priceType)` reuses `getRangeHighLow` and returns the closer side (high vs low), miss distance, miss percentage, and the formatted closest time.
- Component renders a basic-English support summary in the existing result textarea. Header becomes a soft `⚠️ Target reached: Yes (approx — exact moment not pinpointed)` in the rare case where `findPriceOccurrences` hit its hierarchical-search caps but the range high/low does include the target.

### 2. Gap Explainer (new mode card)
- Sibling mode inside the Price Lookup mode selector. Futures-only — Spot is blocked with a localized error before any fetch.
- Inputs: from / to / optional target price / optional trigger type (MARK | LAST | None).
- New helper `analyzeMarkVsLastGap(symbol, from, to, target?)` fetches Mark + Last 1m candles in parallel, finds first-touch per side, summarizes high/low and a per-side closest miss, then aligns the two series by 1m open timestamp via `Map` and reports the largest minute-aligned gap.
- Support summary is deterministic: selected from a fixed set of locale strings keyed off `(last_reached, mark_reached, trigger_type)`.

### 3. Analytics extension
- `lookup_query` for `mode='findPrice'` now carries `result_state: 'reached' | 'closest_miss'`.
- `lookup_query` for `mode='gapExplainer'` carries `trigger_type` and `has_target`.
- New event type `gap_explainer_checked` added to the `EventType` union — additionally carries `last_reached`, `mark_reached`. Worker stores `event_type` as TEXT, so no D1 schema change. See [[decisions/2026-04-27-gap-explainer-checked-event]].

### 4. Worker as Binance CORS proxy
- Production console showed `ERR_CONNECTION_RESET` on `fapi.binance.com` and CORS rejections on `fapi1/2/3` for every Price Lookup mode (existing modes affected too — not a new-feature regression).
- Added `/fapi/*` and `/api/*` GET routes to the existing `macro-analytics` Worker. Performs server-side multi-base fallback across the 4 Binance hosts and attaches the same CORS headers used by `/track`. 429 / 418 / 451 are propagated unchanged so the existing client error path still surfaces them.
- `PROXY` constant in [[entities/pricing-ts]] now defaults to the Worker URL (overridable via `VITE_BINANCE_PROXY`). The client's own multi-base loop short-circuits when `PROXY` is set, since the Worker handles fallback.
- Worker redeployed via `wrangler deploy`; verified live with `curl -H "Origin: https://gorkemtikic.github.io" .../fapi/v1/klines?...` → `200 OK`.
- See [[decisions/2026-04-27-worker-as-binance-cors-proxy]] and [[bugs/2026-04-27-binance-fapi-cors-on-pages]].

## Files touched

| File | Change |
|---|---|
| `src/pricing.ts` | `findClosestMiss`, `analyzeMarkVsLastGap`, `PROXY` default to Worker URL, `fetchWithFallback` short-circuits when proxy set |
| `src/components/PriceLookup.tsx` | Closest Miss block in Find Price, new `gapExplainer` mode card + inputs, find-price helper text, deterministic support summaries |
| `src/locales.ts` | Full EN + TR strings for both features (~40 keys) |
| `src/analytics/index.ts` | Adds `gap_explainer_checked` to `EventType` union |
| `worker/index.ts` | New `/fapi/*` and `/api/*` proxy routes with multi-base fallback |

## Commits on `main`

- `57f4b8a` — Add Closest Miss + Gap Explainer to Price Lookup
- `0977137` — Route Binance fetches through analytics Worker to bypass CORS

## Verification

- `npx tsc --noEmit` — clean before and after fix.
- Locale-key consumption scan — zero unused keys, zero TR gaps.
- Branch flow audit — `findPrice` (reached / closest_miss / no-data) and `gapExplainer` paths each `return;` after their own tracking; bottom generic `lookup_query` is unchanged for legacy modes.
- Worker proxy probed live via curl after deploy.

## Out of scope (noted, not fixed)

- LiveTicker uses `wss://fstream.binance.com/ws/...@markPrice` directly. WebSocket proxying is a different mechanism than HTTP fetch and was deliberately not included. The header ticker is decorative; lookup features do not depend on it.

## Related

- [[entities/price-lookup]]
- [[entities/pricing-ts]]
- [[entities/analytics-system]]
- [[concepts/mark-vs-last-price]]
- [[concepts/binance-fapi-fallback]]
- [[decisions/2026-04-27-worker-as-binance-cors-proxy]]
- [[decisions/2026-04-27-gap-explainer-checked-event]]
- [[bugs/2026-04-27-binance-fapi-cors-on-pages]]
