---
title: Balance Log Analyzer merged into macro-generator as a tab
tags: [decision, balance-log, merge, architecture]
source: sources/sessions/2026-05-03-merge-into-macro-generator-and-redesign.md
date: 2026-05-03
status: active
---

# Decision: BL absorbed as `balanceLog` tab, scoped under `.balance-log-app`

## Context

Two separate React/Vite apps served the same Binance Futures support
agents: this `macro-generator` host and a standalone Balance Log
Analyzer. Agents had to switch between two deployed sites. The merge
brings both under one workspace with shared header chrome (live
ticker, language switch, admin) and a single tab strip.

## Decision

- BL source copied to `src/features/balance-log/` preserving the
  upstream layout (`components/`, `lib/`, `components/charts/`,
  `components/story/`, `BalanceLogAnalyzer.tsx`).
- All upstream `@/...` import aliases rewritten to relative paths.
  No `@` alias added to host `tsconfig.json` or `vite.config.ts`.
- A `scripts/scope-balance-log-css.cjs` transformer regenerates
  `src/features/balance-log/balance-log.css` from the upstream
  `styles.css`, prefixing every selector with `.balance-log-app`.
  The generated file carries a banner; integration tweaks live in
  `src/features/balance-log/balance-log-overrides.css`. See
  [[entities/balance-log-overrides-css]].
- BL is mounted **lazily** on first tab activation, then **kept
  mounted** with `display:none` so pasted rows survive other tab
  switches. State only resets on full page refresh (or the new
  Clear button).
- BL receives the host language and a `BalanceLogStrings` chrome
  i18n bundle from the host. The Story drawer keeps its own
  10-language selector for narrative content (drawer-scoped).

## Why this shape

- Keeping a feature folder isolates BL's surface area and lets the
  upstream BL repo continue to drift; we can re-run the scoping
  script to update generated CSS without touching the host.
- Lazy mount keeps `recharts` and `html2canvas` out of the initial
  bundle for users who never click into BL.
- Persistent mount via `display:none` (rather than unmount) protects
  agent productivity: pasting a 1,000-row balance log and switching
  to Price Lookup must not lose the parsed state.

## Affected surfaces

- [[entities/app-tsx]] — added `balanceLog` to `Tab` union; tab
  button with `01..06` index labels; persistent-mount pattern via
  `openedTabs: Set<Tab>`.
- [[entities/locales-ts]] — added `tabBalanceLog` plus a `bl*`
  chrome bundle in EN and TR for the analyzer header / KPIs / inner
  tabs / diagnostics list.
- [[entities/analytics-system]] — `Tab` union now includes
  `balanceLog`; new `TAB_LABELS` map renders "Balance Log" rather
  than camelCase in admin charts.
- New entity [[entities/balance-log-overrides-css]] documents the
  hand-edited override stylesheet.
- New scripts entry `scripts/scope-balance-log-css.cjs`.

## Sources

- [[sources/sessions/2026-05-03-merge-into-macro-generator-and-redesign]]

## Related

- [[entities/app-tsx]]
- [[entities/locales-ts]]
- [[entities/analytics-system]]
- [[entities/balance-log-overrides-css]]
- [[concepts/css-token-bridge]]
- [[decisions/2026-05-03-futures-deskmate-rename]]
- [[decisions/2026-05-03-station-design-system-adoption]]
