---
title: Circular --accent self-ref blanked the Open Balance Story button
tags: [bug, css, tokens, balance-log, fixed]
source: sources/sessions/2026-05-03-merge-into-macro-generator-and-redesign.md
date: 2026-05-03
status: fixed
---

# Bug: Open Balance Story button rendered as a transparent box

## Symptom

After landing the Station design tokens
([[decisions/2026-05-03-station-design-system-adoption]]), the
**Open Balance Story** primary button in the Balance Log header
rendered as an empty rectangle with only a faint jade glow visible.
The "Clear" button next to it rendered correctly.

Screenshot context: the header strip shows two buttons — "Clear"
reads correctly, "Open Balance Story" appears as a thin black
rectangle with no visible text and only a subtle teal halo. Hover
does nothing visual.

## Root cause

The token bridge in `balance-log-overrides.css` was written as:

```css
.balance-log-app {
  --primary:      var(--accent);
  --primary-hover: oklch(0.82 0.14 168);
  --accent:       var(--accent);   /* ← circular */
}
```

Inside `.balance-log-app`, the right-hand `var(--accent)` resolves
against the BL scope's own `--accent` property — the same one being
defined. CSS treats this as an invalid declaration. `var(--accent)`
then resolves to its initial value (an empty token), which propagates:

- `--primary: var(--accent)` → resolves to nothing.
- `--accent: var(--accent)` → resolves to nothing.

The upstream BL CSS draws the primary button via a gradient:

```css
.balance-log-app .btn-dark {
  background: linear-gradient(135deg, var(--primary) 0%, var(--accent) 100%);
}
```

With both stops empty, the gradient is invalid. Background falls
back to transparent. The button's text color (`color: #fff`) was
technically white-on-transparent, which against the dark page surface
read as "empty". The
`box-shadow: 0 6px 18px rgba(0,229,168,0.18)` was the only visible
artefact (the faint jade halo).

## Fix

Replaced every `var(--accent)`-style reference inside the BL scope
bridge with hardcoded values that match the host design system:

```css
.balance-log-app {
  --bg:            #0a0d12;
  --panel:         #11151c;
  --text:          #e7ecf3;
  --primary:       oklch(0.78 0.14 168);
  --primary-hover: oklch(0.82 0.14 168);
  --accent:        oklch(0.78 0.14 168);
  --radius:        12px;
  --radius-sm:     8px;
}
```

Plus a defense-in-depth rule on the toolbar primary button itself so
the gradient is bypassed entirely:

```css
.balance-log-app .bl-toolbar-btn.btn-dark {
  background: oklch(0.78 0.14 168); /* solid jade */
  color: #00130d;
  border: 1px solid transparent;
  box-shadow: 0 6px 18px rgba(0,229,168,0.18),
              inset 0 1px 0 rgba(255,255,255,0.2);
}
```

## Lessons

- A circular custom-property reference does not throw a console
  error. It silently makes the var resolve to nothing, which can
  cascade into several rules and produce a "button doesn't exist"
  symptom that's hard to trace.
- When bridging tokens across a scope boundary that already declares
  the same name, **never** use `var()` to forward. Use literal values
  or pick a different bridge variable name.
- DevTools' computed-styles panel makes circular refs visible — the
  property shows as "invalid" — so reach for it first when a styled
  element renders empty.

## Related files

- `src/features/balance-log/balance-log-overrides.css` — token bridge
  (current state, fixed)
- `src/features/balance-log/balance-log.css` — generated upstream
  reference of `.balance-log-app .btn-dark`

## Sources

- [[sources/sessions/2026-05-03-merge-into-macro-generator-and-redesign]]

## Related

- [[concepts/css-token-bridge]]
- [[entities/balance-log-overrides-css]]
- [[decisions/2026-05-03-station-design-system-adoption]]
