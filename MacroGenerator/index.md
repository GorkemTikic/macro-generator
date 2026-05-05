# macro-generator - Information Archive

> **Futures DeskMate** (renamed 2026-05-03 from FD Macro Generator) -
> React + Vite + TypeScript. Binance Futures support workspace for
> agents — Macro Generator, Price Lookup, Funding, Position History
> (Average Calculator), Margin Restrictions, Balance Log Analyzer,
> and a token-gated Admin/Analytics dashboard.
> This vault follows the llm-wiki pattern. See [[CLAUDE]].

> **Vault note (2026-05-03)**: the standalone Balance Log Analyzer
> was absorbed as the `balanceLog` tab. Its prior wiki was ingested
> here under `bl-` prefixed pages. See
> [[sources/sessions/2026-05-03-merge-into-macro-generator-and-redesign]]
> for the master session note and
> [[syntheses/balance-log-feature-overview]] for the BL feature map.

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
- [[sources/sessions/2026-05-02-trailing-stop-clusdt-tick-precision]] - Trailing Stop CLUSDT tick-precision verification + Futures-1s removal
- [[sources/sessions/2026-05-03-merge-into-macro-generator-and-redesign]] - Balance Log merge + Futures DeskMate rename + Station design system + Vite proxy CORS bypass
- [[sources/sessions/2026-05-03-full-codebase-audit-and-remediation]] - Full codebase audit (~56 findings) + remediation pass (~45 fixes): security, pricing correctness, a11y, Worker hardening
- [[sources/sessions/2026-05-04-zh-cn-trilingual-and-ux-polish]] - Trilingual EN/TR/ZH end-to-end + macro-output readability polish (raw `MARK` token, run-on paragraphs, empty `>` bar, time padding) + Average Calculator phase-card redesign + FLIP visibility + inline-SVG flags + Vite dev proxy via Worker
- [[sources/sessions/2026-05-05-automated-progress-reporting-gemini]] - Automated progress reporting via Gemini AI & GitHub Actions
- [[sources/sessions/2026-05-05-ux-polish-icons-new-badge]] - Price Lookup mode-tab emoji icons (Trigger 🎯, Range 📊, Last 1s ⏱️) + "NEW" badge on Balance Log tab
- [[sources/sessions/2026-05-06-balance-story-flag-dropdown]] - Balance Story drawer: `<select>` → custom `LangSelect` component with `flagcdn.com` flag images; `LANGUAGE_OPTIONS` gained `flag` field

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
- [[entities/app-tsx]] - Main layout, 6 tabs + lang switch with flags + token-gated Admin chip
- [[entities/macro-generator-component]] - TP/SL/Slippage macros
- [[entities/funding-macro-component]] - Funding rate macro
- [[entities/price-lookup]] - Price lookup (4 modes + trailing stop simulation)
- [[entities/average-calculator]] - Position open/close average (running inventory)
- [[entities/margin-restrictions]] - Margin transfer-in restricted asset list
- [[entities/live-ticker]] - Header WebSocket ticker
- [[entities/balance-log-feature]] - Balance Log Analyzer feature folder (`src/features/balance-log/`)
- [[entities/balance-log-overrides-css]] - Hand-edited CSS bridge between BL and host design system

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
- [[concepts/glassmorphism-design]] - FD Premium dark mode design language (superseded by Station; see [[decisions/2026-05-03-station-design-system-adoption]])
- [[concepts/sync-on-change-protocol]] - README maintenance rules
- [[concepts/running-inventory-algorithm]] - Position flip detection
- [[concepts/binance-fapi-fallback]] - 4-mirror host fallback strategy
- [[concepts/mark-vs-last-price]] - Two price types in futures
- [[concepts/trailing-stop-simulation]] - Binance trailing stop simulation logic
- [[concepts/bilingual-tr-en]] - UI + macro translation strategy
- [[concepts/smart-detect-nlp]] - Keyword-based intent detection (not a black box)
- [[concepts/transfer-in-restriction]] - Margin transfer restriction semantics
- [[concepts/css-token-bridge]] - Pattern for unifying a feature's tokens with a host design system across a CSS scope boundary
- [[concepts/usds-m-reconciliation-math]] - Balance Log reconciliation formula + decimal-safe arithmetic
- [[concepts/dynamic-balance-log-types]] - BL parser must not depend on a closed enum
- [[concepts/balance-log-parser-heuristics]] - Header-first parse with shape-fallback heuristics

