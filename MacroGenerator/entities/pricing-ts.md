---
title: src/pricing.ts
tags: [entity, service, api, binance]
source: src/pricing.ts
date: 2026-04-25
status: active
---

# src/pricing.ts (708 satır)

**Centralized data fetching layer.** Single transit point for all Binance Futures (`fapi`) and Spot (`api`) API calls. UI components never do `fetch` directly.

## Architectural principles

1. **Multi-base fallback** — 4 alternative base URLs are tried sequentially for each endpoint (`fapi.binance.com`, `fapi1`, `fapi2`, `fapi3`). See [[concepts/binance-fapi-fallback]]
2. **Hard-fail vs soft-fail** — 429 (rate limit), 418 (IP ban), 451 (regional block) → anında `throw`. Network/transient hata → bir sonraki base'i dene
3. **Pagination** — `fetchAllKlines` Paginates with 1500 chunks (max guard 1000 iterations)
4. **PROXY** constant defaults to the `macro-analytics` Worker URL (`https://macro-analytics.grkmtkc94.workers.dev`), overridable via `VITE_BINANCE_PROXY`. Empty string disables. When a proxy is set, `fetchWithFallback` short-circuits its multi-base loop because the Worker performs server-side fallback. See [[decisions/2026-04-27-worker-as-binance-cors-proxy]] and [[bugs/2026-04-27-binance-fapi-cors-on-pages]].

## Public API

| Function | Purpose |
|---|---|
| `getTriggerMinuteCandles(symbol, ts, market)` | Pull both Mark and Last 1m candles of one minute |
| `getRangeHighLow(symbol, from, to, market)` | open/high/low/close + times for Mark + Last in range |
| `getLastPriceAtSecond(symbol, at, market)` | OHLC from aggTrades at second resolution |
| `getNearestFunding(symbol, targetUtc)` | Funding record closest to target moment (10/30/90min window) |
| `getMarkPriceClose1m(symbol, fundingTimeMs)` | If there is no markPrice in Funding, fallback from 1m closing |
| `getAllSymbolPrecisions()` | pricePrecision map of all symbols — **module-scope cached** |
| `findPriceOccurrences(...)` | The first time a given price passed in the past — hierarchical (1d → 1m → aggTrades) |
| `findClosestMiss(...)` | When `findPriceOccurrences` returns null, returns the closer side (high vs low), miss distance and miss percentage. Reuses `getRangeHighLow`. |
| `analyzeMarkVsLastGap(...)` | Futures-only. Fetches Mark + Last 1m candles in parallel, finds first-touch per side, summarizes high/low + per-side closest miss, aligns by minute and reports the largest Mark-vs-Last gap. |
| `checkTrailingStop(...)` | Trailing stop simülasyonu (activation + callback %) |

## Important details

- **Hierarchical price search** (`findPriceOccurrences`): For intervals larger than 2 days, first scans daily candles, goes down to 1m on matching days, then second precision with aggTrades. Otherwise, 100K+ requests would be made for the question "when was this price worth it?"
- **Trailing stop data source per market/priceType** (`checkTrailingStop`):
  - **Futures Last Price** → `/fapi/v1/aggTrades` directly, tick precision. Binance Futures klines does **not** support `interval=1s` (returns `-1120 "Invalid interval"`), so the previous "1s first → aggTrades fallback" path was a dead round-trip. See [[decisions/2026-05-02-skip-1s-klines-on-futures]] and [[bugs/2026-05-02-trailing-stop-fictional-trough]].
  - **Spot Last Price** → `/api/v3/klines?interval=1s` first, fall back to `/api/v3/aggTrades` when empty. Spot does support `interval=1s`.
  - **Futures Mark Price** → `/fapi/v1/markPriceKlines?interval=1m` only — Binance does not publish sub-minute Mark Price; result is flagged `isApproximate: true`.
- **Trailing stop sub-points order** (`checkTrailingStop`, candle paths): `[o, l, h, cl]` for Short, `[o, h, l, cl]` for Long — to reduce look-ahead bias. Worst-case assumption.
- **Symbol precision cache** at module level — not cleared on page refresh, but call `/fapi/v1/exchangeInfo` once per session

Components using ##

[[entities/macro-generator-component]] · [[entities/funding-macro-component]] · [[entities/price-lookup]] · [[entities/live-ticker]]

## Recent updates (2026-05-03)

- **`Math.max(...arr)` → `argMax`/`argMin` fold.** Long ranges
  (~125k+ candles) used to throw `RangeError: Maximum call stack
  size exceeded`. Three sites in `getRangeHighLow` (spot last,
  futures mark, futures last) plus `getLastPriceAtSecond` now use a
  linear fold helper at the top of the file. See
  [[bugs/2026-05-03-pricing-math-max-stack-overflow]].
- **`getTriggerMinuteCandles` end-time off-by-one.** Binance treats
  `endTime` inclusively, so `start + 60_000` was returning two
  candles. Now `start + 60_000 - 1`. See
  [[bugs/2026-05-03-pricing-trigger-minute-end-off-by-one]].
- **Better error messages.** 5xx now surface as "Binance temporarily
  unavailable, retry"; 418 message corrected to say the *Worker* IP is
  blocked (not the user's), so users don't try VPN as a fix.
- **Defensive `Array.isArray(trades)` in `getLastPriceAtSecond`.**
  Previously a delisted-symbol error JSON would slip through and
  throw `TypeError`.

## Sources

- [[sources/sessions/2026-05-02-trailing-stop-clusdt-tick-precision]] — `checkTrailingStop` Futures Last Price now bypasses dead 1s klines path
- [[sources/sessions/2026-05-03-full-codebase-audit-and-remediation]]

## Related

- [[entities/binance-fapi]] — external API it connects to
- [[entities/analytics-system]] — the same Worker that ingests `/track` also serves `/fapi/*` and `/api/*` proxy
- [[concepts/mark-vs-last-price]]
- [[concepts/binance-fapi-fallback]]
- [[concepts/trailing-stop-simulation]]
- [[decisions/2026-04-22-multi-base-fallback]]
- [[decisions/2026-04-27-worker-as-binance-cors-proxy]]
- [[decisions/2026-05-02-skip-1s-klines-on-futures]]
- [[bugs/2026-05-02-trailing-stop-fictional-trough]]
- [[bugs/2026-05-03-pricing-math-max-stack-overflow]]
- [[bugs/2026-05-03-pricing-trigger-minute-end-off-by-one]]
- [[sources/sessions/2026-04-27-price-lookup-closest-miss-gap-explainer]]
- [[sources/sessions/2026-05-02-trailing-stop-clusdt-tick-precision]]
