---
title: src/components/PriceLookup.tsx
tags: [entity, component, ui, lookup]
source: src/components/PriceLookup.tsx
date: 2026-04-25
status: active
---

# src/components/PriceLookup.tsx (522 satır)

Raw price query tool for agents to instantly answer user questions. 4 modes:

| Mode | Endpoint usage |
|---|---|
| `trigger` | `getTriggerMinuteCandles` — tek minutesda Mark + Last OHLC |
| `range` | `getRangeHighLow` — high/low + timestamps in range |
| `last1s` | `getLastPriceAtSecond` — aggTrades in seconds resolution |
| `findPrice` | `findPriceOccurrences` — the first time a price was mentioned in the past |
| `trailing` | `checkTrailingStop` — trailing stop simulation |

## Important features

- **Market switch**: futures | spot
- **Price type**: last | mark (futures only — last only in spot)
- **Trailing stop**: activation price + callback rate + direction (short|long)
- `setPresentTime()` — prints "current time - 1 minutes" in UTC format in the field `to`
- All symbol comes from global context of input `useApp()` (`activeSymbol`)

## Bilingual

All labels and error messages EN/TR via `uiStrings`.

## Bug history

In Session 530e, the user found this page "inadequate as a chart/price tool for agents" — but instead of adding new features, a separate Margin Restrictions tab was installed. See [[sources/sessions/2026-04-22-margin-restrictions-build]].

## Sources

- [[sources/sessions/2026-04-22-margin-restrictions-build]] — discussion of enhancement options

## Related

- [[entities/pricing-ts]]
- [[entities/app-context]] — `activeSymbol` consumer
- [[concepts/trailing-stop-simulation]]
- [[concepts/mark-vs-last-price]]
