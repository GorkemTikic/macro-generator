---
title: "2026-05-06: Balance Story Custom Flag-Image Language Selector"
type: session
date: 2026-05-06
tags: [ux, balance-log, story-drawer, i18n, flags]
status: active
---

# 2026-05-06 Balance Story Custom Flag-Image Language Selector

## Objective

Replace the plain `<select>` element in the Balance Story drawer's
language picker with a custom dropdown that renders real country flag
images, matching the visual quality of the main app's inline-SVG flag
switcher.

## What was done

### 1. Add flag emoji to existing `<select>` (interim)

Commit `1a27e19` — 10 lines changed in `StoryDrawer.tsx`.

Added emoji flag characters to the `LANGUAGE_OPTIONS` array labels
inside the `<select>` element:

```tsx
// Before
{ value: "en", label: "English" }
// After (interim)
{ value: "en", label: "🇬🇧 English" }
```

This was a quick first attempt. Reverted/superseded by commit
`195990f` in the same session.

### 2. Replace `<select>` with custom `LangSelect` component (final)

Commit `195990f` — 107 insertions, 23 deletions in `StoryDrawer.tsx`.

**`LANGUAGE_OPTIONS` updated** — added a `flag` field (ISO 3166-1
alpha-2 code, lowercase) to each option, used to fetch the flag image
from `flagcdn.com`:

| lang | flag | label |
|---|---|---|
| `en` | `gb` | English |
| `tr` | `tr` | Türkçe |
| `es` | `es` | Español |
| `pt` | `br` | Português |
| `vi` | `vn` | Tiếng Việt |
| `ru` | `ru` | Русский |
| `uk` | `ua` | Українська |
| `ar` | `sa` | العربية |
| `zh` | `cn` | 中文 |
| `ko` | `kr` | 한국어 |

**New `LangSelect` component** — a headless, accessible custom dropdown:

- Trigger button: styled with `--bl-surface / --bl-border / --bl-text`
  tokens; shows flag image (`flagcdn.com/20x15/{code}.png`), selected
  language label, native name in muted parentheses, and a `▼` chevron.
  `minWidth: 180`.
- Dropdown panel: positioned `absolute` below the trigger (`top:
  calc(100% + 4px)`), right-aligned, `zIndex: 200`, dark surface with
  `boxShadow: "0 8px 32px rgba(0,0,0,0.5)"`, `borderRadius: 10`.
  Closes on `onBlur` with 150 ms delay to allow `onMouseDown` to fire
  first (avoids race between blur and click).
- Each option row: flag image + label + native name (right-aligned,
  muted). Active option gets `rgba(99,102,241,0.15)` background and
  indigo text (`--bl-accent: #818cf8`). Hover: `rgba(255,255,255,0.05)`.
- Closing: `onBlur` on trigger button + `onMouseDown` on options (not
  `onClick`) — prevents the blur from firing before the selection
  registers.
- Image size: `20×15 px`, `borderRadius: 2px`, `flexShrink: 0`.

**Replacement in StoryDrawer**: the old inline `<select>` block was
replaced with `<LangSelect value={lang} onChange={setLang} />`.

## Design intent

The flag images (`flagcdn.com`) are the same CDN used in the main
app's lang switcher. The visual style mirrors the host's dark-mode
palette via `--bl-*` CSS vars, consistent with the
[[concepts/css-token-bridge]] pattern already in use for Balance Log
scoped styling.

## Files touched

- `src/features/balance-log/components/StoryDrawer.tsx`

## Sources

- [[sources/sessions/2026-05-06-balance-story-flag-dropdown]]

## Related

- [[entities/balance-log-feature]]
- [[concepts/css-token-bridge]]
- [[decisions/2026-05-04-inline-svg-flags-not-emoji]]
