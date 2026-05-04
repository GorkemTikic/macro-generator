---
title: `.lookup-tab` button rendered with browser-default gray fill (Spot/Futures toggle looked half-styled)
tags: [bug, css, ui, fixed]
source: sources/sessions/2026-05-04-zh-cn-trilingual-and-ux-polish.md
date: 2026-05-04
status: fixed
---

# `.lookup-tab` Spot/Futures button rendered with default OS button styling

## Symptom

In Price Lookup, the "Futures" / "Spot" toggle showed the active
button as a styled pill, but the inactive button looked like a raw
operating-system button — solid gray fill, default border, default
font. User feedback: *"on pricelookup the futures and spot buttons
looks weird."*

## Root cause

The `.lookup-tab` rule in `src/styles.css` set padding, font, color,
border-radius and a transition — but did **not reset** the native
`<button>` defaults (`background`, `border`, `appearance`,
`font-family`):

```css
.lookup-tab {
  flex: 1;
  text-align: center;
  padding: 8px;
  cursor: pointer;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 600;
  color: var(--muted);
  transition: all 0.2s ease;
  /* ← missing background/border/appearance reset */
}
```

The `.lookup-tab.active` variant overrode `background` so the active
button looked correct. Inactive buttons fell through to the browser's
defaults — gray fill on Windows, slightly different on macOS, etc.

## Fix

Add explicit native-button reset to `.lookup-tab` plus a sensible
`min-width` so both pills have consistent width:

```css
.lookup-tab {
  /* Reset native <button> defaults so inactive pills don't render
     with the browser's gray fill / default border. */
  background: transparent;
  border: 0;
  appearance: none;
  font-family: inherit;
  flex: 1;
  min-width: 84px;
  text-align: center;
  padding: 8px 16px;
  cursor: pointer;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 600;
  color: var(--muted);
  transition: background-color 160ms ease, color 160ms ease, box-shadow 160ms ease;
}
```

Same fix benefits the Average Calculator's LONG/SHORT presets which
use the same class on `<div>` elements (`background:transparent` /
`border:0` / `appearance:none` on a div is a no-op, harmless).

## Verification

`npm run build` 6.3 s green; `npm test` 79/79 passed. The Spot/Futures
toggle now renders as two consistent pills with no OS-default
styling leakage.

## Files

- `src/styles.css` — `.lookup-tab` rule.

## Sources

- [[sources/sessions/2026-05-04-zh-cn-trilingual-and-ux-polish]]

## Related

- [[entities/price-lookup]]
- [[entities/average-calculator]]
