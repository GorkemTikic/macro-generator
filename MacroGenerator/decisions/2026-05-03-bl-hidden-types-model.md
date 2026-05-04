---
title: TypeFilter uses hidden-types model instead of selected-shown
tags: [decision, balance-log, typefilter, ui, localStorage]
source: sources/sessions/2026-05-03-merge-into-macro-generator-and-redesign.md
date: 2026-05-03
status: active
---

# Decision: TypeFilter stores hidden types, not selected-shown

## Summary

`TypeFilter` stores `hiddenTypes: Set<string>` — the set of types
to exclude. Empty set means "show all" (fast path, no Set iteration).
The prior "selected shown" model had inverted toggle semantics and
the buttons were semantically identical; see
[[bugs/2026-05-03-bl-typefilter-toggle-semantics]] for the defect.

## Decision

1. `src/features/balance-log/components/TypeFilter.tsx` stores
   `hiddenTypes: Set<string>`.
2. **Toggle** adds the type to `hiddenTypes` if currently shown,
   removes it if currently hidden.
3. Empty-set fast path: when `hiddenTypes` is empty, no filtering
   occurs.
4. **Show All** button clears `hiddenTypes` (disabled when set is
   already empty).
5. **Hide All** button adds all detected types to `hiddenTypes`
   (disabled when all are already hidden).
6. localStorage key migrated from `bl.types.selected` to
   `bl.types.hidden`. The migration is run once per browser, gated
   by a `bl.migrated.v5` sentinel so the cleanup doesn't churn
   localStorage on every mount (see
   [[bugs/2026-05-03-bl-typefilter-toggle-semantics]]).

## Rationale

- "Hidden" matches user mental model: clicking a visible type should
  hide it.
- Empty-set-means-show-all preserved in both models, so the fast-path
  performance characteristic is unchanged.
- Renaming the buttons to **Show All** / **Hide All** makes their
  effect unambiguous regardless of prior selection state.

## Consequences

- Existing `bl.types.selected` keys are cleared on first load (the
  one-time migration sentinel runs after this is true), so users see
  all types by default. Acceptable starting state.

## Sources

- `src/features/balance-log/components/TypeFilter.tsx`
- `src/features/balance-log/BalanceLogAnalyzer.tsx` — sentinel-guarded
  one-time migration in a `useEffect(…, [])`
- [[sources/sessions/2026-05-03-merge-into-macro-generator-and-redesign]]

## Related

- [[bugs/2026-05-03-bl-typefilter-toggle-semantics]] — issue this
  decision resolves
- [[entities/balance-log-feature]]
