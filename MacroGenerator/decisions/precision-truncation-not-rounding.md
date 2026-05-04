---
title: Price precision = truncate, not round
tags: [decision, formatting, accuracy]
source: src/macros/helpers.ts
date: 2026-03-21
status: active
---

# Verdict: Truncate, no rounding when applying pricePrecision

## Decision

The `truncateToPrecision(raw, prec)` function removes excess decimals by **string slicing**. `0.123456789` + prec=4 → `"0.1234"` (`"0.1235"` if there was rounding).

## Justification

Binance UI also shows **trunc** behavior in its precision. If the agent's output is round:
- Agent tells the user "trigger price was 0.1235"
- User sees `0.1234` in Binance UI
- "This is wrong, I saw it was 0.1234" he returns.

Inconsistency creates distrust. A one-to-one Binance view with Truncate.

## Implementation

```ts
const [intPart, decPart = ""] = String(raw).split(".");
return `${intPart}.${decPart.slice(0, prec)}`;
```

Pure string operation — `Number.toFixed` (does rounding) is not used.

## Trade-off

- ❌ Not mathematically "correct rounding"
- ✅ Full compatibility with Binance UI — the price given by the agent appears the same on the user's screen

## Sources

<!-- Not discussed directly in sessions, code review + helpers.ts comments -->

## Related

- [[entities/macros-helpers]]
- [[entities/pricing-ts]] — `getAllSymbolPrecisions` precision map source
