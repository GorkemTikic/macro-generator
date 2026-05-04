---
title: Architecture Overview
tags: [synthesis, architecture]
source: README.md, src/
date: 2026-04-25
status: active
---

# Architecture Overview

FD Macro Generator is a React 18 + Vite + TypeScript app with vanilla CSS. The frontend is statically deployed on GitHub Pages, while a Cloudflare Worker provides analytics/admin APIs and production Binance proxying.

## Main Layers

```text
UI Layer
  App.tsx (5 tabs) + LiveTicker
  - MacroGenerator
  - PriceLookup
  - FundingMacro
  - AverageCalculator
  - MarginRestrictions

Data / Service Layer
  - pricing.ts -> Binance market data
  - margin/restrictedAssets.ts -> Binance margin restriction data
  - AppContext -> shared active symbol
  - analytics/index.ts -> client tracking

Backend Edge Layer
  - worker/index.ts -> analytics ingest + admin API + Binance proxy
  - worker/schema.sql -> D1 schema
  - worker/wrangler.toml -> Worker config

Format Layer
  - macros/index.ts (registry)
  - stop_market_*, take_profit_*, stop_limit_*
  - funding_macro
  - helpers.ts
  - smart_detect.ts
```

## Core Pattern

**Stateless Macro Engine** - see [[concepts/stateless-macro-engine]]. The UI performs fetches, while pure macro functions produce strings.

## Data Sources

| Source | Auth | Usage |
|---|---|---|
| `fapi.binance.com/*` (4 mirrors) | No | OHLC, funding, exchangeInfo |
| `wss://fstream.binance.com/...` | No | LiveTicker mark price stream |
| `api.binance.com/sapi/v1/margin/restricted-asset` | API key (header) | Margin restrictions |

## Deployment

GitHub Pages with auto-deploy via GitHub Actions. Sub-path: `/macro-generator/`. See [[decisions/github-pages-deploy]].

Production constraints:
- Margin SAPI access still depends on an API key strategy defined in [[decisions/2026-04-22-build-time-api-key]].
- The frontend is static, but production Binance REST access can be routed through the Cloudflare Worker proxy when browser-origin calls are blocked. See [[entities/analytics-system]] and [[decisions/2026-04-27-worker-as-binance-cors-proxy]].

## i18n

EN/TR support: UI strings live in `locales.ts`, while macro templates live in each macro's `translations` object. Prop drilling is used instead of context. See [[concepts/bilingual-tr-en]].

## Sources

- [[sources/docs/2026-03-21-readme]]
- [[sources/docs/2026-04-22-deployment-guide]]

## Related

- [[concepts/stateless-macro-engine]]
- [[concepts/sync-on-change-protocol]]
- [[syntheses/macro-system]]
- [[syntheses/data-flow]]
- [[syntheses/design-system]]
- [[entities/analytics-system]]
