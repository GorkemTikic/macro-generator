---
title: Trailing Stop test fixture asserted prices that never traded
tags: [bug, fixed, trailing-stop, pricing, futures, tests]
source: sources/sessions/2026-05-02-trailing-stop-clusdt-tick-precision.md
date: 2026-05-02
status: fixed
---

# Trailing Stop test fixture asserted prices that never traded

## Symptom

The 2026-05-01 commit that "fixed" the CLUSDT trailing-stop bug shipped a test fixture (`test-trailing-stop.ts`, Test 1) that asserted:

- trough = `103.58560`
- trigger price ≈ `103.83966` (= `103.58560 × 1.0025`)

Both values were quoted from the user's bug report, which itself came from a Binance UI screenshot. They were never measured against tick data.

The production code path for **Futures Last Price** also looked like it was using `/fapi/v1/klines?interval=1s` and falling back to `aggTrades` only when 1s was empty. In reality, Binance Futures `klines` does **not** support `interval=1s` and returns `{"code":-1120,"msg":"Invalid interval."}` — the analytics Worker then collapsed that error into HTTP 200 with an empty body, so the silent fallback to `aggTrades` happened on every Futures Last Price call. The `granularity: "1s"` label was unreachable in production.

## Root cause

Two cooperating root causes:

1. **The fixture matched memory, not reality.** Synthetic 1s candles were built around the user-reported `103.58560` and `103.83966`, the test asserted those numbers, the test passed, and nobody re-checked them against Binance.
2. **The Worker silently masked an upstream error.** `https://macro-analytics.grkmtkc94.workers.dev/fapi/v1/klines?...&interval=1s` returns HTTP 200, `Content-Length: 0`. The client code's `if (!Array.isArray(chunk) || !chunk.length) break;` is indistinguishable from "no data in window," so the dead 1s path looked legitimate.

## Tick-level reality

`/fapi/v1/aggTrades?symbol=CLUSDT&startTime=1777637520000&endTime=1777637610000` walked from activation onward yields:

| | Value |
|---|---|
| True trough (Last Price tick) | **`103.58`** at `2026-05-01T12:13:07.615Z` |
| Threshold (`trough × 1.0025`) | **`103.83895`** |
| First trade ≥ threshold | **`103.84`** at `2026-05-01T12:13:07.660Z` |

`103.58560` does not appear in the tape between activation and trigger; the lowest five aggTrade prices were `103.58, 103.59, 103.60, 103.61, 103.61`. `103.83966` does not appear either — the trade ladder around the cross was `103.81 → 103.82 → 103.83 → 103.84 → 103.85 → 103.86`.

The user-reported numbers were the order's *Extreme Price* field and the *avg fill price* of the resulting market order — neither equals the tick-level trough nor the threshold.

## Fix

Commit [`1900f17`](https://github.com/GorkemTikic/macro-generator/commit/1900f17), 2026-05-02:

1. **`src/pricing.ts`** — `checkTrailingStop` now skips `/fapi/v1/klines` entirely on Futures and goes straight to `/fapi/v1/aggTrades`. Spot path (which actually supports `interval=1s`) is preserved. The `trailingSourceLabel` distinguishes Futures aggTrades (`"Last Price (aggTrades, tick precision)"`) from Spot 1s (`"Last Price (1s klines)"`).
2. **`src/components/PriceLookup.tsx`** — agent breakdown now lists `Activation reached`, `True Trough/Peak`, `Required trigger threshold`, `First trade crossing threshold` as four explicit lines, plus a "Fill price: not available from this analysis" paragraph.
3. **`test-fixtures/aggtrades_clusdt.json`** (new) — 1000 real Binance aggTrades captured for CLUSDT 2026-05-01 12:12:00 → 12:13:09 UTC.
4. **`test-trailing-stop.ts`** — Test 1 rewritten to drive `checkTrailingStop` from the real fixture. Assertions now mirror tick reality: trough=`103.58`, threshold=`103.83895`, first cross `103.84` at `12:13:07.660 ms`. Test 5 asserts `oneSecondKlineCalls === 0` for Futures. Test 8 (new) asserts Spot still calls `/api/v3/klines?interval=1s`. No assertion mentions `103.58560` or `103.83966`.

## Verification

- `npm run test:trailing` — 8/8 pass.
- `npm run build` — clean.
- `grep "103.58560\|103.83966\|aggTrades fallback"` over `dist/` — zero hits.
- `npm run deploy` → `Published`.

## Lessons

- **Fixtures driven by user-reported numbers are not regression tests** — they encode a bug report, not a measurement. The minimum bar for a numerical fixture is to be reproducible from a captured raw artefact.
- **Silent transformation of upstream errors hides class-of-bug.** The Worker proxy returning empty 200 instead of forwarding Binance's `-1120` made the unsupported `1s` interval look like "data not available for this window" forever. See the open TODO in [[sources/sessions/2026-05-02-trailing-stop-clusdt-tick-precision]].
- **Trigger price ≠ fill price.** The threshold-crossing trade and the actual market-order fill are two different things; the agent UI now states this explicitly.

## Related

- [[sources/sessions/2026-05-02-trailing-stop-clusdt-tick-precision]] — full session summary
- [[decisions/2026-05-02-skip-1s-klines-on-futures]] — why the `1s` futures attempt is now removed
- [[concepts/trailing-stop-simulation]] — algorithm description
- [[entities/pricing-ts]] — `checkTrailingStop` source
- [[entities/price-lookup]] — agent UI consumer
