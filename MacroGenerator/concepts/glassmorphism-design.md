---
title: Premium Dark Mode (Glassmorphism)
tags: [concept, design, ui]
source: src/styles.css, README.md
date: 2026-04-25
status: active
---

# Premium Dark Mode (Glassmorphism)

Design language called "FD Premium aesthetic" in the README. Vanilla CSS, no framework.

## Characteristic features

- **Glassmorphism**: Translucent panels with `backdrop-filter: blur(...)`
- **Neon accents**: Vibrant gradient and glow effects
- **Dark mode default** — light mode yok
- Target classes listed in README: `.panel`, `.btn`, `.glass`

## Ned's vanilla CSS

- No tailwind/styled-components/MUI — low dependency, fast build
- One file: `src/styles.css` — entire design system in one place, easy find-and-replace
- Trade-off: design-token discipline maintained manually (via CSS variables)

## Consumption

Each component uses `className`s directly (e.g. `<div className="container">`, `<button className="tab active">`). No component-scoped CSS.

## Notes

- "FD" prefix = "FD Macro Generator" brand — Futures Department(?)
- This pattern also ensures that the output copied by agents appears **consistent** (markdown blockquote block etc.)

## Sources

- [[sources/docs/2026-03-21-readme]]

## Related

- [[decisions/vanilla-css-glass]]
- [[syntheses/design-system]]
