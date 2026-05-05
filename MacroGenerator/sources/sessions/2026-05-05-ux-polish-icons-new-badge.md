---
title: "2026-05-05: UX Polish — Price Lookup Icons + Balance Log NEW Badge"
type: session
date: 2026-05-05
tags: [ux, polish, icons, balance-log]
status: active
---

# 2026-05-05 UX Polish — Price Lookup Icons + Balance Log "NEW" Badge

## Objective

Small UX-polish pass: make the Price Lookup mode tabs more scannable
with emoji icons, and draw attention to the Balance Log Analyzer tab
with a "NEW" badge.

## What was done

### 1. Price Lookup Tool button icons (`PriceLookup.tsx`)

Commit `1b3fdee` — 3 lines changed.

Added emoji icons to three of the six mode-tab buttons in the
`option-cards` grid:

| Button | Before | After |
|---|---|---|
| Trigger | `Trigger` | `Trigger 🎯` |
| Range | `Range` | `Range 📊` |
| Last 1s | `Last 1s` | `Last 1s ⏱️` |

The remaining three tabs (`Find 🔍`, `Trailing 🔄`, Gap Explainer)
already had icons from the 2026-05-04 trilingual session and were not
changed.

All three changed strings follow the `L(en, tr, zh)` pattern — the
icon is added to every language variant of each button label.

### 2. Balance Log "NEW" badge (`App.tsx`)

Commit `cd8611c` — 1 line changed.

A `"NEW"` badge was added to the **Balance Log Analyzer** tab label in
`App.tsx` to surface the feature to users who have not yet discovered
it. The exact implementation was a single-character addition (inline
badge/chip element inside the tab button label).

## Files touched

- `src/components/PriceLookup.tsx`
- `src/App.tsx`

## Sources

- [[sources/sessions/2026-05-05-ux-polish-icons-new-badge]]

## Related

- [[entities/price-lookup]]
- [[entities/app-tsx]]
- [[entities/balance-log-feature]]
