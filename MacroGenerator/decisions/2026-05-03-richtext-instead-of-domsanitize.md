---
title: Hand-roll a `<RichText>` component instead of adding DOMPurify
tags: [decision, security, dependencies]
source: sources/sessions/2026-05-03-full-codebase-audit-and-remediation.md
date: 2026-05-03
status: active
---

# Decision: Hand-roll a `<RichText>` component instead of adding DOMPurify

## Context

To remove `dangerouslySetInnerHTML` from
[[entities/average-calculator]] (see
[[bugs/2026-05-03-average-calc-dangerously-set-html]]), we needed
either:

1. A sanitizer (DOMPurify, etc.) that scrubs the existing HTML strings.
2. A render path that doesn't produce HTML strings at all.
3. A trivial parser that handles the small subset of "markup" actually
   used in those strings (`**bold**` plus a few hard-coded `<div
   style="...">` boxes for visual structure).

## Decision

Option 3. Added a 12-line `<RichText>` component and dropped all
`htmlText` string-builder branches.

## Rationale

- **Bundle size**: DOMPurify is ~22 KB minified. The app is already
  hitting >500 KB chunks (see end of session note for the chunk-size
  warning) — adding a sanitizer for one component would worsen the
  problem without addressing the root.
- **Surface area**: the locale functions in `locales.ts` only ever
  produced `<strong>`, `<em>`, and styled `<div>` blocks. Letting
  DOMPurify also pass `<a>`, `<img>`, etc. would actually *expand*
  what the component can render — wrong direction.
- **Static analysis**: a hand-rolled split-on-`\*\*` parser is trivial
  to audit. A DOMPurify integration adds a dependency we'd need to
  keep updated.
- **Future-proofing**: if a new locale function is added with novel
  markup, the parser will gracefully render it as plain text. No
  XSS surface, no silent rendering of unintended HTML.

## Implementation

```tsx
function RichText({ text }: { text: string }) {
  if (!text) return null;
  const parts = text.split(/\*\*(.+?)\*\*/g);
  return (
    <>
      {parts.map((part, i) =>
        i % 2 === 1
          ? <strong key={i}>{part}</strong>
          : <React.Fragment key={i}>{part}</React.Fragment>
      )}
    </>
  );
}
```

The visual structure (FLIP alert box, formula breakdown boxes) is now
React JSX driven by a `phaseDescriptors[]` array of plain data
(strings + arrays of strings), not by HTML strings.

## Consequences

- **Visual loss**: minor. The old `htmlText` had nested inline-style
  divs producing visual weight inside each line (avg-entry monospace
  callout, calc-formula gray box). The new render keeps these as JSX
  blocks per phase, but the per-line callouts are now folded into the
  `whiteSpace: 'pre-wrap'` text. We could add them back as JSX if
  needed without re-introducing `dangerouslySetInnerHTML`.
- **Future locale work**: if someone wants italics or links, they
  need to extend `<RichText>` (one regex addition each), not the
  HTML strings.

## Sources

- [[sources/sessions/2026-05-03-full-codebase-audit-and-remediation]]

## Related

- [[bugs/2026-05-03-average-calc-dangerously-set-html]]
- [[entities/average-calculator]]
- [[entities/locales-ts]]
