---
title: Balance Log Analyzer feature overview
tags: [synthesis, balance-log, feature]
source: sources/sessions/2026-05-03-merge-into-macro-generator-and-redesign.md
date: 2026-05-03
status: active
---

# Balance Log Analyzer feature overview

High-level map of the BL feature inside Futures DeskMate. Read this
first when navigating the BL surface; follow the inline `[[…]]` links
to the deeper pages.

## What it is

The `balanceLog` tab inside Futures DeskMate. Originally a standalone
React/Vite app at
`Balance Log/balance-log-analyzer-main/balance-log-analyzer-main/`,
absorbed into this host project on 2026-05-03 — see
[[decisions/2026-05-03-merged-into-macro-generator-tab]].

Lives at `src/features/balance-log/`, scoped under `.balance-log-app`.
See [[entities/balance-log-feature]] for the file inventory.

## What an agent does with it

1. **Paste** a Binance USDⓈ-M Futures Balance Log into the
   `GridPasteBox` (contenteditable dropzone, `Ctrl+V`).
2. The parser splits rows by detected header (or shape heuristic if
   no header — see [[concepts/balance-log-parser-heuristics]]),
   excludes Coin-M / delivery rows with a visible reason
   ([[decisions/2026-05-03-bl-usds-m-only-scope]]), and emits
   structured `ParsedRow` objects.
3. Three KPI tiles show **Rows (total)** / **Rows (filtered)** /
   **Symbols (filtered)**.
4. Inner segmented tabs:
   - **Summary** — `RpnTable` cards by detected type+asset.
   - **By Symbol** — wide table with Realized PnL / Funding /
     Trading Fees / Insurance / Final Net per symbol; PNG export.
   - **Swaps & Events** — coin-swap ledger, auto-exchange ledger,
     Event Contracts (Orders / Payout).
   - **Diagnostics** — counts, format detected, header used,
     raw-types histogram, warnings, excluded list, invalid list.
5. The **Open Balance Story** button opens a right-side drawer
   (lazy chunk including recharts + html2canvas) with four tabs:
   - **Narrative** — composed story per group/asset, copy + PNG export.
   - **Agent Audit** — full reconciliation: start time + optional
     end + baseline + transfer-at-start + current wallet → expected
     vs actual per asset, match/mismatch/unknown badges, warnings,
     Copy Audit button. Math in
     [[concepts/usds-m-reconciliation-math]].
   - **Charts** — daily perf + asset distribution (recharts).
   - **Raw** — placeholder.
6. Toast feedback (no `alert()`) for copy/export actions.

## Three things the parser must never do

1. **Drop unknown row types silently.** Binance ships new types
   often. See [[concepts/dynamic-balance-log-types]].
2. **Mix Coin-M into USDⓈ-M wallet maths.**
   [[decisions/2026-05-03-bl-usds-m-only-scope]] quarantines them
   with a visible reason.
3. **Use floating-point for accumulation.** All sums use BigInt-backed
   `decimal.add` per [[concepts/usds-m-reconciliation-math]] and
   [[decisions/2026-05-03-bl-decimal-safe-narrative-accumulation]].

## i18n

Two-tier (host EN/TR for the outer chrome + drawer-scoped 10-language
selector for narrative content). See
[[entities/balance-log-feature]] §i18n.

## CSS scoping

Every selector is prefixed with `.balance-log-app` by
`scripts/scope-balance-log-css.cjs` running over the upstream
styles. Hand-edited tweaks live in
[[entities/balance-log-overrides-css]] (NOT in the generated file,
which gets wiped by the script). The bridge pattern is
[[concepts/css-token-bridge]].

## Tests

`npm test` runs Vitest against
`src/features/balance-log/lib/*.test.ts` — 9 files, 79 tests.

## Sources

- [[sources/sessions/2026-05-03-merge-into-macro-generator-and-redesign]]

## Related

- [[entities/balance-log-feature]]
- [[entities/balance-log-overrides-css]]
- [[decisions/2026-05-03-merged-into-macro-generator-tab]]
- [[decisions/2026-05-03-bl-usds-m-only-scope]]
- [[decisions/2026-05-03-bl-hidden-types-model]]
- [[decisions/2026-05-03-bl-decimal-safe-narrative-accumulation]]
- [[decisions/2026-05-03-bl-visible-row-filters]] — archived
- [[concepts/usds-m-reconciliation-math]]
- [[concepts/dynamic-balance-log-types]]
- [[concepts/balance-log-parser-heuristics]]
- [[concepts/css-token-bridge]]
- [[bugs/2026-05-03-bl-hidden-filters-silent-row-loss]]
- [[bugs/2026-05-03-bl-typefilter-toggle-semantics]]
- [[bugs/2026-05-03-circular-css-var-broke-drawer-button]]
