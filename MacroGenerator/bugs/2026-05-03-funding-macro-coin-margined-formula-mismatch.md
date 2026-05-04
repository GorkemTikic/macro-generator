---
title: Funding macro silently used linear formula on coin-margined contracts
tags: [bug, funding, correctness, fixed]
source: sources/sessions/2026-05-03-full-codebase-audit-and-remediation.md
date: 2026-05-03
status: fixed
---

# Bug: Funding macro silently used linear formula on coin-margined contracts

## Symptom

`src/macros/funding_macro.ts` computes the funding fee as:

```ts
const notional = size * Number(mark);          // USDⓈ-M (linear) only
const fundingFee = notional * rateNum;
```

The macro then prints `${notional} USDT` and `${markPrice} USDT` regardless
of contract type. For coin-margined symbols (`BTCUSD_PERP`,
`BTCUSD_240329`, `ETHUSD_PERP`), this is wrong on three counts:

1. Coin-M contracts are **inverse** — the correct notional is
   `size_usd / mark`, not `size * mark`.
2. The settlement asset is the coin itself (BTC, ETH), not USDT.
3. `getNearestFunding` returns the same shape for both contract types,
   so the macro silently emits a misleading result.

## Root cause

The funding macro was originally written when only USDⓈ-M symbols were
in scope. When `getNearestFunding`/`getMarkPriceClose1m` were extended
to accept any symbol, the macro template was never updated. There was
no contract-type detection on the input.

## Fix

Added a pre-flight check in `FundingMacro.tsx`:

```ts
const upSym = symbol.toUpperCase();
const looksCoinM = /(_PERP|_\d{6})$/.test(upSym) || /USD$/.test(upSym);
if (looksCoinM) {
  throw new Error(lang === 'tr'
    ? `${upSym} bir coin-margined sözleşme gibi görünüyor. Bu araç yalnızca USDⓈ-M (linear) sözleşmeleri için doğru sonuç verir. Coin-margined için manuel hesaplama yapın.`
    : `${upSym} looks like a coin-margined contract. This tool only computes funding correctly for USDⓈ-M (linear) symbols. Coin-M needs the inverse formula — calculate manually.`);
}
```

The decision to **block** rather than implement the inverse formula is
documented in
[[decisions/2026-05-03-block-coinm-in-funding-macro]] — short version:
volume of coin-margined funding tickets is low enough that an explicit
"do this by hand" is better than carrying two formulas + two
denominations + two macro templates with the chance of swapping them.

## Detection regex

The pattern matches:

- `*_PERP` — perpetual coin-M (e.g. `BTCUSD_PERP`)
- `*_240329` — dated futures (e.g. `BTCUSD_240329`)
- `*USD` (no `T`) — coin-M legacy convention; `USDT`, `USDC`, `BUSD`
  end in `T`/`C`, so they're not matched.

False positive only on a hypothetical USDⓈ-M symbol literally ending in
`USD`, which Binance does not currently list.

## Related files

- `src/components/FundingMacro.tsx`
- `src/macros/funding_macro.ts` (still emits the linear formula —
  intentional, since it now only ever runs on USDⓈ-M symbols)

## Sources

- [[sources/sessions/2026-05-03-full-codebase-audit-and-remediation]]

## Related

- [[decisions/2026-05-03-block-coinm-in-funding-macro]]
- [[entities/funding-macro-component]]
- [[entities/macros-registry]]