---

## Decisions

### 2026-05-04 (Trilingual EN/TR/ZH + UX polish)
- [[decisions/2026-05-04-add-zh-cn-trilingual]] - Add Simplified Chinese (zh-CN) as a third UI + macro language; full end-to-end (chrome + 8 macro template files + helpers + tones)
- [[decisions/2026-05-04-vite-dev-proxy-via-worker]] - Route the Vite dev proxy (`/fapi`, `/api/v3`, `/api-binance`) through the deployed Cloudflare Worker; mitigates intermittent CloudFront-edge drop on the user's network
- [[decisions/2026-05-04-inline-svg-flags-not-emoji]] - Inline-SVG UK / TR / CN flags in the language switcher (Windows Segoe UI Emoji has no flag glyphs)
- [[decisions/2026-05-04-prettify-trigger-type-token]] - `prettyTriggerType()` helper in `helpers.ts` converts raw `MARK` / `LAST` form-input tokens to "Mark Price" / "Last Price" at render time

### 2026-05-03 (Balance Log merge + Futures DeskMate redesign)
- [[decisions/2026-05-03-merged-into-macro-generator-tab]] - BL absorbed as `balanceLog` tab, scoped under `.balance-log-app`, lazy-mount + display:none persistence
- [[decisions/2026-05-03-futures-deskmate-rename]] - User-facing rename FD Macro Generator → Futures DeskMate (deploy slug + package name unchanged)
- [[decisions/2026-05-03-station-design-system-adoption]] - Adopted "Station" tokens (oklch palette, jade accent, Inter + JetBrains Mono); legacy aliases preserved
- [[decisions/2026-05-03-bl-usds-m-only-scope]] - Coin-M activity quarantined from USDⓈ-M wallet maths
- [[decisions/2026-05-03-bl-hidden-types-model]] - TypeFilter switched from "selected shown" → "hidden types"
- [[decisions/2026-05-03-bl-decimal-safe-narrative-accumulation]] - StoryNarrative uses BigInt-backed `decimal.add()`
- [[decisions/2026-05-03-bl-visible-row-filters]] - **archived** — Row Filters card later removed in same session

### 2026-05-03 (Audit + remediation pass)
- [[decisions/2026-05-03-remove-client-password-gate]] - Delete the `"112233"` macro password gate; do not move it server-side
- [[decisions/2026-05-03-richtext-instead-of-domsanitize]] - Hand-roll a `<RichText>` parser instead of adding DOMPurify
- [[decisions/2026-05-03-worker-path-allowlist]] - Explicit string-list path allowlist on the Worker proxy (not regex/glob)
- [[decisions/2026-05-03-block-coinm-in-funding-macro]] - Block coin-margined symbols in FundingMacro instead of implementing the inverse formula

