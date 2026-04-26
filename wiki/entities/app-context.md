---
title: src/context/AppContext.tsx
tags: [entity, context, state]
source: src/context/AppContext.tsx
date: 2026-04-25
status: active
---

# src/context/AppContext.tsx

React Context — tek bir global state tutar: **`activeSymbol`** (default `"BTCUSDT"`).

## API

- `<AppProvider>` — wraps the application
- `useApp()` — returns `{ activeSymbol, setActiveSymbol }`. If called outside of Provider, it throws `Error`.

## Why is there

To share which symbol is "active" between `LiveTicker` and other panel components. Currently, most components hold their own symbol — infrastructure ready for growth.

## Notes

- Hard-coded default `"BTCUSDT"` — does not remember user preference (no localStorage)
- It's a bit overkill to use just a single state — context API, but the intent to scale it up is clear

## Sources

<!-- This file is not specifically discussed in the sources -->

## Related

- [[entities/app-tsx]] — single top-level consumer calling `useApp()`
- [[entities/live-ticker]] — candidate consumer for symbol synchronization
