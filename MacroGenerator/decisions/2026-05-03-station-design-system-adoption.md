---
title: Adopted "Station" design tokens for Futures DeskMate
tags: [decision, design-system, css, tokens]
source: sources/sessions/2026-05-03-merge-into-macro-generator-and-redesign.md
date: 2026-05-03
status: active
---

# Decision: Replace radial-gradient/Orbitron aesthetic with Station tokens

## Context

The host had a "cyberpunk premium" treatment: Orbitron font on the
ticker, radial gradient backgrounds at `:root`, neon-green glows
(`#00e5a8` → `#00ff f2` border halos). When BL was merged in, two
visual identities collided. Claude Design delivered a coherent
operational dark-workspace token system called "Station" that
replaces the cyberpunk aesthetic.

Conflicts with the prior glassmorphism direction in
[[concepts/glassmorphism-design]] and [[decisions/vanilla-css-glass]]
— those are now historical context, superseded but not deleted.

## Decision

Rewrite `src/styles.css` `:root` with the Station tokens. Keep
legacy aliases so existing components keep rendering through the
migration.

### Tokens (excerpt)

```css
:root {
  /* Surfaces */
  --bg-0: #07090d; --bg-1: #0a0d12; --bg-2: #11151c;
  --bg-3: #161b24; --bg-4: #1c2230; --bg-quote: #0d1218;

  /* Borders, hairlines */
  --line-1: rgba(255,255,255,0.06);
  --line-2: rgba(255,255,255,0.10);
  --line-3: rgba(255,255,255,0.16);

  /* Text contrast */
  --text-1: #e7ecf3; --text-2: #aab3c2;
  --text-3: #6f7a8c; --text-4: #4a5364;

  /* Brand + state, oklch single-axis hue rotation */
  --accent:    oklch(0.78 0.14 168);  /* jade */
  --accent-2:  oklch(0.78 0.14 75);   /* amber */
  --pos:       oklch(0.78 0.14 158);
  --neg:       oklch(0.70 0.16 25);
  --warn:      oklch(0.80 0.13 80);
  --info:      oklch(0.78 0.10 220);
  --mark:      oklch(0.78 0.10 220);
  --last:      oklch(0.78 0.14 168);

  /* Type */
  --font-sans: "Inter", system-ui, sans-serif;
  --font-mono: "JetBrains Mono", ui-monospace, monospace;

  /* Legacy aliases (kept for backwards compat) */
  --bg:     var(--bg-1);
  --panel:  var(--bg-2);
  --card:   var(--bg-2);
  --input:  var(--bg-3);
  --text:   var(--text-1);
  --muted:  var(--text-3);
  --danger: var(--neg);
}
```

### Animations added

All wrapped in a `@media (prefers-reduced-motion: reduce)` guard:

- `blFadeIn` — 120 ms tab content cross-fade
  (`.tab-panel` on each active panel)
- `blDrawerSlideIn` — 200 ms slide-in for Story drawer
- `tickerPulse` — 160 ms brightness pulse on price digits when
  `.ticker-up` / `.ticker-down` flip
- `toastIn` — 320 ms fade+slide for `<Toast />`

### New atoms

- `.copy-block` — prominent quoted output (jade left bar, mono,
  70 vh max with internal scroll). Wired into MacroGenerator,
  PriceLookup, FundingMacro outputs.
- `.chip`, `.chip--success/danger/warn/info`, `.num`, `.pos`,
  `.neg`, `.toast`, `.kpi-card`, `.hbar`, `.admin-three-col`,
  `.workspace-split`.
- LiveTicker DOM rebuilt to a sym-chip + tabular price + arrow pill;
  Orbitron font dropped (replaced by JetBrains Mono).

### Header chrome

Brand-mark monogram, source pill ("Binance 1m OHLC"), language pill
with country flags (🇬🇧 / 🇹🇷), admin chip with jade dashed border.
Tab strip uses `01..06` mono index labels with active jade underline.

## Why

- The user explicitly asked for an operational support-tool aesthetic,
  not generic AI dashboard chrome.
- Single brand accent (jade) avoids the rainbow-AI look while still
  providing enough hue-rotation room for state colors.
- Token system shipped as a coherent map, not a stylesheet — this
  lets components be re-skinned incrementally without rewrites.
- Legacy aliases mean MacroGenerator, PriceLookup, FundingMacro,
  AverageCalculator, MarginRestrictions don't need per-file updates
  to follow the new direction.

## Sources

- [[sources/sessions/2026-05-03-merge-into-macro-generator-and-redesign]]
- `CLAUDE_DESIGN_BRIEF.md` sections 6–9
- `Futures DeskMate Redesign.html` slides 02 (Tokens) and 12 (Migration map)

## Related

- [[concepts/css-token-bridge]] — token bridge into the BL feature scope
- [[entities/balance-log-overrides-css]] — where BL bridge lives
- [[concepts/glassmorphism-design]] — superseded prior direction
- [[decisions/vanilla-css-glass]] — superseded prior decision
- [[decisions/2026-05-03-merged-into-macro-generator-tab]]
- [[decisions/2026-05-03-futures-deskmate-rename]]
