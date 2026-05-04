---
title: src/components/FundingMacro.tsx
tags: [entity, component, ui, funding]
source: src/components/FundingMacro.tsx
date: 2026-04-25
status: active
---

# src/components/FundingMacro.tsx (245 satır)

Custom UI for funding rate macro. It is in a separate tab because the input set (funding time, position size, position side, funding interval) is different from other macros.

## Stream

1. User enters symbol + funding time + position size + side (Long/Short) + interval (hour)
2. With `getNearestFunding(symbol, fundingTime)` the nearest funding record is withdrawn (10/30/90min window fallback)
3. If there is no `markPrice` in the record, it is taken from 1m closing with `getMarkPriceClose1m(symbol, fundingTimeMs)`
4. PricePrecision is captured with `getAllSymbolPrecisions()` and formatted with fmtNum
5. `renderMacro("funding_macro", inputs, prices, mode, lang, tone)` → markdown output

## Notes

- `mode`: detailed | summary; `tone`: standard | empathetic | professional | direct
- `rawMarkPrice` and `lastInputs` states are kept for re-rendering when precision changes
- Default symbol "BTCUSDT", default side Long, default interval 8 saat (Binance standart funding interval)

## Recent updates (2026-05-03)

- **Coin-margined symbols are now blocked.** A pre-flight regex
  (`/(_PERP|_\d{6})$/` or `/USD$/`) on the upper-cased symbol throws
  a clear bilingual error before `getNearestFunding` runs. The
  funding macro's math is the linear (USDⓈ-M) formula
  `notional = size * mark`; coin-margined contracts are inverse and
  would produce wrong numbers. See
  [[bugs/2026-05-03-funding-macro-coin-margined-formula-mismatch]]
  and [[decisions/2026-05-03-block-coinm-in-funding-macro]].
- **Toast UX.** `alert()` after Copy is replaced by a non-blocking
  `mg-toast` element.

## Sources

<!-- Not discussed directly in sessions -->
- [[sources/sessions/2026-05-03-full-codebase-audit-and-remediation]]

## Related

- [[entities/pricing-ts]] — `getNearestFunding`, `getMarkPriceClose1m`
- [[entities/macros-registry]] — `renderMacro`
- [[concepts/bilingual-tr-en]]
- [[bugs/2026-05-03-funding-macro-coin-margined-formula-mismatch]]
- [[decisions/2026-05-03-block-coinm-in-funding-macro]]
