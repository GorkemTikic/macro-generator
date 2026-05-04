---
title: src/App.tsx
tags: [entity, component, root]
source: src/App.tsx
date: 2026-04-25
status: active
---

# src/App.tsx

The main layout component of the application. Manages tab navigation
and the **EN / TR / ZH** language switcher, plus a token-gated Admin
chip in the header.

## Responsibilities

- 6 tab UI: **macros**, **lookup**, **funding**, **average**, **margin**, **balanceLog**
- Token-gated Admin chip (visible only when `localStorage._fd_admin_token` is set)
- Prop drill language state (`lang`: `'en' | 'tr' | 'zh'`) and `uiStrings` translations to children
- Shows `LiveTicker` component in header (current price of the active symbol)
- `useApp()` reads the global `activeSymbol` context

## Tab → Component mapping

| Tab | Component | Page |
|---|---|---|
| `macros` | [[entities/macro-generator-component]] | TP/SL/Slippage macros |
| `lookup` | [[entities/price-lookup]] | Price inquiry + trailing stop sim + closest miss + gap explainer |
| `funding` | [[entities/funding-macro-component]] | Funding rate macro |
| `average` | [[entities/average-calculator]] | Position open/close average + per-position card + flip detection |
| `margin` | [[entities/margin-restrictions]] | Transfer-in restricted asset list |
| `balanceLog` | [[entities/balance-log-feature]] | Balance Log Analyzer (lazy-mount on first activation, then kept mounted) |

## Language switcher

Three buttons in the header right region: **🇬🇧 EN** · **🇹🇷 TR** · **🇨🇳 ZH**.
Each flag is an **inline SVG** so it renders the same on every OS
(Windows' Segoe UI Emoji ships no flag glyphs and falls back to
the GB/TR/ZH letters — see [[bugs/2026-05-04-windows-emoji-flags-fall-back-to-letters]]
and [[decisions/2026-05-04-inline-svg-flags-not-emoji]]).

`Lang` type: `'en' | 'tr' | 'zh'`. Default `'en'`. State lives in
`App.tsx` and is passed as a prop to each child tab; child components
also receive `uiStrings={t}` where `t = uiStrings[lang] || uiStrings['en']`.

The brand subtitle next to the FD logo also adapts to the language:
"Binance Futures support workspace" / "Binance Futures destek
çalışma alanı" / "币安合约客服工作台".

## Notes

- Most tabs are always rendered (hidden by `display: none`) — state is preserved across tab switches; initial paint cost is moderately higher.
- `balanceLog` is **lazy-mounted on first activation** then kept mounted via `display:none` — the BL bundle (recharts + html2canvas in the lazy chunk) doesn't load for users who never open the tab.
- `lang` state is independent of tabs (top level).
- Tab state (`activeTab`) is local with `useState` — not reflected in the URL.
- `admin` tab is mounted only while active (so the AdminDashboard's lazy `exceljs` load only happens on agent demand).

## Recent updates

- **2026-05-04** — `Lang` type extended to `'en' | 'tr' | 'zh'`. Third (CN) flag button added with inline-SVG China flag (red field, gold central star + 4 arc stars). Brand subtitle gained zh variant. See [[decisions/2026-05-04-add-zh-cn-trilingual]] and [[sources/sessions/2026-05-04-zh-cn-trilingual-and-ux-polish]].
- **2026-05-03** — `balanceLog` tab added (Balance Log Analyzer absorbed into the host); see [[decisions/2026-05-03-merged-into-macro-generator-tab]].

## Sources

- [[sources/sessions/2026-04-22-margin-restrictions-build]] — `margin` tab added
- [[sources/sessions/2026-05-03-merge-into-macro-generator-and-redesign]] — `balanceLog` tab added
- [[sources/sessions/2026-05-04-zh-cn-trilingual-and-ux-polish]] — `zh` language + CN flag

## Related

- [[entities/app-context]] — Provider of hook `useApp`
- [[entities/locales-ts]] — `uiStrings` translations (now en/tr/zh)
- [[entities/live-ticker]] — embedded in header
- [[concepts/bilingual-tr-en]] — now trilingual
- [[decisions/2026-05-04-add-zh-cn-trilingual]]
- [[decisions/2026-05-04-inline-svg-flags-not-emoji]]
