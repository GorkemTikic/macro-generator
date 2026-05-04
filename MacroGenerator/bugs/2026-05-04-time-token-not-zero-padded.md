---
title: Average Calculator parser stored single-digit hour as `0:03:56` instead of `00:03:56`
tags: [bug, parser, average-calculator, formatting, fixed]
source: sources/sessions/2026-05-04-zh-cn-trilingual-and-ux-polish.md
date: 2026-05-04
status: fixed
---

# Time token not zero-padded in Average Calculator

## Symptom

The Average Calculator's per-position card and copy text showed
non-zero-padded times for trades happening early in the day:

> POSITION #7   LONG   ✓ CLOSED   2026-01-28 23:03:56 → 2026-01-29 0:03:56

User feedback: *"the date is weird it should be 00 no?"* Expected
display:

> POSITION #7   LONG   ✓ CLOSED   2026-01-28 23:03:56 → 2026-01-29 00:03:56

## Root cause

The trade-history parser in `AverageCalculator.tsx` was permissive
about input — `timeRegex = /^\d{1,2}:\d{1,2}:\d{1,2}$/` accepted a
single-digit hour or minute or second — but stored the matched token
verbatim:

```ts
const dateStr = rawTokens[i] + ' ' + rawTokens[i + 1];
//                              ^^^^^^^^^^^^^^^^^^ raw, no normalization
```

The `dateStr` then propagated into every downstream consumer
(`pos.startDate`, `pos.endDate`, the per-trade card timestamp, the
copy block, the narrative), so every display showed the raw
`0:03:56`.

## Fix

Add a `padTime` step at the parser boundary so every component sees
normalized HH:MM:SS:

```ts
const padTime = (t: string) =>
  t.split(':').map(p => p.padStart(2, '0')).join(':');

// inside the for-loop, where dateStr is built:
const dateStr = rawTokens[i] + ' ' + padTime(rawTokens[i + 1]);
```

Applied at the parser line 71 of `AverageCalculator.tsx`. One change,
all downstream displays automatically show 2-digit components.

## Verification

`npm run build` 6.3 s green; `npm test` 79/79 passed. After the fix,
re-pasting the same trade history shows `00:03:56`.

## Files

- `src/components/AverageCalculator.tsx` — `padTime` helper added in `parseData`, applied to the time token before composing `dateStr`.

## Sources

- [[sources/sessions/2026-05-04-zh-cn-trilingual-and-ux-polish]]

## Related

- [[entities/average-calculator]]
- [[concepts/running-inventory-algorithm]]
