---
title: Renamed user-facing product from FD Macro Generator to Futures DeskMate
tags: [decision, branding, product]
source: sources/sessions/2026-05-03-merge-into-macro-generator-and-redesign.md
date: 2026-05-03
status: active
---

# Decision: User-facing chrome renamed to "Futures DeskMate"

## Context

Once the Balance Log Analyzer was absorbed (see
[[decisions/2026-05-03-merged-into-macro-generator-tab]]), the app's
seven tabs (Macro Generator, Price Lookup, Funding Macro, Position
History / Average Calculator, Margin Restrictions, Balance Log
Analyzer, Admin) outgrew the original "FD Macro Generator" name —
"Macro Generator" is now just one of seven tools.

## Decision

Rename applies to **user-facing chrome only**:

- `<title>` in `index.html` → "Futures DeskMate"
- Brand element in the header → 28 px "FD" mono monogram on a jade
  square + name "Futures DeskMate" + subtitle "Binance Futures
  support workspace" / "Binance Futures destek çalışma alanı"

Rename does **NOT** apply to:

- Repo / GitHub Pages slug (`/macro-generator/` base preserved)
- `package.json` `name` field (still `macro-generator`)
- Deploy artifact paths
- README's repo description (mentions Futures DeskMate as the rename
  but the package itself stays named `macro-generator`)

## Why limit the scope

- Keeping the deploy slug stable preserves the production URL agents
  already have bookmarked.
- Avoids touching CI/CD, Wrangler config, Cloudflare Worker bindings,
  the Pages workflow, and the user's local `.env.local`.
- Leaves `package.json` untouched so installed `node_modules` and
  lockfiles don't churn.

## Sources

- [[sources/sessions/2026-05-03-merge-into-macro-generator-and-redesign]]
- `CLAUDE_DESIGN_BRIEF.md` section 1 (project identity)

## Related

- [[entities/app-tsx]]
- [[decisions/2026-05-03-merged-into-macro-generator-tab]]
- [[decisions/2026-05-03-station-design-system-adoption]]
