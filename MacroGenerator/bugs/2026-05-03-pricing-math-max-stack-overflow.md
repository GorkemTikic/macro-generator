---
title: pricing.ts Math.max(...arr) stack-overflow on long ranges
tags: [bug, pricing, performance, fixed]
source: sources/sessions/2026-05-03-full-codebase-audit-and-remediation.md
date: 2026-05-03
status: fixed
---

# Bug: pricing.ts Math.max(...arr) stack-overflow on long ranges

## Symptom

`getRangeHighLow(symbol, fromStr, toStr)` and `getLastPriceAtSecond` used
the spread idiom to find the highest/lowest value of a candle/trade
array:

```ts
const highs = candles.map((c) => parseFloat(c[2]));
markHigh = Math.max(...highs);  // RangeError: Maximum call stack size exceeded
const idxH = highs.indexOf(markHigh);
```

A 90-day 1-minute fetch is 129,600 candles. V8's argument cap is around
65k–125k depending on the engine version, so spreading triggers
`RangeError`. The error propagates to the user as the literal V8 message
with no context.

## Root cause

`Math.max(...arr)` requires all elements to fit on the JS argument
stack. For arrays past the engine limit (~125k on V8) it throws. The
bug only manifests on long ranges that the price-lookup tool explicitly
supports (Find Price's Hierarchical Search reaches months of 1m
candles).

Secondary issue: `indexOf(value)` re-scans the array, doubling the
work and producing wrong indices when two candles tie on the high (it
returns the *first* match, ignoring time-of-tie semantics).

## Fix

Added two helpers at the top of `pricing.ts`:

```ts
function argMax(arr: number[]): { value: number; index: number } {
  let v = -Infinity, i = -1;
  for (let k = 0; k < arr.length; k++) { if (arr[k] > v) { v = arr[k]; i = k; } }
  return { value: v, index: i };
}
function argMin(arr: number[]): { value: number; index: number } { ... }
```

Replaced four sites in `pricing.ts` (spot lastCandles, futures markCandles,
futures lastCandles in `getRangeHighLow`, and `getLastPriceAtSecond`):

```ts
const h = argMax(highs);
const l = argMin(lows);
markHigh = h.value;
markLow = l.value;
markHighTime = fmtUTC(Number(markCandles[h.index][0]));
markLowTime  = fmtUTC(Number(markCandles[l.index][0]));
```

Single linear pass, no spread, deterministic tie-breaking (first index
wins — same semantics as the old `indexOf` but explicit).

## Verification

`npm test` (vitest, 79 tests) green. Build green at 6.29 s. The
specific fold pattern is what `Array.reduce` would produce; we wrote it
out for clarity over functional brevity.

## Related files

- `src/pricing.ts`

## Sources

- [[sources/sessions/2026-05-03-full-codebase-audit-and-remediation]]

## Related

- [[entities/pricing-ts]]
