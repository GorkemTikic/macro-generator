# macro-generator - Information Archive

> FD Macro Generator - React + Vite + TypeScript. Macro generation tool for futures support agents.
> This vault follows the llm-wiki pattern. See [[CLAUDE]].

---

## Sources

### Sessions
- [[sources/sessions/2026-04-22-margin-restrictions-build]] - Margin Restrictions feature build (52 minutes, 25 edits)
- [[sources/sessions/2026-04-22-npm-dev-wrong-cwd]] - npm wrong-directory diagnostic (short)
- [[sources/sessions/2026-04-25-obsidian-vault-setup]] - Vault setup session

### Docs
- [[sources/docs/2026-03-21-readme]] - README.md (Last Updated 2026-03-21)
- [[sources/docs/2026-04-22-deployment-guide]] - DEPLOYMENT_GUIDE.md
- [[sources/docs/2026-04-22-env-example]] - .env.example (margin feature config)

---

## Entities

### Components (UI)
- [[entities/app-tsx]] - Main layout, 5 tabs + language switch
- [[entities/macro-generator-component]] - TP/SL/Slippage macros
- [[entities/funding-macro-component]] - Funding rate macro
- [[entities/price-lookup]] - Price lookup (4 modes + trailing stop simulation)
- [[entities/average-calculator]] - Position open/close average (running inventory)
- [[entities/margin-restrictions]] - Margin transfer-in restricted asset list
- [[entities/live-ticker]] - Header WebSocket ticker

### Services
- [[entities/pricing-ts]] - Binance fapi data layer (708 lines)
- [[entities/restricted-assets-helper]] - Margin SAPI helper + cache + history
- [[entities/macros-registry]] - Macro registry (`src/macros/index.ts`)
- [[entities/macros-helpers]] - `fmtNum`, `applyTone`, `buildOHLCBlock`
- [[entities/smart-detect]] - NLP-lite intent detection
- [[entities/locales-ts]] - UI strings (EN/TR)

### State
- [[entities/app-context]] - Global `activeSymbol` context

### Build / Config
- [[entities/vite-config]] - `/api-binance` dev proxy + GitHub Pages base

### External
- [[entities/binance-fapi]] - Binance Futures API (4 mirrors)
- [[entities/binance-sapi-margin]] - Binance Margin SAPI

---

## Concepts

- [[concepts/stateless-macro-engine]] - Pure-function macro pattern (foundational)
- [[concepts/glassmorphism-design]] - FD Premium dark mode design language
- [[concepts/sync-on-change-protocol]] - README maintenance rules
- [[concepts/running-inventory-algorithm]] - Position flip detection
- [[concepts/binance-fapi-fallback]] - 4-mirror host fallback strategy
- [[concepts/mark-vs-last-price]] - Two price types in futures
- [[concepts/trailing-stop-simulation]] - Binance trailing stop simulation logic
- [[concepts/bilingual-tr-en]] - UI + macro translation strategy
- [[concepts/smart-detect-nlp]] - Keyword-based intent detection (not a black box)
- [[concepts/transfer-in-restriction]] - Margin transfer restriction semantics

---

## Decisions

### 2026-04-22 (Margin feature session)
- [[decisions/2026-04-22-margin-feature-scope-transfer-in-only]] - Scope = transfer-in only
- [[decisions/2026-04-22-use-sapi-margin-exchangeinfo]] - Endpoint selection
- [[decisions/2026-04-22-multi-base-fallback]] - 4-host fallback
- [[decisions/2026-04-22-build-time-api-key]] - Embed `VITE_BINANCE_API_KEY` at build time
- [[decisions/2026-04-22-localstorage-per-agent-override]] - Per-agent key override
- [[decisions/2026-04-22-vite-dev-proxy-for-cors]] - Dev proxy fix

### Foundational (~2026-03-21)
- [[decisions/architecture-stateless-pure-functions]] - Stateless Macro Engine
- [[decisions/vanilla-css-glass]] - Vanilla CSS, no framework
- [[decisions/github-pages-deploy]] - GitHub Pages + Actions auto-deploy
- [[decisions/precision-truncation-not-rounding]] - Truncate, do not round
- [[decisions/language-via-prop-not-context]] - Prop drilling, not context

---

## Bugs

- [[bugs/2026-04-22-cors-failed-to-fetch]] - Margin SAPI CORS preflight (fixed)
- [[bugs/2026-04-22-misunderstood-restriction-scope]] - Long/short vs transfer-in (fixed)
- [[bugs/2026-04-22-leaked-api-credentials]] - **HIGH** API key plaintext in transcript (open)
- [[bugs/2026-04-22-npm-wrong-cwd]] - Double-nested folder ENOENT (fixed)

---

## Syntheses

- [[syntheses/architecture]] - High-level architecture overview
- [[syntheses/macro-system]] - Macro registry + render flow
- [[syntheses/data-flow]] - UI -> pricing -> macro -> response
- [[syntheses/design-system]] - FD Premium design language

---

## Reports

- [[lint-report]] - Latest health-check findings

---

## Archive

<!-- Empty - no archived pages yet -->
