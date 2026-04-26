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

- 2 decimal formatting hardcoded — insufficient for low precision coins (e.g. SHIBUSDT 0.00002345); no precision-aware formatting
- There is no color in the first message because the `prevPrice` state is captured in the closure (normal, not race condition)
- No automatic reconnect in case of disconnection

## Sources

<!-- Not discussed directly in sessions -->

## Related

- [[entities/app-context]] — `activeSymbol` consumer
- [[entities/binance-fapi]] — WebSocket endpoint
