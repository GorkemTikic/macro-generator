---
title: Styling = Vanilla CSS, framework yok
tags: [decision, styling, dependencies]
source: src/styles.css, README.md
date: 2026-03-21
status: active
---

# Verdict: Vanilla CSS — no Tailwind/styled-components/MUI

## Decision

The entire design is written in vanilla CSS, in a single file `src/styles.css`. No component-scoped CSS, no CSS-in-JS, no utility framework.

Design language: **Premium Dark Mode** (glassmorphism + neon accents). See [[concepts/glassmorphism-design]].

## Justification

- **Low dependencies**: package.json is lightweight, build is fast
- **Single file**: central design token changes (with CSS variables)
- **AI parsing friendly**: README "Target classes like .panel, .btn, .glass" — agent finds easily
- **Bundle small**: No Tailwind PurgeCSS, no runtime CSS-in-JS

## Trade-off

- ❌ Component-scoped name conflict risk (BEM discipline required)
- ❌ Design token (color palette, spacing) is disciplined manually
- ✅ Acceptable for this small UI project

## Sources

- [[sources/docs/2026-03-21-readme]]

## Related

- [[concepts/glassmorphism-design]]
- [[syntheses/design-system]]
