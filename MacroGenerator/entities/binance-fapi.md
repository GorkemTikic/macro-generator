---
title: Binance Futures API (fapi)
tags: [entity, external, api, binance]
source: external
date: 2026-04-25
status: active
---

# Binance Futures API (fapi)

The main data source of the project. Public endpoints — no auth required.

## Base URL'ler

```
https://fapi.binance.com   (primary)
https://fapi1.binance.com  (mirror)
https://fapi2.binance.com  (mirror)
https://fapi3.binance.com  (mirror)
```

[[entities/pricing-ts]] tries all requests in these bases in order; If someone gives 5xx/network fail, it moves on to the next one. It stops at errors 429/418/451.

## Endpoints used

| Endpoint | Purpose | pricing.ts function |
|---|---|---|
| `/fapi/v1/klines` | Last Price 1m mumları | `getTriggerMinuteCandles`, `getRangeHighLow`, `findPriceOccurrences` |
| `/fapi/v1/markPriceKlines` | Mark Price 1m candles | same + `getMarkPriceClose1m` |
| `/fapi/v1/aggTrades` | Saniye precision trade akışı | `getLastPriceAtSecond`, `findPriceOccurrences` (aggTrades search), `checkTrailingStop` (precision pass) |
| `/fapi/v1/fundingRate` | Funding rate records | `getNearestFunding` |
| `/fapi/v1/exchangeInfo` | All symbols + pricePrecision | `getAllSymbolPrecisions` |
| `wss://fstream.binance.com/ws/{symbol}@markPrice` | WebSocket canlı mark price | [[entities/live-ticker]] |

## Limit'ler

- Klines `limit=1500` max → with large spacing pagination
- aggTrades `limit=1000` max → may not be enough at busy minute, [[entities/pricing-ts]] `findMatchInAggTrades` function does pagination (max 10 pages)

## Sources

<!-- Not discussed directly in sessions, from code and [pricing.ts](pricing.ts) comments -->

## Related

- [[entities/pricing-ts]]
- [[concepts/binance-fapi-fallback]]
- [[concepts/mark-vs-last-price]]
