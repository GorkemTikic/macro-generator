---
title: Block coin-margined symbols in FundingMacro instead of implementing inverse formula
tags: [decision, funding, scope]
source: sources/sessions/2026-05-03-full-codebase-audit-and-remediation.md
date: 2026-05-03
status: active
---

# Decision: Block coin-margined symbols in FundingMacro instead of implementing inverse formula

## Context

`src/macros/funding_macro.ts` computes funding fee using the linear
formula `notional = size * mark`, which is correct for USDⓈ-M (linear)
contracts but wrong for coin-margined (inverse) contracts where
`notional_usd = size_usd / mark`. The bug:
[[bugs/2026-05-03-funding-macro-coin-margined-formula-mismatch]].

Two fix options:

1. **Implement the inverse formula**, branch on contract type, render
   two macro templates (one in USDT, one in BTC/ETH/etc.), update
   locale strings to handle both denominations.
2. **Detect COIN-M symbols at the form layer and refuse them** with a
   clear bilingual error.

## Decision

Option 2.

## Rationale

- **Volume**: coin-margined funding tickets are a small fraction of
  USDⓈ-M tickets in the support team's queue. A reviewer of recent
  ticket categories said the rate is well under 5%.
- **Macro template complexity**: the funding macro is already 200
  lines of EN+TR templates. Adding inverse variants doubles the
  surface area of locale strings, all of which need re-review every
  time we tweak phrasing.
- **Mistake potential**: the worst failure mode is silently swapping
  formulas (e.g. emitting linear math under a "Coin-M" header). An
  explicit refuse blocks the dangerous path entirely.
- **Existing manual workflow**: coin-M agents already have a manual
  spreadsheet template they use. They aren't blocked — just routed
  back to it.

## Detection regex

```ts
const looksCoinM = /(_PERP|_\d{6})$/.test(upSym) || /USD$/.test(upSym);
```

Catches:

- `BTCUSD_PERP`, `ETHUSD_PERP`, etc. — perpetual coin-M
- `BTCUSD_240329`, `BTCUSD_240628` — quarterly futures
- `BTCUSD`, `ETHUSD` — coin-M legacy convention. Excludes `USDT`,
  `USDC`, `BUSD`, `FDUSD` because those don't end in plain `USD`.

False positive surface: a hypothetical USDⓈ-M symbol literally ending
in `USD` (no `T`/`C`). Binance does not currently list any.

## Error message

Bilingual, names the offending symbol, says explicitly that this is a
USDⓈ-M-only tool and points the agent to manual calculation:

> EN: `"BTCUSD_PERP looks like a coin-margined contract. This tool
> only computes funding correctly for USDⓈ-M (linear) symbols. Coin-M
> needs the inverse formula — calculate manually."`
>
> TR: `"BTCUSD_PERP bir coin-margined sözleşme gibi görünüyor. Bu araç
> yalnızca USDⓈ-M (linear) sözleşmeleri için doğru sonuç verir.
> Coin-margined için manuel hesaplama yapın."`

## Revisit triggers

- Coin-M ticket volume jumps (>10% of funding tickets per week).
- Binance changes futures naming and our regex starts mismatching.

If either happens, revisit by either:

(a) implementing the inverse formula behind a contract-type branch, or
(b) building a separate "Coin-M Funding" macro id that takes
notional-in-USD as the input.

## Sources

- [[sources/sessions/2026-05-03-full-codebase-audit-and-remediation]]

## Related

- [[bugs/2026-05-03-funding-macro-coin-margined-formula-mismatch]]
- [[entities/funding-macro-component]]
- [[entities/macros-registry]]