### 2026-05-02 (Trailing Stop tick-precision)
- [[decisions/2026-05-02-skip-1s-klines-on-futures]] - Skip `/fapi/v1/klines?interval=1s` for Futures Last Price; go straight to aggTrades

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
- [[bugs/2026-05-02-trailing-stop-fictional-trough]] - Trailing Stop test fixture asserted prices that never traded; Futures Last Price was silently routing through dead `/fapi/v1/klines?interval=1s` (fixed)
- [[bugs/2026-05-03-bl-hidden-filters-silent-row-loss]] - BL `bl.filters.v4` localStorage stale values silently dropped rows (fixed; Codex P1)
- [[bugs/2026-05-03-bl-typefilter-toggle-semantics]] - BL TypeFilter toggle did the opposite of user's intent (fixed; Codex P2)
- [[bugs/2026-05-03-circular-css-var-broke-drawer-button]] - `--accent: var(--accent)` blanked the Open Balance Story button (fixed)
- [[bugs/2026-05-03-vite-dev-proxy-cors-bypass]] - Worker `ALLOWED_ORIGIN` rejected localhost; admin login + ticker fallback CORS-failed (fixed)
- [[bugs/2026-05-03-hardcoded-password-gate]] - Hardcoded `"112233"` client-side password gate in MacroGenerator (fixed; security)
- [[bugs/2026-05-03-average-calc-dangerously-set-html]] - `dangerouslySetInnerHTML` in AverageCalculator with locale-built HTML (fixed; security)
- [[bugs/2026-05-03-pricing-math-max-stack-overflow]] - `Math.max(...arr)` RangeError on long ranges (fixed)
- [[bugs/2026-05-03-pricing-trigger-minute-end-off-by-one]] - `getTriggerMinuteCandles` end-time fence-post (fixed)
- [[bugs/2026-05-03-live-ticker-precision-fixed-decimals]] - LiveTicker hard-coded `.toFixed(2)` showed `0.00` for SHIB/PEPE (fixed)
- [[bugs/2026-05-03-funding-macro-coin-margined-formula-mismatch]] - FundingMacro silently used linear formula on coin-margined symbols (fixed)
- [[bugs/2026-05-03-worker-open-binance-proxy-and-track-payload]] - Worker had open Binance proxy + unbounded `/track` payload (fixed)
- [[bugs/2026-05-03-admin-dashboard-401-swallowed]] - AdminDashboard `fetchDeviceEvents` swallowed 401 silently (fixed)
- [[bugs/2026-05-04-cloudfront-fapi-flake-on-user-network]] - Vite dev proxy 500s when CloudFront-fronted `fapi.binance.com` hangs from the user's network; numbered mirrors are now redirect-only (fixed via [[decisions/2026-05-04-vite-dev-proxy-via-worker]])
- [[bugs/2026-05-04-windows-emoji-flags-fall-back-to-letters]] - 🇬🇧 / 🇹🇷 / 🇨🇳 emoji rendered as `GB` / `TR` / `ZH` letters on Windows (Segoe UI Emoji has no flag glyphs); fixed via inline-SVG flags
- [[bugs/2026-05-04-trigger-type-rendered-as-raw-token]] - Macro output emitted raw `MARK` / `LAST` instead of "Mark Price" / "Last Price"; fixed via `prettyTriggerType()` in `helpers.ts`
- [[bugs/2026-05-04-empty-blockquote-line-renders-bar]] - `> ` empty line between Mark/Last OHLC sub-blocks rendered as a visible highlighted bar in markdown viewers; fixed by switching to a truly empty line so two adjacent blockquotes render
- [[bugs/2026-05-04-time-token-not-zero-padded]] - Average Calculator parser stored `0:03:56` raw instead of `00:03:56`; fixed via `padTime` at the parser boundary
- [[bugs/2026-05-04-lookup-tab-button-default-styling]] - `.lookup-tab` rule didn't reset native `<button>` defaults so Spot/Futures inactive button rendered with the OS gray fill; fixed by adding `background: transparent; border: 0; appearance: none; font-family: inherit`

---

## Syntheses

- [[syntheses/architecture]] - High-level architecture overview
- [[syntheses/macro-system]] - Macro registry + render flow
- [[syntheses/data-flow]] - UI -> pricing -> macro -> response
- [[syntheses/design-system]] - Original FD Premium design language (now superseded; see [[decisions/2026-05-03-station-design-system-adoption]])
- [[syntheses/balance-log-feature-overview]] - Balance Log feature map (paste → KPIs → 4 inner tabs → Story drawer)

---

## Reports

- [[lint-report]] - Latest health-check findings

---

## Archive

<!-- Empty - no archived pages yet -->
