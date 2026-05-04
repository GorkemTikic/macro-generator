---
title: Skip /fapi/v1/klines?interval=1s for Futures Last Price; go straight to aggTrades
tags: [decision, trailing-stop, pricing, futures, binance-api]
source: sources/sessions/2026-05-02-trailing-stop-clusdt-tick-precision.md
date: 2026-05-02
status: active
---

# Skip `/fapi/v1/klines?interval=1s` for Futures Last Price

## Decision

For `market === "futures"` and `priceType === "last"`, `checkTrailingStop` no longer attempts `/fapi/v1/klines?interval=1s`. The Futures Last Price flow goes directly to `/fapi/v1/aggTrades`.

The Spot path (`/api/v3/klines?interval=1s` first, fall back to `/api/v3/aggTrades`) is preserved.

The granularity label was also split: Futures Last Price now reports `"Last Price (aggTrades, tick precision)"`, Spot Last Price still reports `"Last Price (1s klines)"`, Mark Price unchanged.

## Why

1. **Binance Futures `klines` does not support `interval=1s`.** Direct call to `https://fapi.binance.com/fapi/v1/klines?symbol=CLUSDT&interval=1s&...` returns `{"code":-1120,"msg":"Invalid interval."}`. Spot does support it (`/api/v3/klines?interval=1s` works).
2. **The previous "1s first → aggTrades fallback" pattern was masquerading as a feature.** The analytics Worker proxy returns HTTP 200 with empty body for that unsupported call, so the client's `if (!chunk.length) break` always treated it as "no data" and silently fell through to `aggTrades`. The `granularity: "1s"` label was unreachable in production for Futures.
3. **aggTrades is the correct tick-precision source for Last Price anyway.** No information was being recovered from the dead 1s call — only one round-trip's worth of latency.
4. **The "1s" label in support output was misleading agents.** Customers who asked "what data resolution did you use?" got `1s` when the actual source was tick-by-tick aggTrades. Stating the real source removes a future support landmine.

## Trade-offs

- The Spot path keeps the dual lookup. Spot users still pay the cost of one `1s` klines call before falling through to aggTrades when 1s is empty. This is intentional: Spot does serve real data on the 1s endpoint, and that data is faster to summarize than walking individual trades when both are available.
- Mark Price is unchanged — Binance never publishes Mark Price below 1m, so `/fapi/v1/markPriceKlines?interval=1m` remains the only option.

## Verification

Unit tests in `test-trailing-stop.ts`:

- **Test 1** (real CLUSDT aggTrades fixture) asserts `dataSource === "last"`, `granularity === "aggTrades"`, `dataSourceLabel` matches `/aggTrades, tick precision/`, and `oneSecondKlineCalls === 0`.
- **Test 5** asserts `klineCalls === 0` for Futures Last Price across an end-to-end run.
- **Test 8** (new) asserts Spot Last Price still calls `/api/v3/klines?interval=1s` with `granularity === "1s"`.

All 8 tests pass.

## Related

- [[bugs/2026-05-02-trailing-stop-fictional-trough]] — the bug this decision fixes
- [[sources/sessions/2026-05-02-trailing-stop-clusdt-tick-precision]] — full session
- [[concepts/trailing-stop-simulation]] — algorithm description (updated to reflect Futures-aggTrades path)
- [[entities/pricing-ts]] — `checkTrailingStop` lives here
- [[decisions/2026-04-27-worker-as-binance-cors-proxy]] — the proxy whose error-swallowing helped hide the dead path
