---
title: LiveTicker rendered every symbol with .toFixed(2) — useless for low-tick coins
tags: [bug, ux, ticker, fixed]
source: sources/sessions/2026-05-03-full-codebase-audit-and-remediation.md
date: 2026-05-03
status: fixed
---

# Bug: LiveTicker rendered every symbol with .toFixed(2)

## Symptom

`LiveTicker` showed the live `markPrice` for any active symbol with two
decimal places hard-coded:

```ts
const applyPrice = (raw: string | number) => {
  const current = Number(raw);
  if (!Number.isFinite(current)) return;
  setPrice(current.toFixed(2));    // ← always 2 dp
  ...
};
```

For BTCUSDT (`~95,432.10`) this looks correct. For SHIBUSDT (`~0.0000123`)
or PEPEUSDT (`~0.00000845`), the header showed `0.00` for the entire
trading day.

## Root cause

The component was written before `getAllSymbolPrecisions()` was
introduced for the macro generator. When the symbol-precision map
became available repo-wide, the ticker was never updated to consume it.

## Fix

`LiveTicker` now resolves the symbol's `pricePrecision` once per symbol
and uses it for `.toFixed(...)`:

```ts
const precisionRef = useRef<number>(2);
...
getAllSymbolPrecisions()
  .then((map) => {
    if (closed) return;
    const dp = map?.[activeSymbol.toUpperCase()];
    if (typeof dp === 'number' && dp >= 0 && dp <= 12) {
      precisionRef.current = dp;
    }
  })
  .catch(() => { /* keep default precision */ });
...
setPrice(current.toFixed(precisionRef.current));
```

A ref (not state) so the WebSocket onmessage closure always reads the
latest value without re-rendering on precision arrival.

Default of 2 is sane for major pairs and prevents UI flash if
`exchangeInfo` is slow.

## Bonus fix in same edit

The fallback poller now pauses when `document.hidden`:

```ts
pollTimer = window.setInterval(() => {
  if (typeof document !== 'undefined' && document.hidden) return;
  pollMarkPrice();
}, 3_000);
```

Reduces wasted requests + lowers the chance of getting the Worker IP
rate-limited (HTTP 418).

## Related files

- `src/components/LiveTicker.tsx`

## Sources

- [[sources/sessions/2026-05-03-full-codebase-audit-and-remediation]]

## Related

- [[entities/live-ticker]]
- [[entities/pricing-ts]]
