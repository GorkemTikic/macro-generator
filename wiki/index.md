# macro-generator - Information Archive

> FD Macro Generator - React + Vite + TypeScript. Macro generation tool for futures support agents.
> This vault follows the llm-wiki pattern. See [[CLAUDE]].

---

## Sources

### Sessions
- [[sources/sessions/2026-04-22-margin-restrictions-build]] - Margin Restrictions feature build (52 minutes, 25 edits)
- [[sources/sessions/2026-04-22-npm-dev-wrong-cwd]] - npm wrong-directory diagnostic (short)
- [[sources/sessions/2026-04-25-obsidian-vault-setup]] - Vault setup session
- [[sources/sessions/2026-04-26-analytics-build]] - Analytics system + admin dashboard build (~4 hours)
- [[sources/sessions/2026-04-26-analytics-workbook-export]] - `.xlsx` workbook export + leadership PDF guide
- [[sources/sessions/2026-04-27-price-lookup-closest-miss-gap-explainer]] - Closest Miss + Gap Explainer + Worker CORS proxy
- [[sources/sessions/2026-04-28-end-to-end-audit-pass]] - Multi-turn audit (2026-04-28→29): LiveTicker, AdminDashboard, exceljs, smart-detect IDs + Turkish caps

### Docs
- [[sources/docs/2026-03-21-readme]] - README.md (Last Updated 2026-03-21)
- [[sources/docs/2026-04-22-deployment-guide]] - DEPLOYMENT_GUIDE.md
- [[sources/docs/2026-04-22-env-example]] - .env.example (margin feature config)
- [[sources/docs/2026-04-26-analytics-setup]] - Analytics deployment guide (9-step Worker + D1 setup)

---

## Entities

### Analytics
- [[entities/analytics-system]] - CF Worker + D1 analytics backend + admin dashboard + Binance proxy
- [[entities/export-workbook]] - ExcelJS `.xlsx` workbook builder (5 sheets) + `/admin/export` endpoint
- [[entities/analytics-dashboard-guide]] - Leadership-facing PDF guide (HTML source + PDF render)

### Components (UI)
- [[entities/app-tsx]] - Main layout, 5 tabs + language switch
- [[entities/macro-generator-component]] - TP/SL/Slippage macros
- [[entities/funding-macro-component]] - Funding rate macro
- [[entities/price-lookup]] - Price lookup (4 modes + trailing stop simulation)
- [[entities/average-calculator]] - Position open/close average (running inventory)
- [[entities/margin-restrictions]] - Margin transfer-in restricted asset list
- [[entities/live-ticker]] - Header WebSocket ticker

### Services
- [[entities/pricing-ts]] - Binance fapi data layer
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

### 2026-04-28 (Bundle weight + ticker fix)
- [[decisions/2026-04-28-lazy-load-exceljs]] - Lazy-load `exceljs` from AdminDashboard so it doesn't ship to every visitor

### 2026-04-27 (Price Lookup expansion + production CORS fix)
- [[decisions/2026-04-27-worker-as-binance-cors-proxy]] - Use the analytics Worker as a Binance CORS proxy (`/fapi/*`, `/api/*`)
- [[decisions/2026-04-27-gap-explainer-checked-event]] - Dedicated `gap_explainer_checked` event alongside `lookup_query`

### 2026-04-26 (Analytics workbook + PDF session)
- [[decisions/2026-04-26-xlsx-workbook-over-csv]] - Styled `.xlsx` workbook in place of per-view CSVs
- [[decisions/2026-04-26-admin-export-endpoint]] - Dedicated `/admin/export` route, not lifted `/admin/events` cap
- [[decisions/2026-04-26-devices-not-users-framing]] - Honest "Estimated Users (unique devices)" labelling
- [[decisions/2026-04-26-edge-headless-pdf-pipeline]] - Edge `--headless=new` for HTML-to-PDF rendering

### 2026-04-26 (Analytics build session)
- [[decisions/2026-04-26-cloudflare-workers-d1-analytics-backend]] - CF Workers + D1 as analytics backend
- [[decisions/2026-04-26-ip-hash-privacy]] - Hash IPs before storage (SHA-256 prefix)
- [[decisions/2026-04-26-localstorage-admin-token-gate]] - Admin tab gate via localStorage token

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
- [[bugs/2026-04-27-binance-fapi-cors-on-pages]] - Binance fapi unreachable from GitHub Pages, fixed via Worker proxy (fixed)
- [[bugs/2026-04-28-live-ticker-stale-closure]] - LiveTicker up/down color never lit due to stale `prevPrice` closure (fixed)
- [[bugs/2026-04-28-smart-detect-invalid-macro-ids]] - `detectMacro` returned IDs not in the registry; macro form silently broke (fixed)
- [[bugs/2026-04-29-smart-detect-turkish-caps]] - All-caps Turkish input never matched any keyword due to default `toLowerCase` quirk (fixed)

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
