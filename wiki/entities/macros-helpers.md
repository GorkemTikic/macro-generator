---
title: src/macros/helpers.ts
tags: [entity, macro, helpers, formatting]
source: src/macros/helpers.ts
date: 2026-04-25
status: active
---

# src/macros/helpers.ts (183 satır)

Formatting aids shared by all macros. **Critical** because if the inconsistency starts here, all macro outputs will differ.

## Public API

| Function | Purpose |
|---|---|
| `fmtNum(v, digits=8)` | Convert number to string with fixed decimal; null/NaN → `"N/A"` |
| `upper(s)` | Trim + uppercase, null-safe |
| `statusLineFriendly(inputs)` | User-friendly timestamp line for OPEN/CANCELED/EXECUTED/TRIGGERED/EXPIRED |
| `truncateToPrecision(raw, prec)` | DOES NOT round — cuts (matches Binance precision behavior) |
| `buildFullOHLCBlock(prices, lang, precision)` | Mark + Last Price prints 1m candle block as markdown blockquote |
| `generateMacro(...)` | Re-export edilen template renderer |
| `applyTone(text, tone, lang)` | Post-processor that applies empathetic/professional/direct/standard tone to the output |

## Important detail: truncate, not round

`truncateToPrecision("0.123456789", 4)` → `"0.1234"` (if there was rounding it would be `"0.1235"`). This is **intentionally** consistent with Binance's own precision behavior — so that when the user searches the price displayed by the agent in the Binance UI, they see exactly the same price. See [[decisions/precision-truncation-not-rounding]].

## buildFullOHLCBlock structure

Separate template for EN and TR — `> **Mark Price (1m Candle):**` blockquote header, then Open/High/Low/Close with fmtNum. Decimal set with precision parameter.

## Sources

<!-- Not discussed directly in sessions -->

## Related

- [[entities/macros-registry]]
- [[decisions/precision-truncation-not-rounding]]
- [[concepts/bilingual-tr-en]]
