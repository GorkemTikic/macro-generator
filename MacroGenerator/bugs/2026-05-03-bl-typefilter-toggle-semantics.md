---
title: TypeFilter toggle semantics were inverted (Codex P2)
tags: [bug, balance-log, ui, typefilter, fixed]
source: sources/sessions/2026-05-03-merge-into-macro-generator-and-redesign.md
date: 2026-05-03
status: fixed
---

# Bug: TypeFilter toggle did the opposite of the user's intent

## Symptom

In the Balance Log Analyzer's TypeFilter chip strip, clicking a
visible type from the default empty-set state caused **only** that
type to remain visible (everything else hidden), instead of hiding
just that one type. The **Select All** and **Clear** buttons both
produced "show all" — there was no way to actually hide a type
intuitively.

Priority item **P2** from `CODEX_REVIEW_REPORT.md`.

## Root cause

`TypeFilter` used a "selected shown" model in its standalone form:

- State: `selectedTypes: string[]` where empty = show all.
- Toggle on empty set: click X → `selectedTypes = [X]`, making only
  X visible. User expectation: click X → hide X, everything else
  visible.
- **Select All** called `setSelectedTypes([])` → show all.
- **Clear** called `setSelectedTypes(detectedTypes)` → also show all
  (because "all selected" = "show all" in this model).
- Net result: both buttons did the same thing; no action could hide
  a single type.
- localStorage key `bl.types.selected` stored the selected array.

## Fix

Switched to a **hidden types** model. See
[[decisions/2026-05-03-bl-hidden-types-model]] for the full decision.

- State: `hiddenTypes: Set<string>` where empty set = show all
  (fast path preserved).
- Toggle: adds/removes from `hiddenTypes`. Clicking a visible type
  hides only that type.
- Buttons renamed **Show All** (clears the set, disabled when
  already empty) and **Hide All** (adds all detected types,
  disabled when all already hidden).
- localStorage key migrated from `bl.types.selected` to
  `bl.types.hidden`. The migration runs once per browser, gated
  by a `bl.migrated.v5` sentinel so cleanup doesn't churn
  localStorage on every mount.

## Sources

- `src/features/balance-log/components/TypeFilter.tsx`
- `src/features/balance-log/BalanceLogAnalyzer.tsx` — sentinel-guarded
  one-time migration
- `CODEX_REVIEW_REPORT.md` (P2)
- [[sources/sessions/2026-05-03-merge-into-macro-generator-and-redesign]]

## Related

- [[decisions/2026-05-03-bl-hidden-types-model]] — model switch decision
- [[entities/balance-log-feature]]
