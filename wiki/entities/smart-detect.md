---
title: src/macros/smart_detect.ts
tags: [entity, macro, nlp]
source: src/macros/smart_detect.ts
date: 2026-04-25
status: active
---

# src/macros/smart_detect.ts (81 satır)

Keyword-based classifier that **predicts** macro type and tone from user's free text input. Not AI — simple `String.includes` regexes.

## API

```ts
detectMacro(text): { macroId?, tone?, confidence: number, reason? } | null
```

## Categories and example triggers

| Category | Key words (EN+TR) | macroId | tone |
|---|---|---|---|
| Funding | `funding`, `fonlama`, `fee`, `komisyon` | `funding_macro` | — |
| Stop not triggered | `stop` + (`çalışmadı`/`tetiklenmedi`/`not trigger`/`skipped`), `stopum patlamadı` | `stop_limit_not_triggered` | empathetic |
| Stop triggered, not filled | `stop` + (`dolmadı`/`not fill`), `limit order not filled` | `stop_limit_not_filled` | professional |
| Slippage | `slippage`, `kayma`, `farklı fiyat`, `market`+`price`+`high` | `high_frequency_slippage` | direct |
| Not reached | `fiyat gelmedi`, `not reached`, `didn't hit`, `değmedi` | `limit_order_not_reached` | direct |

## Known inconsistencies

- The generated `macroId` values ​​(`stop_limit_not_triggered`, `high_frequency_slippage`, `limit_order_not_reached`) do not match the actual IDs in [[entities/macros-registry]] (`stop_market_mark_not_reached` etc.).

> ## CONTRADICTION
> The `macroId` returned by smart-detect does not exactly match the ids in the MACROS array. This calling party needs to match or smart-detect needs to be updated.

## Sources

<!-- Not discussed directly in sessions -->

## Related

- [[entities/macro-generator-component]] — consumer
- [[entities/macros-registry]]
- [[concepts/smart-detect-nlp]]
