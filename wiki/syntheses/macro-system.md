---
title: Macro System (Registry + Render Flow)
tags: [synthesis, macro, architecture]
source: src/macros/, src/components/MacroGenerator.tsx
date: 2026-04-25
status: active
---

# Macro System

7 trade-related macros + 1 funding macro — each defined as a pure function in file `src/macros/<id>.ts`.

## Registry

[[entities/macros-registry]] (`src/macros/index.ts`):
- `MACROS = [stop_market_mark_not_reached, ..., stop_limit_last_price]` — 7 makro
- `funding_macro` is handled specially (in separate tab)
- `listMacros(lang)` — title + formConfig for UI dropdown
- `renderMacro(macroId, inputs, prices, mode, lang, tone)` — produces markdown

## Macro shape

```ts
export const myMacro = {
  id: "my_macro_id",
  price_required: true,
  translations: {
    en: { title, formConfig, templates: { detailed, summary } },
    tr: { ... }
  }
}
```

## Render flow

```
UI form → inputs object
   ↓
pricing.ts → prices object (Mark + Last OHLC)
   ↓
renderMacro(id, inputs, prices, mode='detailed', lang='en', tone='standard')
   ↓
template fn ({inputs, prices}) → string
   ↓
applyTone(string, tone, lang) → final markdown
   ↓
UI clipboard / preview
```

## Tone × Mode × Lang

3D variant matrix:
- **Mode**: detailed | summary
- **Long**: a | tr
- **Tone**: standard | empathetic | professional | direct

Total = 2 × 2 × 4 = 16 possible outputs. Selects template (mode × lang); tone post-processor.

## Helpers

[[entities/macros-helpers]]:
- `fmtNum(v, digits)` — number formatting, null-safe
- `truncateToPrecision` — True to Binance UI, **no rounding** ([[decisions/precision-truncation-not-rounding]])
- `buildFullOHLCBlock` — Mark + Last 1m mum bloğu markdown blockquote
- `statusLineFriendly` — OPEN/CANCELED/EXECUTED durum etiketi
- `applyTone` — post-processor that applies tones

## Smart-detect

[[entities/smart-detect]] — user free text → macro prediction + tone hint. Keyword-based, informed design decision (not black box ML).

## Sources

- [[sources/docs/2026-03-21-readme]]

## Related

- [[concepts/stateless-macro-engine]]
- [[concepts/bilingual-tr-en]]
- [[concepts/smart-detect-nlp]]
- [[entities/macro-generator-component]]
- [[entities/funding-macro-component]]
- [[decisions/architecture-stateless-pure-functions]]
- [[decisions/precision-truncation-not-rounding]]
