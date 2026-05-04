---
title: Dynamic balance-log types (no closed enum)
tags: [concept, balance-log, parser, dynamic-types]
source: sources/sessions/2026-05-03-merge-into-macro-generator-and-redesign.md
date: 2026-05-03
status: active
---

# Concept: Dynamic balance-log types

## Why this is a concept, not a bug

Binance routinely adds, renames, and reorganises balance-log row
`type` strings (e.g. `BFUSD_REWARD`, `INTERNAL_AGENT_REWARD`,
`FUTURES_PRESENT_SPONSOR_REFUND`). The application must not depend
on a closed enum — if it did, it would silently lose money in the
audit whenever Binance ships a new row type.

This is a **design property** of the Balance Log feature, not a
discrete defect. Future maintainers should not "tighten" the parser
into a typed union over known types.

## Mitigation in code

- `parseGrid` preserves the **exact raw type** in `ParsedRow.type`.
- `classifyType` adds a *secondary* broad category, but only for
  grouping in charts and narrative. Wallet maths uses the raw type.
- Unknown types are pushed into `ParseResult.unknownTypes` and
  surfaced in the Diagnostics tab.
- The `TypeFilter` chip strip is built dynamically from
  `detectedTypes`, so new types appear in the UI automatically and
  agents can show/hide them via [[decisions/2026-05-03-bl-hidden-types-model]].

## Open follow-up

When a brand-new stable asset appears, `decideScope` returns
`UNKNOWN` and includes it with a warning (per
[[decisions/2026-05-03-bl-usds-m-only-scope]]). Decide whether to
grow `USDM_QUOTE_ASSETS` automatically or require a manual
whitelist update. Currently manual.

## Sources

- `src/features/balance-log/lib/balanceLog.ts`
- `src/features/balance-log/components/TypeFilter.tsx`
- `src/features/balance-log/BalanceLogAnalyzer.tsx` (Diagnostics tab)
- [[sources/sessions/2026-05-03-merge-into-macro-generator-and-redesign]]

## Related

- [[concepts/balance-log-parser-heuristics]]
- [[decisions/2026-05-03-bl-usds-m-only-scope]]
- [[decisions/2026-05-03-bl-hidden-types-model]]
- [[entities/balance-log-feature]]
