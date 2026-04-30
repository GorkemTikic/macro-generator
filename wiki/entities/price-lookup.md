---
title: src/components/PriceLookup.tsx
tags: [entity, component, ui, lookup]
source: src/components/PriceLookup.tsx
date: 2026-04-27
status: active
---

# src/components/PriceLookup.tsx

Raw price query tool for agents to instantly answer user questions. 6 modes:

| Mode | Endpoint usage |
|---|---|
| `trigger` | `getTriggerMinuteCandles` — single minute Mark + Last OHLC |
| `range` | `getRangeHighLow` — high/low + timestamps in range |
| `last1s` | `getLastPriceAtSecond` — aggTrades at second resolution |
| `findPrice` | `findPriceOccurrences` — first time a price was touched in the past, with **Closest Miss** fallback when target not reached |
| `trailing` | `checkTrailingStop` — trailing stop simulation |
| `gapExplainer` | `analyzeMarkVsLastGap` — Mark vs Last comparison for "chart touched but order didn't trigger" support cases (futures-only) |

## Important features

- **Market switch**: futures | spot
- **Price type**: last | mark (futures only — last only in spot)
- **Trailing stop**: activation price + callback rate + direction (short|long)
- **Closest Miss**: when Find Price's target is not reached, the result shows the closest observed price, side (high/low), miss distance, miss percentage, and a basic-English support summary. Edge case: when `findPriceOccurrences` returns null due to its hierarchical-search caps but the range high/low includes the target, the header softens to `⚠️ Target reached: Yes (approx — exact moment not pinpointed)` instead of contradicting the data.
- **Gap Explainer**: futures-only mode (Spot blocked with localized error). Compares Mark vs Last 1m series, reports first-touch per side, the largest minute-aligned gap, and a deterministic support summary keyed off optional MARK/LAST trigger type. See [[concepts/mark-vs-last-price]].
- `setPresentTime()` — prints "current time - 1 minute" in UTC format in the `to` field.
- All symbol comes from global context via `useApp()` (`activeSymbol`).

## Bilingual

All labels and error messages EN/TR via `uiStrings`.

## Analytics

- `lookup_query` for `mode='findPrice'` carries `result_state: 'reached' | 'closest_miss'`.
- `lookup_query` for `mode='gapExplainer'` carries `trigger_type` (or `null`) and `has_target`.
- `gap_explainer_checked` (dedicated event) carries outcome props `last_reached`, `mark_reached`. See [[decisions/2026-04-27-gap-explainer-checked-event]].
- Existing `trailing_stop_checked` and `lookup_error` are unchanged.

## Bug history

- Session 530e the user found this page "inadequate as a chart/price tool for agents" — but instead of adding new features, a separate Margin Restrictions tab was installed. See [[sources/sessions/2026-04-22-margin-restrictions-build]].
- 2026-04-27: Closest Miss + Gap Explainer added. See [[sources/sessions/2026-04-27-price-lookup-closest-miss-gap-explainer]].

## Sources

- [[sources/sessions/2026-04-22-margin-restrictions-build]] — discussion of enhancement options
- [[sources/sessions/2026-04-27-price-lookup-closest-miss-gap-explainer]] — Closest Miss + Gap Explainer build

## Related

- [[entities/pricing-ts]]
- [[entities/app-context]] — `activeSymbol` consumer
- [[entities/analytics-system]]
- [[concepts/trailing-stop-simulation]]
- [[concepts/mark-vs-last-price]]
- [[decisions/2026-04-27-gap-explainer-checked-event]]
