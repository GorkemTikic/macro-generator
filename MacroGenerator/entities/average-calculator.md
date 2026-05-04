---
title: src/components/AverageCalculator.tsx
tags: [entity, component, ui, algorithm]
source: src/components/AverageCalculator.tsx
date: 2026-04-25
status: active
---

# src/components/AverageCalculator.tsx (627 satır)

It parses the raw text copied from the Trade History grid and calculates the **opening** and **closing** average prices of the position. Critical feature: **Position Flip detection** (Long → Short or vice versa).

## Algorithm

**Running Inventory** — bkz. [[concepts/running-inventory-algorithm]].

Net position size is followed when navigating trades chronologically:
- Trade in the same direction → weighted addition to the average opening price
- Trade in the opposite direction → fall from the average; Position Flip if the net position changes sign
- Flip instant: close the previous position's close, open the new position with the remaining amount

## Parser

`parseData` regex based:
- `dateRegex = /^\d{4}-\d{2}-\d{2}$/`
- `timeRegex = /^\d{1,2}:\d{1,2}:\d{1,2}$/`
- After finding the date+time anchor, it extracts symbol, side (BUY/SELL), positionSide (LONG/SHORT/BOTH), order ID (8+ digits) from the surrounding tokens (±25 token window)

Token-based parsing — Based on Binance UI's copied row format. If the format changes, it will break.

## Bilingual

Gets labels like `avgSysReady` from the `uiStrings` prop. Supports EN/TR language output.

## Recent updates (2026-05-03)

- **No more `dangerouslySetInnerHTML`.** The `htmlText` and
  `finalSummaryHtmlText` string-builder branches were removed from
  `processGroup`; the renderer now uses a tiny `<RichText>`
  component (handles `**bold**`) plus a `phaseDescriptors[]` array
  of structured per-phase data rendered as JSX. See
  [[bugs/2026-05-03-average-calc-dangerously-set-html]] and
  [[decisions/2026-05-03-richtext-instead-of-domsanitize]].
- **Double `let isFlipped` shadowing** removed — the outer
  declaration was dead. The phase-end check now reads the only
  `isFlipped` in scope.
- The four locale builder functions in `locales.ts`
  (`avgBuildClosedText`, `avgBuildExpandedText`, etc.) are still
  exported but now only called with `isHtml: false`. `avgFlipHtml`
  is unused — could be deleted in a future cleanup.

## Sources

<!-- This component was not directly discussed in the sessions, from code review -->
- [[sources/sessions/2026-05-03-full-codebase-audit-and-remediation]]

## Related

- [[entities/locales-ts]]
- [[concepts/running-inventory-algorithm]]
- [[concepts/bilingual-tr-en]]
- [[bugs/2026-05-03-average-calc-dangerously-set-html]]
- [[decisions/2026-05-03-richtext-instead-of-domsanitize]]
