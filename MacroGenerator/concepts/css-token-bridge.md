---
title: CSS token bridge across feature scope boundary
tags: [concept, css, tokens, architecture]
source: sources/sessions/2026-05-03-merge-into-macro-generator-and-redesign.md
date: 2026-05-03
status: active
---

# Concept: CSS token bridge across feature scope boundary

## Summary

Pattern for unifying a feature's internal design tokens with a host
app's design system when the feature's CSS uses scoped class names
(here `.balance-log-app`) and ships its own custom-property names
(`--bg`, `--panel`, `--accent`, …) that overlap or differ from the
host's. The bridge re-declares the feature's internal tokens inside
the scope wrapper with **hardcoded values** matching the host system.
References to the host's tokens (`var(--bg-1)` etc.) are intentionally
NOT used because circular references (`--accent: var(--accent)`)
break the entire cascade silently.

## Problem

The Balance Log feature was originally a standalone app whose
`styles.css` defined `:root { --bg: …; --accent: …; … }` plus a few
extra names (`--primary`, `--panel-2`, `--glow`, etc.). When merged
into a host with a different design system, the feature's CSS still
expects its own names. Two failure modes appear:

1. **No bridge** — the feature uses its standalone palette inside a
   host with different colors. Visually jarring; feels like two apps.
2. **Naive bridge with `var(--…)` self-reference** —
   `--accent: var(--accent)` re-declared inside the feature scope is
   circular. CSS treats it as invalid and `var(--accent)` resolves to
   nothing. Any rule using the feature's `--accent` (e.g. a
   `linear-gradient` primary button) renders empty / broken.

## Pattern

Inside the feature's scope wrapper, re-declare the feature's internal
tokens with **hardcoded values**:

```css
.balance-log-app {
  --bg:            #0a0d12;                /* mirrors host bg-1 */
  --panel:         #11151c;                /* mirrors host bg-2 */
  --text:          #e7ecf3;                /* mirrors host text-1 */
  --muted:         #6f7a8c;                /* mirrors host text-3 */
  --border:        rgba(255,255,255,0.06); /* mirrors host line-1 */
  --primary:       oklch(0.78 0.14 168);   /* host accent jade */
  --primary-hover: oklch(0.82 0.14 168);
  --accent:        oklch(0.78 0.14 168);   /* host accent jade */
  --radius:        12px;
  --radius-sm:     8px;
}
```

Each value is the literal that the host's design tokens resolve to.
The feature's stylesheet keeps using `var(--accent)` etc. and now
resolves those names against host-matched values.

## Trade-offs

- **Pro**: zero circular-ref risk, no `var()` chain depth,
  debuggable in DevTools (each name has an inspectable concrete value).
- **Pro**: feature CSS regeneration
  (`scripts/scope-balance-log-css.cjs`) doesn't need to know about
  the host token names.
- **Con**: if the host changes a token (e.g. swaps `--accent` jade
  for a different hue), the bridge values need to be updated by hand.
  Keeping the bridge file short and grouping the values under a
  clear comment block keeps this manageable.

## Why not `var()` references to the host

The host design system uses names like `--bg-1`, `--bg-2`, `--accent`.
The feature already uses `--accent` for its own purposes. Writing
`--accent: var(--accent)` inside the feature scope creates a
self-reference: the right-hand side resolves the feature-scope
property, which is the same one being defined. CSS treats this as
an invalid declaration.

The first session attempt used this naive form and it silently broke
the Open Balance Story button — see
[[bugs/2026-05-03-circular-css-var-broke-drawer-button]] for the
post-mortem.

## When to use this pattern

- A feature was a standalone app and shipped with its own token
  names.
- The host has a different design system but no plan to rewrite the
  feature's CSS at the source.
- The feature's CSS is regenerated from upstream (token names
  cannot be changed in the generated file).

## Sources

- [[sources/sessions/2026-05-03-merge-into-macro-generator-and-redesign]]

## Related

- [[entities/balance-log-overrides-css]]
- [[bugs/2026-05-03-circular-css-var-broke-drawer-button]]
- [[decisions/2026-05-03-merged-into-macro-generator-tab]]
- [[decisions/2026-05-03-station-design-system-adoption]]
