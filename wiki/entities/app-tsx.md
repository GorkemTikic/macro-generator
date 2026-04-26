---
title: src/App.tsx
tags: [entity, component, root]
source: src/App.tsx
date: 2026-04-25
status: active
---

# src/App.tsx

The main layout component of the application. Manages tab navigation and EN/TR language switcher that switches between 5 tabs.

## Responsibilities

- 5 tab tab UI: **macros**, **lookup**, **funding**, **average**, **margin**
- Prop drill language state (`lang`: `'en' | 'tr'`) and `uiStrings` translations to children
- Shows `LiveTicker` component in header (current prices of BTC, ETH, etc.)
- `useApp()` reads the global `activeSymbol` context via `useApp()`

## Tab → Component mapping

| Tab | Component | Page |
|---|---|---|
| `macros` | [[entities/macro-generator-component]] | TP/SL/Slippage makroları |
| `lookup` | [[entities/price-lookup]] | Price inquiry + trailing stop sim |
| `funding` | [[entities/funding-macro-component]] | Funding rate macro |
| `average` | [[entities/average-calculator]] | Position open/close average |
| `margin` | [[entities/margin-restrictions]] | Transfer-in restricted asset list |

## Notes

- All tabs are always rendered (hidden by `display: none`) — state is preserved, but initial paint cost is high
- `lang` state independent of tabs (at top level)
- Tab state (`activeTab`) is local with `useState` — not reflected in the URL

## Sources

- [[sources/sessions/2026-04-22-margin-restrictions-build]] — Session to which the `margin` tab was added

## Related

- [[entities/app-context]] — Provider of hook `useApp`
- [[entities/locales-ts]] — `uiStrings` translations
- [[entities/live-ticker]] — embedded in header
- [[concepts/bilingual-tr-en]]
