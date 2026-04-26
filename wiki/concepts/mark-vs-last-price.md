---
title: Mark Price vs Last Price
tags: [concept, binance, futures]
source: src/pricing.ts, src/macros/
date: 2026-04-25
status: active
---

# Mark Price vs Last Price (Futures)

There are two different price types on Binance Futures. Which price triggers an order determines the answers to most user questions.

## Definitions

| Genre | Source | Usage |
|---|---|---|
| **Last Price** | Price of last trade (ledger/match engine) | Limit order fill control, market data |
| **Mark Price** | Index Price (spot) + Funding rate based smoothing | **Liquidation, Stop-with-Mark trigger** |

## Trigger type selection

When placing a Stop-Market / Take-Profit-Market order, the user selects **trigger type**:
- `MARK` → Triggered by Mark Price (protects from manipulation)
- `LAST` → Compared to Last Price (faster, but prone to wicks)

So macros have 2 versions: `take_profit_slippage_mark_price.ts` vs `take_profit_slippage_last_price.ts`. See [[entities/macros-registry]].

## API endpoint difference

```
/fapi/v1/klines             → Last Price (futures kline)
/fapi/v1/markPriceKlines    → Mark Price (1m mark snapshot)
```

In most cases, [[entities/pricing-ts]] pulls both in parallel (`Promise.all`) and displays both in the macro output — so the agent can give the user complete information, "Mark was X, Last was Y."

## Spot difference

Spot only has Last Price. Returns "N/A" placeholders for `getRangeHighLow(symbol, ..., "spot")` mark — for UI consistency.

## WebSocket

`wss://fstream.binance.com/ws/{symbol}@markPrice` → Mark Price stream only. [[entities/live-ticker]] uses this.

## Sources

<!-- Not discussed directly in sessions, from code comments -->

## Related

- [[entities/pricing-ts]]
- [[entities/macros-registry]]
- [[entities/binance-fapi]]
- [[entities/live-ticker]]
