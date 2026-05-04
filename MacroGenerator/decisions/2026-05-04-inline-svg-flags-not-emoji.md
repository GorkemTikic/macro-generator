---
title: Inline-SVG flags in the language switcher (don't depend on OS emoji fonts)
tags: [decision, ui, i18n, svg, flags]
source: sources/sessions/2026-05-04-zh-cn-trilingual-and-ux-polish.md
date: 2026-05-04
status: active
---

# Decision: Inline-SVG flags, not emoji

## Context

The language switcher buttons originally used regional-indicator emoji
to render flags:

```jsx
<span className="lang-flag">🇬🇧</span>
<span className="lang-flag">🇹🇷</span>
```

A flag emoji is a sequence of two regional-indicator code points
(e.g. 🇬🇧 = `U+1F1EC U+1F1E7`). When the system font has no glyph for
that pair, the browser falls back to rendering the underlying letters.
**Windows' Segoe UI Emoji ships no flag glyphs for 🇬🇧/🇹🇷/🇨🇳** — the
user (on Windows) saw literal `GB` and `TR` next to the language
labels. macOS / iOS / Android render fine because their emoji fonts
include flags.

Adding zh-CN ([[decisions/2026-05-04-add-zh-cn-trilingual]]) would
have made the problem worse — three flags potentially rendering as
six letters.

## Decision

Replace all three flags with **inline SVG**:

- **UK**: blue field with St-Andrew + St-Patrick + St-George crosses (60×30 viewBox, official `#012169` blue / `#C8102E` red).
- **TR**: red field `#E30A17` with white crescent (white circle minus offset red circle) + white 5-point star slightly rotated.
- **CN**: red field `#DE2910` with one large yellow `#FFDE00` star + four small stars in arc.

All render at 18×12 px with `border-radius: 2px` and a 1-px shadow ring
(`box-shadow: 0 0 0 1px rgba(0,0,0,0.35)`) for edge contrast against
the dark header.

CSS in `src/styles.css`:

```css
.lang-flag {
  display: inline-flex;
  align-items: center;
  line-height: 1;
  filter: grayscale(0.45);     /* dim when inactive */
  transition: filter var(--dur-2);
}
.lang-flag svg {
  display: block;
  width: 18px;
  height: 12px;
  border-radius: 2px;
  box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.35);
}
```

Existing `.lang-btn:hover .lang-flag` and `.lang-btn.active .lang-flag`
rules already set `filter: grayscale(0)` for full color on hover/active —
the SVG inherits this behavior automatically.

## Trade-offs

- **More markup per flag.** Each flag is now ~5–10 SVG primitives inline in `App.tsx` instead of a single emoji codepoint. Adds ~1.5 KB to the JSX. Acceptable.
- **No external font / image dependency.** The flags don't go via `<img>`, don't fetch from a CDN, work offline, and render byte-identically across OS.
- **A11y unchanged.** SVGs are `aria-hidden="true"` (the button text "EN" / "TR" / "ZH" carries the accessible label).

## Alternatives considered

- **Twemoji web font.** Adds a font load on every page view for what is essentially three tiny glyphs. Overkill.
- **`<img>` to a flag-icon CDN.** External dependency + render delay. Same anti-pattern.
- **`react-country-flag` or similar lib.** Pulls a runtime dep for three flags. Not worth it.

## Verification

A headless Playwright capture (Chromium, render-anywhere) confirmed
all three flags display correctly. Manual check on Windows confirmed
the GB/TR/ZH letters were no longer being substituted in.

## Sources

- [[sources/sessions/2026-05-04-zh-cn-trilingual-and-ux-polish]]

## Related

- [[bugs/2026-05-04-windows-emoji-flags-fall-back-to-letters]]
- [[decisions/2026-05-04-add-zh-cn-trilingual]]
- [[entities/app-tsx]]
