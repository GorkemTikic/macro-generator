---
title: Balance Log parser heuristics (header-first, fallback shape detection)
tags: [concept, balance-log, parser, risk]
source: sources/sessions/2026-05-03-merge-into-macro-generator-and-redesign.md
date: 2026-05-03
status: active
---

# Concept: Balance Log parser heuristics

## Why heuristics, not fixed columns

The original `parseBalanceLog()` in the standalone BL app's
`src/App.tsx` assumed a fixed column order
(`[id, uid, asset, type, amount, …, time, symbol]`) and silently
`continue`-d on malformed lines. Any reorder by Binance, or a
copy-paste path that re-shuffled columns, broke the entire audit
without surfacing a warning.

The current parser was written to survive Binance's column
rearrangement and to fail loudly when it can't.

## Resolution

Replaced by `parseText` / `parseGrid` in
`src/features/balance-log/lib/balanceLog.ts`:

- Tries a **header-based column map** first (`detectHeader`),
  accepting a permissive set of aliases for each field.
- Falls back to a **position-aware shape heuristic** that locates
  the timestamp cell, then identifies type, asset, and amount via
  shape heuristics (looks at character class, length, sign).
- Every row that fails parsing becomes an entry in
  `ParseResult.invalid` with a reason — never silently dropped.

## Residual risk

- The heuristic fallback can still misidentify amount when a row
  has unusual shape (e.g. amount and id both 4-digit positive
  integers). When `parseMeta.headerUsed` is `null`, the Diagnostics
  tab flags this so the user can re-copy with the header row.
- A 2026-05-02 sanity pass fixed a no-header edge where broad asset
  detection could cause `TRANSFER` to be skipped as a type and
  `BTCUSDT` to be selected as the fallback type. The heuristic now
  separates type-shaped tokens from symbol/pair-shaped tokens.

## Sources

- `src/features/balance-log/lib/balanceLog.ts` —
  `parseRowWithHeader`, `parseRowHeuristic`, `detectHeader`
- `src/features/balance-log/lib/balanceLog.test.ts` — header reorder,
  missing columns, split date/time test cases
- [[sources/sessions/2026-05-03-merge-into-macro-generator-and-redesign]]

## Related

- [[concepts/dynamic-balance-log-types]]
- [[decisions/2026-05-03-bl-usds-m-only-scope]]
- [[entities/balance-log-feature]]
