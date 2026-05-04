---
title: Balance Log scope is USDⓈ-M Futures only; Coin-M is quarantined
tags: [decision, balance-log, usds-m, scope]
source: sources/sessions/2026-05-03-merge-into-macro-generator-and-redesign.md
date: 2026-05-03
status: active
---

# Decision: BL wallet-reconciliation maths restricted to USDⓈ-M Futures

## Context

The Balance Log Analyzer's reconciliation
(`expected = baseline + transfer + activity`) only makes sense when
all the rows are denominated against the same wallet's quote asset.
Coin-M settlement is denominated in the underlying coin (BTC, ETH,
…), USDⓈ-M is denominated in stable / quote assets (USDT, USDC,
BFUSD, FDUSD, …). Mixing them produces a meaningless "expected
balance" — adding negative fractional BTC to a USDT wallet has no
physical interpretation.

## Decision

Coin-M / delivery rows are detected and **excluded with a reason**,
never silently dropped. Excluded rows surface in the Diagnostics tab
with the matched reason so users can sanity-check the routing.

`decideScope()` in
`src/features/balance-log/lib/balanceLog.ts`:

1. Coin-M markers in `symbol`, `type`, or raw row text
   (`COIN_PERP`, `_PERP`, `_YYMMDD`, `COIN_M`) → `scope: "COINM"`.
2. Asset in the curated USDⓈ-M-quote set (USDT, USDC, BUSD, BFUSD,
   FDUSD, TUSD, USDP, DAI, USDE, USD1, BNFCR, LDUSDT, plus BNB for
   fee discounts) → `scope: "USDM"`.
3. Asset matches a known coin name (BTC, ETH, SOL, …) →
   `scope: "COINM"`.
4. Otherwise unfamiliar but asset-shaped → `scope: "UNKNOWN"`,
   *included* with a warning. Errs on the side of preserving wallet
   accuracy when Binance adds new stables.

## Rationale

- Users debugging discrepancies in their **USDⓈ-M** wallet are best
  served by an audit that first quarantines Coin-M activity.
- Visible exclusion (with reason) beats silent drop for trust and
  debuggability.
- Stable-settled delivery rows (e.g. delivery against USDT) stay in
  USDⓈ-M maths unless the symbol/raw contract marker is Coin-M-shaped.

## Consequences

- Diagnostics tab shows every excluded row with its reason.
- New stables added by Binance surface as `unknownTypes`-style
  warnings rather than dropping out of the maths.
- A delivery-style raw type alone is not enough to exclude a stable-
  asset row.

## Sources

- `src/features/balance-log/lib/balanceLog.ts`
  (`decideScope`, `USDM_QUOTE_ASSETS`, `COINM_HINT_RE`)
- `src/features/balance-log/lib/balanceLog.test.ts`
  (Coin-M exclusion tests)
- [[sources/sessions/2026-05-03-merge-into-macro-generator-and-redesign]]

## Related

- [[concepts/usds-m-reconciliation-math]]
- [[concepts/dynamic-balance-log-types]]
- [[entities/balance-log-feature]]
- [[syntheses/balance-log-feature-overview]]
