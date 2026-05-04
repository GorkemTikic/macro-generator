---
title: Trailing Stop — CLUSDT tick-precision verification & Futures-1s removal
tags: [source, session, trailing-stop, pricing, futures, aggTrades]
source: in-conversation session (no raw transcript)
date: 2026-05-02
status: active
---

# Session: Trailing Stop CLUSDT tick-precision verification

**Date**: 2026-05-02 (single-session continuation of the 2026-05-01 trailing-stop refactor)
**Commit**: [`1900f17`](https://github.com/GorkemTikic/macro-generator/commit/1900f17) — pushed to `origin/main`, deployed via `gh-pages` (`Published`).
**Trigger**: user asked to verify the CLUSDT trailing-stop math against real Binance tick data after a prior session left the test fixture grounded in synthetic numbers.

## Aim

The earlier 2026-05-01 fix to `checkTrailingStop` claimed two things that turned out to be wrong on closer inspection:

1. The CLUSDT test fixture asserted **trough = 103.58560** and **trigger price = 103.83966** — values quoted from a screenshot, not measured.
2. The code attempted `/fapi/v1/klines?interval=1s` for Last Price on Futures, then "fell back" to aggTrades. The "1s" granularity label was reachable in fixtures but never in production.

This session pulled real `aggTrades` from Binance Futures, verified the math, and removed the dead 1s code path on Futures.

## Tick-level reality (CLUSDT, 2026-05-01)

Pulled `/fapi/v1/aggTrades?symbol=CLUSDT&startTime=1777637520000&endTime=1777637610000` via the analytics Worker proxy and walked the stream.

| Quantity | Real value |
|---|---|
| Activation (first tick ≤ 103.86) | `103.86` at `2026-05-01T12:12:26.062Z` |
| **True trough** | **`103.58`** at `2026-05-01T12:13:07.615Z` |
| Threshold = trough × 1.0025 | **`103.83895`** |
| **First trade ≥ threshold** | **`103.84`** at `2026-05-01T12:13:07.660Z` (45 ms after trough) |

Direct sanity checks against the user-reported numbers:

- `103.58560` does **not appear** in the tape between activation and trigger. The lowest five aggTrade prices in that window were `103.58, 103.59, 103.60, 103.61, 103.61`.
- `103.83966` does **not appear** either. The trade ladder around the cross was `…103.81 → 103.82 → 103.83 → 103.84 → 103.85 → 103.86`.

Conclusion: both numbers were Binance UI artifacts (the order's *Extreme Price* field and the *avg fill price* of the resulting market order), neither equals the tick-level trough nor the threshold.

## Futures klines does NOT support `interval=1s`

Direct call to `https://fapi.binance.com/fapi/v1/klines?symbol=CLUSDT&interval=1s` returned `{"code":-1120,"msg":"Invalid interval."}`. The analytics Worker swallowed this as HTTP 200 with an empty body, so the previous code's try/catch always treated it as "no data" and silently fell through to `aggTrades`.

Spot is different: `https://api.binance.com/api/v3/klines?...&interval=1s` works. So the `1s` path is real, but only for Spot.

## Done

| File | Change |
|---|---|
| `src/pricing.ts` | `checkTrailingStop` now skips `/fapi/v1/klines` entirely when `market === "futures"`; goes straight to `/fapi/v1/aggTrades`. Spot path preserved (Spot supports `interval=1s`). |
| `src/pricing.ts` | `trailingSourceLabel` returns `"Last Price (aggTrades, tick precision)"` when granularity is `aggTrades`; `"Last Price (1s klines)"` only when granularity is `1s` (Spot only). |
| `src/components/PriceLookup.tsx` | Agent breakdown now lists four explicit lines: `Activation reached`, `True Trough/Peak (Last Price tick \| Mark Price candle)`, `Required trigger threshold`, `First trade crossing threshold`. Adds an explicit "Fill price: not available from this analysis" paragraph that points the agent at Binance Trade History. Removed unused `conditionOperator`. |
| `test-fixtures/aggtrades_clusdt.json` | New — 1000 real aggTrades captured for CLUSDT 2026-05-01 12:12:00 → 12:13:09 UTC. |
| `test-trailing-stop.ts` | Test 1 rewritten to drive `checkTrailingStop` from real aggTrades. Asserts trough=`103.58` at `12:13:07.615 ms`, threshold=`103.83895`, first cross `103.84` at `12:13:07.660 ms`, and that no result timestamp falls outside `[From, To]`. Test 5 asserts `oneSecondKlineCalls === 0` for Futures Last Price. New Test 8 asserts Spot Last Price still calls `/api/v3/klines?interval=1s`. No assertion in the file mentions `103.58560` or `103.83966`. |

## Verification

- `npm run test:trailing` → 8/8 tests pass.
- `npm run build` → 357 KB main / 100 KB gzip.
- Grep against `dist/`:
  - `103.58560`, `103.83966`, `aggTrades fallback`, `TRAILING STOP TRIGGERED`, `Triggered at:`, `Required move`, `Actual move` — zero hits.
  - `aggTrades, tick precision`, `True Trough`, `True Peak`, `First trade crossing threshold`, `Required trigger threshold` — present in the bundle.
- `npm run deploy` → `Published`.
- `git push origin main` → `95cae32..1900f17`.

## Open / TODOs (not addressed)

- The bundle is still 953 KB / 276 KB gzip for the on-demand `exceljs` chunk (pre-existing, see [[decisions/2026-04-28-lazy-load-exceljs]]).
- `aggtrades_clusdt.json` and `klines_1s.json` were left behind in the **parent** working directory (one level up from the project root) when the verification was first done. Only `test-fixtures/aggtrades_clusdt.json` is tracked; the parent-dir files are untracked scratch and harmless but worth deleting.
- The `PROXY` constant default still points at `macro-analytics.grkmtkc94.workers.dev`. Worth noting that the Worker proxy returns HTTP 200 + empty body for *any* unsupported endpoint instead of forwarding Binance's error JSON — that's why the dead `1s` Futures path went unnoticed for so long. Fixing the Worker to forward upstream errors verbatim would surface this class of bug earlier.

## Sources

- in-conversation session, single turn, 2026-05-02.
- Real Binance Futures `aggTrades` capture: [[entities/pricing-ts]] → `/fapi/v1/aggTrades` via [[entities/analytics-system]] proxy.

## Related

- [[bugs/2026-05-02-trailing-stop-fictional-trough]]
- [[decisions/2026-05-02-skip-1s-klines-on-futures]]
- [[concepts/trailing-stop-simulation]]
- [[entities/pricing-ts]]
- [[entities/price-lookup]]
