---
title: Design System (FD Premium / Glassmorphism)
tags: [synthesis, design, ui]
source: src/styles.css, README.md
date: 2026-04-25
status: active
---

# Design System: FD Premium

README'de "Premium Dark Mode design system (glassmorphism, vibrant gradients)" diye geçer.

## Characteristic elements

| Element | Detail |
|---|---|
| Background | Deep dark (black/dark blue), gradient |
| Cards/Panels | `backdrop-filter: blur(...)` + translucent background = **glass effect** |
| Accents | Vibrant gradient (pembe/mor/cyan) — neon glow |
| Typography | Sans-serif, white/light gray |
| Buttons | `.btn`, `.tab`, `.lang-btn` — hover'da glow intensify |
| Tabs | `.tab.active` — neon underline or gradient bg |
| Result panels | Markdown blockquote tarzında — copy-friendly |

## Target classes (listed in README)

- `.panel` — generic content kutusu
- `.btn` — buton base
- `.glass` — glass effect modifier

If the Agent is going to make UI changes, it should target these classes.

## Implementation

Tek dosya: `src/styles.css`. Vanilla CSS, framework yok. Component-scoped CSS yok. See [[decisions/vanilla-css-glass]] · [[concepts/glassmorphism-design]].

## Bilingual element'ler

- `.lang-switcher` + `.lang-btn` — top right in header
- `.lang-btn.active` highlight

## LiveTicker styling

`.ticker-badge` + dynamic `.ticker-up` (green) / `.ticker-down` (red) classes — price movement direction.

## Markdown outputs

Macro outputs markdown blockquote (`> **Mark Price:**`) — It looks nice in the UI and the format is preserved when copy-pasted to Slack/Discord/email.

## Sources

- [[sources/docs/2026-03-21-readme]]

## Related

- [[concepts/glassmorphism-design]]
- [[decisions/vanilla-css-glass]]
- [[entities/live-ticker]]
- [[entities/app-tsx]]
