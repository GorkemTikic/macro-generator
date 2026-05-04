---
title: Language switcher flags rendered as `GB` / `TR` letters on Windows (no emoji glyph)
tags: [bug, ui, i18n, windows, font, fixed]
source: sources/sessions/2026-05-04-zh-cn-trilingual-and-ux-polish.md
date: 2026-05-04
status: fixed
---

# Flags render as letters on Windows

## Symptom

On Windows, the language switcher buttons displayed literal letters
where the flags should have been:

> `[ GB EN ]   [ TR TR ]`

— instead of the intended Union Jack / Turkish flag.

The same buttons rendered correctly on macOS / iOS / Android.

## Root cause

The buttons used regional-indicator emoji:

```jsx
<span className="lang-flag">🇬🇧</span>   {/* U+1F1EC + U+1F1E7 */}
<span className="lang-flag">🇹🇷</span>   {/* U+1F1F9 + U+1F1F7 */}
```

A flag emoji is a sequence of two regional-indicator code points. The
browser hands the pair to the system emoji font for shaping. **Windows'
default Segoe UI Emoji ships no glyphs for these pairs** — when there's
no glyph, the renderer falls back to displaying the code points as
their underlying letters (`GB`, `TR`). macOS / iOS / Android emoji
fonts include flag glyphs, so the same source renders correctly there.

Adding zh-CN ([[decisions/2026-05-04-add-zh-cn-trilingual]]) would have
made the problem worse — three flags potentially showing six letters.

## Fix

Replace all flag emoji with **inline SVG** in `src/App.tsx` and update
`.lang-flag` CSS in `src/styles.css` to wrap the SVG cleanly with a
hairline shadow border. See [[decisions/2026-05-04-inline-svg-flags-not-emoji]]
for the full design + the SVG markup.

After the fix:

> `[ 🇬🇧 EN ]   [ 🇹🇷 TR ]   [ 🇨🇳 ZH ]`

— rendered byte-identically on every OS, no font dependency.

## Verification

A headless Chromium screenshot (Playwright, `headless: true`) confirmed
the SVG flags render correctly. Manual check on Windows confirmed the
letters were no longer being substituted.

## Files

- `src/App.tsx` — emoji replaced with inline SVG (UK / TR / CN).
- `src/styles.css` — `.lang-flag` now `display: inline-flex` with `filter: grayscale(0.45)` (still dimmed when inactive); `.lang-flag svg { width: 18px; height: 12px; border-radius: 2px; box-shadow: 0 0 0 1px rgba(0,0,0,0.35); }`.

## Sources

- [[sources/sessions/2026-05-04-zh-cn-trilingual-and-ux-polish]]

## Related

- [[decisions/2026-05-04-inline-svg-flags-not-emoji]]
- [[decisions/2026-05-04-add-zh-cn-trilingual]]
- [[entities/app-tsx]]
