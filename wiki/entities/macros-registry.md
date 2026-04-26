---
title: src/macros/index.ts
tags: [entity, registry, macro]
source: src/macros/index.ts
date: 2026-04-25
status: active
---

# src/macros/index.ts

Macro registry. Imports 7 macro functions, collects them in the `MACROS` array, and exports `listMacros(lang)` and `renderMacro(macroId, inputs, prices, mode, lang, tone)`.

## Registered macros

| ID | File |
|---|---|
| `stop_market_mark_not_reached` | `stop_market_mark_not_reached.ts` |
| `stop_market_loss_higher_than_expected_mark_price` | same name .ts |
| `stop_market_loss_higher_than_expected_last_price` | same name .ts |
| `take_profit_slippage_mark_price` | same name .ts |
| `take_profit_slippage_last_price` | same name .ts |
| `stop_limit_mark_price` (not_filled) | `stop_limit_mark_price.ts` |
| `stop_limit_last_price` (not_filled) | `stop_limit_last_price.ts` |

**Plus** `funding_macro` is treated special — not in the `MACROS` array; Private branch in `renderMacro`.

## Translation structure

Each macro holds the `m.translations[lang]` field:
```ts
m.translations = {
  en: { title, formConfig, templates: { detailed, brief, ... } },
  tr: { title, formConfig, templates: { detailed, brief, ... } }
}
```

`renderMacro` finds the correct language + mode template, calls it with `({inputs, prices})`, then applies tone (empathetic/professional/direct/standard) with `applyTone(result, tone, lang)`.

## Pattern: stateless pure function

Each macro is a pure function — takes `({inputs, prices})`, returns a string. No side effects, no async, no fetch. See [[concepts/stateless-macro-engine]].

## Sources

<!-- Not discussed directly in sessions -->

## Related

- [[entities/macros-helpers]] — `generateMacro`, `applyTone`, `fmtNum`, `buildFullOHLCBlock`
- [[entities/macro-generator-component]] — main consumer
- [[entities/funding-macro-component]] — `funding_macro` and kullanan
- [[concepts/stateless-macro-engine]]
