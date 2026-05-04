---
title: dangerouslySetInnerHTML in AverageCalculator with locale-built HTML
tags: [bug, security, xss, fixed]
source: sources/sessions/2026-05-03-full-codebase-audit-and-remediation.md
date: 2026-05-03
status: fixed
---

# Bug: dangerouslySetInnerHTML with locale-built HTML in AverageCalculator

## Symptom

`AverageCalculator.tsx` rendered each parsed trade and the per-phase
summary using `dangerouslySetInnerHTML`. The HTML strings were assembled
from `uiStrings.avgFlipHtml(...)`, `avgBuildClosedText(...)`,
`avgBuildExpandedText(...)`, etc. — locale functions that interpolate
`tr.orderId`, `tr.qty`, `tr.price`, `symbol`, `currentPosString` into
literal HTML markup with inline styles.

```tsx
<div dangerouslySetInnerHTML={{ __html: item.htmlText }} />
<div dangerouslySetInnerHTML={{ __html: results.finalSummaryHtmlText }} />
```

## Root cause

Theoretical XSS surface. In practice today, every interpolated value
flows through one of these sanitizing paths:

- `tr.orderId` matched by `/^\d{8,}$/` (digits only).
- `tr.qty` / `tr.price` produced by `.toFixed(4)` (numbers only).
- `symbol` passed through `normalizeSymbol` → `[^A-Z0-9_/-]` stripped.
- `currentPosString` is one of LONG / SHORT / BOTH / HEDGE_LONG / HEDGE_SHORT.

So no exploit exists today. The bug is **future-proofing**: any future
edit that loosens one of those regexes — or that introduces a free-text
field (e.g. user-supplied label / note) — becomes immediate XSS.

## Fix

1. Removed every `htmlText` / `finalSummaryHtmlText` string-builder
   branch from `processGroup`. Only `copyText` (markdown-with-`**bold**`)
   and structured per-phase descriptors survive.
2. Added a tiny `<RichText>` component that splits on `\*\*(.+?)\*\*`
   and renders even-index parts as plain text, odd-index parts as
   `<strong>`. No HTML strings, no DOMPurify dependency. See
   [[decisions/2026-05-03-richtext-instead-of-domsanitize]].
3. Per-trade event lines render `<RichText text={item.copyText} />`
   inside a `whiteSpace: 'pre-wrap'` block.
4. Per-phase summary boxes (label header, narrative, entry-formula box,
   close-formula box) render directly as JSX via a
   `phaseDescriptors[]` array carrying `{label, narrative,
   entryFormulaText: {parts, qty, avg}, closeFormulaText: …}`.

The visual look is preserved (FLIP detector keeps its yellow border via
`actionType === 'FLIP'` already-existing CSS). Background tints on the
formula boxes are now JSX-controlled `style={{...}}` rather than
HTML-string-embedded.

## Related files

- `src/components/AverageCalculator.tsx`
- `src/locales.ts` (the `avgFlipHtml`, `avgBuildClosedText`, … functions
  are still exported but no longer called with `isHtml: true`. They
  could be simplified in a follow-up.)

## Sources

- [[sources/sessions/2026-05-03-full-codebase-audit-and-remediation]]

## Related

- [[decisions/2026-05-03-richtext-instead-of-domsanitize]]
- [[entities/average-calculator]]
- [[entities/locales-ts]]
