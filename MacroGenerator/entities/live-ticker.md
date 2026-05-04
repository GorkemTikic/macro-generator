---
title: src/components/LiveTicker.tsx
tags: [entity, component, ui, websocket]
source: src/components/LiveTicker.tsx
date: 2026-04-25
status: active
---

# src/components/LiveTicker.tsx (45 satır)

Live price indicator embedded in header. Binance Futures connects to **WebSocket** (not REST).

## Stream

1. `useApp()` is read from `activeSymbol`
2. Connect to stream `wss://fstream.binance.com/ws/${symbol.toLowerCase()}@markPrice`
3. `data.p` (mark price) in each message → round to 2 decimals, render
4. Compare with previous price → green (`ticker-up`) or red (`ticker-down`) class
5. When `activeSymbol` changes, WebSocket closes + new one opens (effect cleanup)

## Notes

- ~~2 decimal formatting hardcoded — insufficient for low precision coins~~ **Fixed 2026-05-03.** Now reads per-symbol `pricePrecision` from `getAllSymbolPrecisions()` once per symbol and uses it for `.toFixed(...)`. Default of 2 if `exchangeInfo` fetch fails. See [[bugs/2026-05-03-live-ticker-precision-fixed-decimals]].
- The closure-stale-`prevPrice` issue was fixed in 2026-04-28 via a ref. See [[bugs/2026-04-28-live-ticker-stale-closure]].
- No automatic reconnect in case of disconnection. Fallback REST poll (3 s interval) starts on `onerror`/`onclose` and now pauses when `document.hidden` to avoid 418s on hidden tabs.
- `console.warn`/`console.error` are gated by `import.meta.env?.DEV` so production users don't see noise in DevTools.

## Recent updates (2026-05-03)

- Per-symbol precision lookup (replaces hard-coded 2 dp).
- Visibility-aware fallback polling (`document.hidden` short-circuits
  the 3 s poller).
- Dev-only console logging.

See [[sources/sessions/2026-05-03-full-codebase-audit-and-remediation]].

## Sources

- [[sources/sessions/2026-04-28-end-to-end-audit-pass]]
- [[sources/sessions/2026-05-03-full-codebase-audit-and-remediation]]

## Related

- [[entities/app-context]] — `activeSymbol` consumer
- [[entities/binance-fapi]] — WebSocket endpoint
- [[entities/pricing-ts]] — `getAllSymbolPrecisions`
- [[bugs/2026-04-28-live-ticker-stale-closure]]
- [[bugs/2026-05-03-live-ticker-precision-fixed-decimals]]
