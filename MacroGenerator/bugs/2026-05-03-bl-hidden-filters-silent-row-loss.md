---
title: Hidden global Balance Log filters caused silent row loss (Codex P1)
tags: [bug, balance-log, filters, localStorage, fixed]
source: sources/sessions/2026-05-03-merge-into-macro-generator-and-redesign.md
date: 2026-05-03
status: fixed
---

# Bug: Stale `bl.filters.v4` localStorage values silently dropped rows

## Symptom

A user opening the Balance Log Analyzer would sometimes find that
their pasted log was missing rows from the rendered tables — with no
filter chip, no banner, no "filter active" indicator. Refreshing the
page or returning the next day reproduced the same partial view.
Other users on different machines saw the full data set from the
same paste.

This was priority item **P1** from `CODEX_REVIEW_REPORT.md`.

## Root cause

The `bl.filters.v4` localStorage key stored `t0`, `t1`, and
`symbolFilter` filter values across browser sessions. The custom hook
in the standalone BL's `src/App.tsx` wired up the **getter** but
discarded the **setter** (`const [filters] =`). There was no UI
element to set or clear these values.

A user returning with stale values written by a long-ago session
would silently see rows disappear. Fresh sessions worked fine, hiding
the defect during development.

Because the filter state was invisible:

- Rows could disappear from the table for no apparent reason.
- There was no "filter active" indicator, no clear button, and no
  way to reset other than manually clearing localStorage.

## Fix

Originally fixed in the standalone BL (2026-05-03 P1 pass):

- Replaced the localStorage-backed filter state with three plain
  `useState("")` hooks for `t0`, `t1`, and `symbolFilter`.
- Added a visible **Row Filters** card in the UI, rendered only when
  rows are loaded.
- A **Clear filters** button appears whenever any filter field is
  non-empty.
- A `useEffect` on mount calls
  `localStorage.removeItem("bl.filters.v4")` to purge stale keys
  from existing user sessions.

After the merge into Futures DeskMate, the user later asked to
remove the Row Filters card entirely as redundant — the cleanup
`useEffect` was kept (now sentinel-guarded). See
[[decisions/2026-05-03-bl-visible-row-filters]] for that archival
context.

## Sources

- `src/features/balance-log/BalanceLogAnalyzer.tsx` — sentinel-guarded
  one-time `bl.filters.v4` cleanup
- `CODEX_REVIEW_REPORT.md` (P1)
- [[sources/sessions/2026-05-03-merge-into-macro-generator-and-redesign]]

## Related

- [[decisions/2026-05-03-bl-visible-row-filters]] — superseded
  decision page documenting the fix's UI
- [[entities/balance-log-feature]]
