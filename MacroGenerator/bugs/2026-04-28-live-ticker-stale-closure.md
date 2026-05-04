---
title: LiveTicker color indicator never lit (stale closure)
tags: [bug, react, websocket, live-ticker]
source: sources/sessions/2026-04-28-end-to-end-audit-pass.md
date: 2026-04-28
status: fixed
---

# Bug: LiveTicker up/down color never updates

## Symptom

The header `LiveTicker` shows the live mark price for the active symbol but the
green/red flash (`ticker-up` / `ticker-down`) never appears, even when the price
clearly moves between updates.

## Root cause

`LiveTicker` previously stored the previous price in component state
(`prevPrice`) and read it from inside the WebSocket `onmessage` handler:

```tsx
useEffect(() => {
  const ws = new WebSocket(...);
  ws.onmessage = (event) => {
    if (prevPrice !== null) { ... }    // captured at effect-run time
    setPrevPrice(current);
  };
  return () => ws.close();
}, [activeSymbol]);
```

Classic stale-closure: the effect's deps are `[activeSymbol]`, so the effect
runs once per symbol change. The `onmessage` callback captures `prevPrice` from
that initial render — always `null`. `setPrevPrice` triggers a re-render, but
the closure inside the still-open WebSocket keeps reading the old `prevPrice`,
so `prevPrice !== null` is permanently false and the color branch never fires.

## Fix

Replace the `prevPrice` state with a `useRef`, and reset it whenever the symbol
changes. The ref's `.current` always reflects the latest write, so the closure
can read it correctly without re-subscribing to the socket.

See [[entities/live-ticker]].

## Sources

- [[sources/sessions/2026-04-28-end-to-end-audit-pass]]

## Related

- [[entities/live-ticker]]
