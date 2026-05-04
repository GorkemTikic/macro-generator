---
title: USDⓈ-M reconciliation math (Balance Log)
tags: [concept, balance-log, reconciliation, math, decimal]
source: sources/sessions/2026-05-03-merge-into-macro-generator-and-redesign.md
date: 2026-05-03
status: active
---

# Concept: USDⓈ-M reconciliation math

## Formula

```
expectedFinal[asset] =
    baseline[asset]
  + transferAtStart[asset]
  + Σ ( amount of every included row in [startTs, endTs] for asset )
```

`baseline`, `transferAtStart`, and `currentWallet` are all per-asset
and all optional. When `baseline` is empty, the formula rolls from
zero.

## Inputs (`ReconcileInput`)

| Input | Description | Default |
|---|---|---|
| `rows` | `ParsedRow[]`, already filtered to USDⓈ-M scope | required |
| `startTs` | epoch millis (UTC) anchor | required |
| `endTs` | epoch millis (UTC) inclusive upper bound | latest row |
| `baseline` | `{ asset: number \| string }` | `{}` |
| `transferAtStart` | `{ asset, amount }` | `undefined` |
| `currentWallet` | `{ asset: number \| string }` for comparison | `undefined` |
| `tolerance` | absolute match tolerance | `1e-6` |

## Outputs (`ReconcileResult`)

`perAsset[asset]` → `AssetReconcile`:

- `baseline`, `transferAtStart`, `activity`, `expected`, `actual?`,
  `difference?` — decimal strings (BigInt fixed precision)
- `status` — `match`, `mismatch`, or `unknown` (when no actual given)

`warnings` carries free-text alerts including the
duplicate-transfer-at-start warning that fires when an existing
`TRANSFER` row at start matches asset+amount within ±60 s and the
tolerance window.

## Why decimal-safe arithmetic

Floating-point summation drifts when summing thousands of small
funding/commission rows. The module uses a string→BigInt path with
`DEC_PRECISION = 18` to keep deterministic results without pulling
in a heavy decimal library.

The same precision discipline is enforced in
[[decisions/2026-05-03-bl-decimal-safe-narrative-accumulation]] for
the StoryNarrative final-balance accumulator.

## Sources

- `src/features/balance-log/lib/balanceLog.ts` —
  `reconcileUsdMFuturesBalance`, `decimal.add`
- `src/features/balance-log/lib/balanceLog.test.ts`
- `src/features/balance-log/components/story/StoryAudit.tsx`
- [[sources/sessions/2026-05-03-merge-into-macro-generator-and-redesign]]

## Related

- [[decisions/2026-05-03-bl-usds-m-only-scope]]
- [[decisions/2026-05-03-bl-decimal-safe-narrative-accumulation]]
- [[entities/balance-log-feature]]
- [[syntheses/balance-log-feature-overview]]
