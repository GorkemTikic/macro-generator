---
title: balance-log-overrides.css
tags: [entity, css, balance-log, tokens]
source: sources/sessions/2026-05-03-merge-into-macro-generator-and-redesign.md
date: 2026-05-03
status: active
---

# Entity: `src/features/balance-log/balance-log-overrides.css`

Hand-edited stylesheet imported alongside the generated
`balance-log.css`. Re-declares the BL feature's internal tokens
(`--bg`, `--panel`, `--text`, `--accent`, etc.) with hardcoded values
that match the host Station design system. Loaded by
`BalanceLogAnalyzer.tsx` after the generated file so its rules win.
This is where every BL integration tweak lives — the generated file
is rebuilt by `scripts/scope-balance-log-css.cjs` and any hand edits
there are wiped on regeneration.

## File location

`src/features/balance-log/balance-log-overrides.css`

## Sections

1. **Token bridge** (`.balance-log-app { --bg: …; --accent: …; … }`).
   Hardcoded values, NOT `var()` references — see
   [[bugs/2026-05-03-circular-css-var-broke-drawer-button]] for why
   self-referencing the host's `--accent` from the BL scope crashes
   the cascade.
2. **Container reset** — neutralises legacy `.container` margin /
   max-width so BL renders inside the host's app shell without a
   second container.
3. **Header toolbar buttons** — `.bl-toolbar-btn` /
   `.bl-toolbar-btn-secondary` / `.bl-toolbar-btn.btn-dark`.
   Solid-jade primary button (no broken gradient), compact padding,
   `white-space: nowrap`.
4. **Title / subtitle / KPI tiles / inner segmented tabs** — repaint
   to match host design tokens.
5. **`.balance-log-app .btn`** — `width: auto` (host `.btn` ships
   `width: 100%`; without override, inline BL Copy/Export buttons
   stretched the full row and overlapped section headers).
6. **Word-break override** — upstream BL has
   `overflow-wrap: anywhere` on every `.card p, .card li, .card div`,
   which caused per-character wrapping in narrow Summary table cells
   ("USDT" rendered vertically). Switched to `break-word` and
   `white-space: nowrap` on `.table td/th/.signed-amount/.nowrap`.
7. **Story drawer** — `.bl-story-drawer` rule sets the drawer card
   background to `var(--bg-2)`, hairline left border, deck slide 10's
   `-12px 0 32px rgba(0,0,0,0.45)` shadow. Inner `.card` surfaces
   inside the drawer also flat surface-2.
8. **Tab segments** (`.tabs-segmented` / `.tab-segment`) — restored
   padding `8px 16px` and `white-space: nowrap` so labels like
   "Narrative" don't wrap to two lines inside narrow segments.
9. **Inputs / textareas / selects inside BL** — match host inputs
   (surface-3 background, hairline border, jade focus ring with
   accent-soft halo).

## Hard rule

Do not hand-edit `balance-log.css`. The generator script wipes it on
the next run. All BL integration CSS lives in this overrides file.

## Sources

- [[sources/sessions/2026-05-03-merge-into-macro-generator-and-redesign]]

## Related

- [[concepts/css-token-bridge]]
- [[bugs/2026-05-03-circular-css-var-broke-drawer-button]]
- [[decisions/2026-05-03-merged-into-macro-generator-tab]]
- [[decisions/2026-05-03-station-design-system-adoption]]
