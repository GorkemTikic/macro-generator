---
title: Trailing Stop Simulation
tags: [concept, algorithm, futures]
source: src/pricing.ts (checkTrailingStop)
date: 2026-04-25
status: active
---

# Trailing Stop Simulation

The `checkTrailingStop` function re-simulates the Binance Futures trailing stop behavior to answer the user's question "why was/was my trailing stop triggered?"

## Binance trailing stop behavior (3 phases)

1. **Wait for Activation**: If `activationPrice` is specified, the price must reach that level first.
   - Short (Sell): fiyat ≥ activation
   - Long (Buy): fiyat ≤ activation
2. **Track Peak/Trough**: The highest price is tracked after activation.
   - Short: highest high
   - Long: lowest low
3. **Trigger on Callback**: Triggered when `callbackRate`% returns from Peak.
   - Short trigger price = `peak * (1 - cb/100)`
   - Long trigger price = `peak * (1 + cb/100)`

## Simulation details

### Order of sub-points (look-ahead bias reduction)

Since the order within the candle is unknown in 1m candle data:

```
Short → [open, low, high, close]   // önce low'a değdi varsay (geç tetikle)
Long  → [open, high, low, close]   // önce high'a değdi varsay (geç tetikle)
```

This is a **conservative** (trigger late) assumption — it may have actually triggered earlier, but it guarantees the user that it "must have triggered at this time at the latest."

### Saniye precision (last price + futures only)

For **Futures Last Price**, `checkTrailingStop` walks `/fapi/v1/aggTrades` directly — the entire activation/trough/peak/trigger detection runs on tick data, not on candles. Binance Futures `klines` does **not** support `interval=1s` (returns `-1120 "Invalid interval"`), so the previous "try 1s first, fall back to aggTrades" pattern was a dead round-trip; see [[decisions/2026-05-02-skip-1s-klines-on-futures]] and [[bugs/2026-05-02-trailing-stop-fictional-trough]].

For **Spot Last Price**, `/api/v3/klines?interval=1s` is tried first (Spot supports 1s) and the run falls back to `/api/v3/aggTrades` only when 1s returns empty. The candle sub-point ordering (`[o, l, h, cl]` for Long, `[o, h, l, cl]` for Short) applies to Spot 1s candles and to Mark Price 1m candles.

For **Mark Price**, only `/fapi/v1/markPriceKlines?interval=1m` exists — Binance does not publish sub-minute Mark Price. The result is flagged `isApproximate: true` and timestamps are minute-level.

### Trigger price ≠ fill price

The trigger price the algorithm reports is **the threshold-crossing trade**: the first tick (or candle extreme, for Mark) at or beyond `reference × (1 ± callback)`. When a real trailing stop fires, Binance places a **market order**; the actual fill is whatever the orderbook offers at that instant and may differ from the threshold by orderbook slippage. The agent UI states this explicitly and points the agent at the order's Trade History for the real fill price.

## Status values

| Status | Meaning |
|---|---|
| `triggered` | Triggered — `triggerTime`, `triggerPrice` full |
| `activated_no_trigger` | Activated but did not reach callback |
| `not_activated` | Activation price'a değmedi |
| `not_found` | No data in range |

## maxObservedCallback

Even if it isn't triggered, the maximum callback from the peak is reported — the agent can tell the user "it would have triggered if the callback rate had been Y% instead of X%."

## Sources

- [[sources/sessions/2026-05-02-trailing-stop-clusdt-tick-precision]] — tick-precision verification + Futures-1s removal

## Related

- [[entities/pricing-ts]]
- [[entities/price-lookup]] — UI consumer
- [[concepts/mark-vs-last-price]]
- [[bugs/2026-05-02-trailing-stop-fictional-trough]]
- [[decisions/2026-05-02-skip-1s-klines-on-futures]]
