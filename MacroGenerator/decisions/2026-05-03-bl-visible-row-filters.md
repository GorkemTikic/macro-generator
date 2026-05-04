---
title: Visible state-backed row filters replaced localStorage persistence (now removed)
tags: [decision, balance-log, filters, localStorage, ux, archived]
source: sources/sessions/2026-05-03-merge-into-macro-generator-and-redesign.md
date: 2026-05-03
status: archived
---

# Decision (archived): Visible Row Filters card

## Why this is archived

The Row Filters UI documented here was **removed** later in the same
session at the user's explicit request ("Agent Audit and Row Filters
these tabs are not relevant so delete them"). This page is preserved
as a historical record of the prior model and the silent-row-loss
fix it delivered. The TypeFilter chip strip
([[decisions/2026-05-03-bl-hidden-types-model]]) remains active and
covers the only filtering behaviour the analyzer still ships.

## Original decision

Row filters (`t0`, `t1`, `symbolFilter`) were held in plain React
`useState` hooks and rendered as a visible **Row Filters** card in
`BalanceLogAnalyzer.tsx`. Filter state was never persisted across
sessions. The prior `bl.filters.v4` localStorage key was actively
purged on mount.

This replaced an earlier implementation that stored filter values
under `bl.filters.v4` but only consumed the getter, leaving stale
values invisibly affecting output. See
[[bugs/2026-05-03-bl-hidden-filters-silent-row-loss]] for the
silent-row-loss defect this decision had resolved.

## Original rationale

- Invisible state silently affecting output violates least surprise.
- Session-persistent filters add complexity without clear benefit
  for a tool opened on demand against a freshly uploaded log.
- Removing persistence eliminated the stale-state class of bug.

## Why the UI was later removed

After the merge into Futures DeskMate, the user determined the Row
Filters card was not pulling its weight on a tab that already has
the TypeFilter chip strip plus three KPI tiles plus four inner
tabs. Removing it tightened the BL surface without losing any
filter behaviour the user actually used.

## Sources

- `src/features/balance-log/BalanceLogAnalyzer.tsx` — Row Filters
  card removed; one-time `bl.filters.v4` cleanup retained
- [[sources/sessions/2026-05-03-merge-into-macro-generator-and-redesign]]

## Related

- [[bugs/2026-05-03-bl-hidden-filters-silent-row-loss]] — the silent
  row-loss bug that drove the original decision
- [[decisions/2026-05-03-bl-hidden-types-model]] — the filter
  behaviour the tab still ships
- [[entities/balance-log-feature]]
