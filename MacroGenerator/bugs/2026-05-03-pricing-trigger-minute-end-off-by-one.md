---
title: getTriggerMinuteCandles end-time off-by-one (Binance treats endTime inclusively)
tags: [bug, pricing, fixed]
source: sources/sessions/2026-05-03-full-codebase-audit-and-remediation.md
date: 2026-05-03
status: fixed
---

# Bug: getTriggerMinuteCandles end-time off-by-one

## Symptom

```ts
export async function getTriggerMinuteCandles(symbol, triggeredAtStr, market = "futures") {
  const start = msMinuteStartUTC(triggeredAtStr);
  const end = start + 60 * 1000;        // ← off by one
  ...
  return { mark: markJson.length ? parseCandle(markJson[0]) : null, ... };
}
```

The function asks Binance for `[start, start + 60_000]` to get the
single 1-minute candle that contains `triggeredAtStr`.

## Root cause

Binance's REST endpoints (`/fapi/v1/klines`,
`/fapi/v1/markPriceKlines`, `/api/v3/klines`) treat the `endTime`
parameter **inclusively**. So `endTime = start + 60_000` matches both:

- the candle whose `openTime == start` (intended)
- the candle whose `openTime == start + 60_000` (the next minute)

…and Binance returns 2 candles, not 1. Downstream code only reads
`json[0]` so the symptom is silent: the returned candle is correct
(it's the trigger minute), but the request bandwidth is wasted and
any future caller that reads `.length` or `[json.length - 1]` would
see surprising data.

## Fix

```ts
// Binance treats `endTime` inclusively, so subtract 1 ms to get exactly one
// candle. Without this, requests can return both the trigger minute and the
// following minute, and downstream code only reads `[0]`, hiding the bug.
const end = start + 60 * 1000 - 1;
```

## Why we caught it

The pricing-agent sub-review flagged this as part of the macros punchlist
(see [[sources/sessions/2026-05-03-full-codebase-audit-and-remediation]]
and the original macros-agent finding list). The fix is a single line.

## Note for `getRangeHighLow`

The same off-by-one also exists conceptually in `getRangeHighLow`, but
Binance's pagination (`fetchAllKlines`) uses `endTime` only as a hard
ceiling, and the cursor advances on `lastOpen + stepMs`. That code path
already handles the inclusivity by checking `if (next <= cur) break`, so
no fix was needed there.

## Related files

- `src/pricing.ts`

## Sources

- [[sources/sessions/2026-05-03-full-codebase-audit-and-remediation]]

## Related

- [[entities/pricing-ts]]
- [[concepts/binance-fapi-fallback]]
