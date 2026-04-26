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

When the trigger is found, `aggTrades` of that minute is pulled, the **per-trade** simulation runs again — the actual seconds stamp is found. This is not done for mark price (there is no second granular mark price).

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

<!-- Not discussed directly in sessions, from code comments -->

## Related

- [[entities/pricing-ts]]
- [[entities/price-lookup]] — UI consumer
- [[concepts/mark-vs-last-price]]
