---
title: Balance Log Analyzer feature
tags: [entity, feature, balance-log]
source: sources/sessions/2026-05-03-merge-into-macro-generator-and-redesign.md
date: 2026-05-03
status: active
---

# Entity: `src/features/balance-log/`

Top-level entity for the Balance Log Analyzer tab — originally a
standalone React/Vite app, absorbed into Futures DeskMate on
2026-05-03 via [[decisions/2026-05-03-merged-into-macro-generator-tab]].

## Folder layout

```
src/features/balance-log/
├── BalanceLogAnalyzer.tsx        — top-level component (props: lang, uiStrings)
├── balance-log.css               — generated, scoped under .balance-log-app (DO NOT edit)
├── balance-log-overrides.css     — host design system bridge + tweaks
├── components/
│   ├── Amount.tsx
│   ├── ErrorBoundary.tsx
│   ├── FilterBar.tsx
│   ├── GridPasteBox.tsx
│   ├── KpiStat.tsx
│   ├── RpnTable.tsx
│   ├── StoryDrawer.tsx
│   ├── SwapsEvents.tsx
│   ├── SymbolTable.tsx
│   ├── Tabs.tsx                  — inner tab strip
│   ├── Toast.tsx                 — class-based toast provider (replaces alert())
│   ├── TypeFilter.tsx
│   ├── charts/                   — recharts-based daily perf, asset distribution
│   └── story/
│       ├── StoryAudit.tsx        — Agent Audit reconciliation tab
│       ├── StoryCharts.tsx
│       ├── StoryNarrative.tsx
│       ├── StoryRaw.tsx          — currently a placeholder
│       └── types.ts
└── lib/
    ├── balanceLog.ts             — parser + decideScope + reconcileUsdMFuturesBalance
    ├── decimal.ts (in balanceLog.ts) — BigInt-backed decimal arithmetic
    ├── eventContracts.ts
    ├── exchangeEvents.ts         — coin-swap + auto-exchange ledgers
    ├── format.ts
    ├── i18n.ts                   — 10-language drawer strings
    ├── spotMarket.ts
    ├── story.ts
    └── *.test.ts                 — Vitest unit tests (~80 tests)
```

## What it does (in one screen)

Paste a Binance USDⓈ-M Futures Balance Log into `GridPasteBox`. The
parser separates real types dynamically (no closed enum), excludes
Coin-M activity with a visible reason, and emits structured rows.

The UI shows three KPI tiles (rows total / filtered / symbols), an
inner tab strip for **Summary** (`RpnTable` cards by type+asset),
**By Symbol** (`SymbolTable` with PnL / funding / fees / insurance /
final net), **Swaps & Events** (coin-swap ledger, auto-exchange,
Event Contract orders/payouts), and **Diagnostics** (parser totals,
warnings, raw-types histogram).

The **Open Balance Story** button opens a right-side drawer
(lazy-loaded chunk of recharts + html2canvas) with four tabs:
Narrative (composed story), Agent Audit (reconciliation:
baseline + transfer-at-start + activity → expected vs current
wallet), Charts (daily performance, asset distribution), Raw.

## Tab persistence

Mounted lazily on first activation, then kept mounted with
`display:none` so pasted rows survive switching to other tabs. State
only resets on full page refresh — or via the explicit **Clear**
button which resets `rawRows`, `parseMeta`, `error`, and bumps a
`pasteBoxKey` to remount `GridPasteBox` with an empty preview.

## CSS scoping

Every selector is prefixed with `.balance-log-app` by the
`scripts/scope-balance-log-css.cjs` transformer running over the
upstream `Balance Log/balance-log-analyzer-main/.../styles.css`.
Hand tweaks live in [[entities/balance-log-overrides-css]] (NOT in
the generated file).

## i18n

Two-tier:

1. **Outer chrome** (header / KPIs / inner tabs / diagnostics) —
   strings come from host's [[entities/locales-ts]] under `bl*` keys.
   Two languages: EN and TR.
2. **Story drawer** narrative/audit content — strings come from
   `src/features/balance-log/lib/i18n.ts`. Ten languages: en, tr,
   es, pt, vi, ru, uk, ar, zh, ko. Drawer-scoped selector — never
   elevated to global.

## Tests

`npm test` runs Vitest against `src/features/balance-log/lib/*.test.ts`
— 9 test files, 79 tests. Covers `balanceLog` parser, decimal
arithmetic, event contracts, exchange events, format helpers, i18n
keys, story composer, spot market.

## Public surface

`BalanceLogAnalyzer({ lang: LocalLang, uiStrings: BalanceLogStrings })`.
`LocalLang` and `BalanceLogStrings` are exported types; the host
threads `lang` and the relevant chunk of `t` into the component.

## Related decisions

- [[decisions/2026-05-03-merged-into-macro-generator-tab]]
- [[decisions/2026-05-03-bl-usds-m-only-scope]]
- [[decisions/2026-05-03-bl-hidden-types-model]]
- [[decisions/2026-05-03-bl-decimal-safe-narrative-accumulation]]
- [[decisions/2026-05-03-bl-visible-row-filters]] — archived
- [[decisions/2026-05-03-station-design-system-adoption]]

## Recent updates

- **2026-05-06** — `StoryDrawer.tsx`: replaced the plain `<select>` language picker with a custom `LangSelect` component. The component fetches flag images from `flagcdn.com/20x15/{code}.png` and renders a styled dropdown that respects `--bl-*` CSS tokens. `LANGUAGE_OPTIONS` gained a `flag` (ISO 3166-1 alpha-2) field. See [[sources/sessions/2026-05-06-balance-story-flag-dropdown]] and [[concepts/css-token-bridge]].

## Sources

- [[sources/sessions/2026-05-03-merge-into-macro-generator-and-redesign]]
- [[sources/sessions/2026-05-06-balance-story-flag-dropdown]] — custom flag-image dropdown in StoryDrawer

## Related

- [[entities/balance-log-overrides-css]]
- [[entities/app-tsx]] — host tab routing
- [[entities/locales-ts]] — `bl*` chrome strings
- [[concepts/css-token-bridge]]
- [[concepts/dynamic-balance-log-types]]
- [[concepts/usds-m-reconciliation-math]]
- [[syntheses/balance-log-feature-overview]]
