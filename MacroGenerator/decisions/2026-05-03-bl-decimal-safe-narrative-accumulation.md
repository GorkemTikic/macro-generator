---
title: StoryNarrative uses decimal.add() for final balance accumulation
tags: [decision, balance-log, decimal, arithmetic, story]
source: sources/sessions/2026-05-03-merge-into-macro-generator-and-redesign.md
date: 2026-05-03
status: active
---

# Decision: BigInt-backed decimal arithmetic for narrative accumulation

## Summary

Final balance accumulation in `StoryNarrative` uses `decimal.add()`
from `src/features/balance-log/lib/balanceLog.ts` (BigInt-backed
decimal arithmetic) instead of JavaScript's native `+=` on
floating-point numbers. The accumulator is `Record<string, string>`
and converts to `number` only at the output stage.

## Context

The prior implementation summed amounts with native float `+=`:

```ts
acc[r.asset] = (acc[r.asset] || 0) + r.amount;
```

`r.amount` is a JavaScript `number`, so repeated addition
accumulated IEEE-754 drift. Values like `17.100452619999988` appeared
in the Narrative's final balance lines instead of `17.10045262`. The
same precision issue had already been solved for the reconciliation
math (see [[concepts/usds-m-reconciliation-math]]); this decision
brings the Narrative into alignment.

## Decision

1. Change accumulator type from `Record<string, number>` to
   `Record<string, string>`.
2. Use `r.amountStr ?? String(r.amount)` as input to each addition.
   `amountStr` is the original string from the balance log file, so
   the full source precision is preserved and float rounding is
   never re-introduced.
3. Accumulate via `decimal.add(acc[r.asset] ?? "0", amountInput)`
   where `decimal.add` is the BigInt-backed helper in `balanceLog.ts`.
4. Convert to `number` only at the point where the value is passed
   to a rendering or arithmetic consumer that requires a `number`.

## Rationale

- `amountStr` captures the exact string Binance exported; using it
  as the arithmetic input avoids any precision loss from the earlier
  parse step.
- BigInt-backed decimal arithmetic eliminates IEEE-754 drift for all
  realistic balance values in the Binance USDⓈ-M domain.
- The accumulator change is local to `StoryNarrative`; no public API
  is affected.

## Consequences

- Displayed final balances match the source data exactly rather than
  showing floating-point artefacts.
- Consistent with the decimal-safe approach already used in the
  reconciliation model.

## Sources

- `src/features/balance-log/components/story/StoryNarrative.tsx`
- `src/features/balance-log/lib/balanceLog.ts` — `decimal.add()` impl
- [[sources/sessions/2026-05-03-merge-into-macro-generator-and-redesign]]

## Related

- [[concepts/usds-m-reconciliation-math]] — establishes decimal-safe
  arithmetic as the project standard
- [[entities/balance-log-feature]]
