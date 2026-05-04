---
title: Full codebase audit and remediation pass
tags: [session, audit, security, refactor, accessibility]
source: raw/sessions/2026-05-03-full-codebase-audit-and-remediation.jsonl
date: 2026-05-03
status: active
---

# Session: Full codebase audit and remediation pass

## Purpose

User asked for a comprehensive review of the project ("find any bugs or
design issues or anything to improve"). Once the punchlist landed, the
follow-up was a single instruction: "Fix all". This session covers both
phases — discovery and remediation — in one go.

## Scope reviewed

Entire app: 63 TS/TSX files (~15,750 LOC) plus the Cloudflare Worker
(`worker/index.ts`), D1 schema, root HTML, and CSS. The auditing pass
was originally split across 5 parallel sub-agents (macros/pricing,
React UI, Balance Log, Worker/admin, design/a11y) but 4 of the 5 hit
the daily token cap, so the remaining four areas were reviewed
synchronously by the main agent.

## Punchlist produced

~56 findings, categorized:

- 🔴 **Top priorities (security)** — hardcoded `112233` client-side password
  gate; admin token in `localStorage`; open Binance proxy on the Worker;
  `/track` accepts unbounded JSON; `dangerouslySetInnerHTML` in
  AverageCalculator with locale-built HTML; `useMemo` side effect in
  MacroGenerator; FundingMacro wrong for coin-margined contracts.
- 🟠 **Functional bugs** — `LiveTicker` fixed `.toFixed(2)`; `pricing.ts`
  `Math.max(...arr)` stack overflow at ~125k+ candles;
  `getTriggerMinuteCandles` end-time off-by-one;
  AverageCalculator double `let isFlipped` shadowing;
  AdminDashboard 401 swallowed silently in `fetchDeviceEvents`;
  Balance Log `parseGrid` double `decideScope`; `App.tsx` empty-deps
  page_view effect.
- 🟡 **UX / a11y** — `alert()` blocking copy feedback; `<div onClick>`
  tabs; missing aria-* on emoji-only buttons; default symbol mismatch
  (BTCUSDT vs ETHUSDT); no Esc-to-close on parse modal; AdminDashboard
  subtitle still reads "FD Macro Generator".
- 🟢 **Worker / analytics** — missing `Vary: Origin`; missing
  `Access-Control-Max-Age`; non-constant-time admin token compare;
  D1 schema kept `AUTOINCREMENT` (slower inserts); missing composite
  `(tab, ts)` index.
- 🔵 **Design / styling / a11y** — `index.html` missing meta tags + favicon;
  no `<main>` landmark / `<h1>`; `oklch()` no fallback; unused
  `--bg-quote`; inline-style explosion (deferred); inline EN/TR
  ternaries (deferred).

## Fixes landed

~45 items across 17 files. Notable groups:

- **Security**:
  - Removed `requireAuth("112233")` wrapper entirely from
    [[entities/macro-generator-component]]. See
    [[bugs/2026-05-03-hardcoded-password-gate]].
  - Replaced `dangerouslySetInnerHTML` in
    [[entities/average-calculator]] with a tiny `<RichText>`
    component that only interprets `**bold**`. See
    [[bugs/2026-05-03-average-calc-dangerously-set-html]].
  - Worker hardening: explicit path allowlists for `/fapi`, `/api`,
    `/sapi`; `/track` body cap (16 KB) + event-type allowlist + props
    cap (32 keys × 256 chars); CORS `Vary: Origin` + `Max-Age: 86400`;
    constant-time admin token compare. See
    [[bugs/2026-05-03-worker-open-binance-proxy-and-track-payload]]
    and [[decisions/2026-05-03-worker-path-allowlist]].
- **Pricing correctness**:
  - `argMax`/`argMin` fold in [[entities/pricing-ts]] (3 sites in
    `getRangeHighLow` + 1 in `getLastPriceAtSecond`). See
    [[bugs/2026-05-03-pricing-math-max-stack-overflow]].
  - `getTriggerMinuteCandles` end-time off-by-one (Binance treats
    `endTime` inclusively → subtract 1 ms). See
    [[bugs/2026-05-03-pricing-trigger-minute-end-off-by-one]].
  - Better error messages for transient 5xx, 418 (Worker IP block,
    not user IP), 451.
- **UX / a11y**:
  - LiveTicker now reads per-symbol `pricePrecision` from
    `getAllSymbolPrecisions()` and pauses polling when
    `document.hidden`. See
    [[bugs/2026-05-03-live-ticker-precision-fixed-decimals]].
  - All `alert()` calls in MacroGenerator/FundingMacro/PriceLookup
    replaced with non-blocking `mg-toast` (added in `styles.css`).
  - `<div onClick>` tabs in PriceLookup (market + 6 modes) and
    MarginRestrictions (3 modes) → `<button role="tab"
    aria-selected>`.
  - AdminDashboard 401 propagation in `fetchEvents`/`fetchDevices`/
    `fetchDeviceEvents`. See
    [[bugs/2026-05-03-admin-dashboard-401-swallowed]].
  - FundingMacro now refuses coin-margined symbols with a clear
    bilingual error rather than emitting wrong numbers. See
    [[bugs/2026-05-03-funding-macro-coin-margined-formula-mismatch]]
    and [[decisions/2026-05-03-block-coinm-in-funding-macro]].
  - `App.tsx`: `<main>` landmark, visually-hidden `<h1>`, removed the
    `lang === 'tr' ? 'Futures DeskMate' : 'Futures DeskMate'` no-op
    ternary, page_view fires once via ref guard.
  - `index.html`: meta description, theme-color (#0a0d12), color-scheme
    dark, robots noindex/nofollow, inline-SVG favicon, `<noscript>`
    fallback panel.
- **Decisions / design**:
  - Hand-rolled `<RichText>` over DOMPurify dependency. See
    [[decisions/2026-05-03-richtext-instead-of-domsanitize]].
  - Delete the password gate rather than move it server-side. See
    [[decisions/2026-05-03-remove-client-password-gate]].
- **Misc**:
  - `crypto.randomUUID` fallback in [[entities/analytics-system]]
    client (`src/analytics/index.ts`) for Safari ≤ 15.3 / older Edge;
    `eph-` prefix when localStorage is blocked so incognito devices
    don't all collapse to `unknown`.
  - `console.warn`/`console.error` calls now gated by
    `import.meta.env?.DEV` in LiveTicker / MacroGenerator /
    AverageCalculator.
  - `styles.css`: `@supports not (color: oklch(0 0 0))` fallback block
    with hex equivalents; new `.mg-toast` and `.visually-hidden`
    classes; dropped unused `--bg-quote`.
  - `worker/schema.sql`: kept `AUTOINCREMENT` for the existing live
    table (no destructive migration), only added new
    `idx_events_tab_ts(tab, ts)` index.
  - Balance Log parser: removed redundant `\s+` whitespace alternative
    (cell-aware `\s{2,}|\s\|\s` patterns already won); deduped the
    `decideScope` call inside `parseGrid` so logic only runs once per
    row.

## What was NOT done (and why)

- **Admin token → HttpOnly cookie**: needs a `/admin/login` Worker
  endpoint, Set-Cookie work, and a deploy. Out of scope for a
  no-deploy pass.
- **KV-backed per-IP rate limit on `/track` and the proxy**: needs a
  new `RATE_LIMIT_KV` binding in `wrangler.toml`. The code stub would
  be useless until the binding lands.
- **Pre-aggregated D1 daily rollup**: needs a scheduled Worker handler
  (`crons` + new tables). ~150 LOC and another deploy.
- **All inline EN/TR ternaries → `locales.ts`**: ~50 sites across 5
  components. Mechanical refactor; would dominate this diff.
- **All inline `style={{}}` → CSS classes**: hundreds of sites. Worth
  doing as a separate PR.
- **Dynamic-import recharts/exceljs `manualChunks`**: build warns
  about >500 KB chunks (StoryDrawer 428 KB, exportWorkbook 953 KB).
  Clean follow-up.

## Verification

- `npm run build` → green in 6.29 s, only the standard Vite chunk-size
  warning (recharts/exceljs).
- `npm test` (vitest) → 79/79 passed across 9 test files. The
  `balanceLog.test.ts` (25 tests) and `balanceLog.integration.test.ts`
  (9 tests) covered the parser change without regressions.

## Files touched

- `src/components/MacroGenerator.tsx`
- `src/components/AverageCalculator.tsx`
- `src/components/FundingMacro.tsx`
- `src/components/PriceLookup.tsx`
- `src/components/LiveTicker.tsx`
- `src/components/AdminDashboard.tsx`
- `src/components/MarginRestrictions.tsx`
- `src/pricing.ts`
- `src/analytics/index.ts`
- `src/features/balance-log/lib/balanceLog.ts`
- `src/App.tsx`
- `src/styles.css`
- `index.html`
- `worker/index.ts`
- `worker/schema.sql`

## Hold-overs for next session

- Admin auth refresh (cookie path).
- KV rate-limit binding + middleware.
- Schedule a follow-up agent in 2 weeks to confirm the Worker deploy
  (path allowlist, /track caps, schema indexes) actually landed in
  production.

## Sources

- raw transcript at `raw/sessions/2026-05-03-full-codebase-audit-and-remediation.jsonl`

## Related

- [[bugs/2026-05-03-hardcoded-password-gate]]
- [[bugs/2026-05-03-average-calc-dangerously-set-html]]
- [[bugs/2026-05-03-pricing-math-max-stack-overflow]]
- [[bugs/2026-05-03-pricing-trigger-minute-end-off-by-one]]
- [[bugs/2026-05-03-live-ticker-precision-fixed-decimals]]
- [[bugs/2026-05-03-funding-macro-coin-margined-formula-mismatch]]
- [[bugs/2026-05-03-worker-open-binance-proxy-and-track-payload]]
- [[bugs/2026-05-03-admin-dashboard-401-swallowed]]
- [[decisions/2026-05-03-remove-client-password-gate]]
- [[decisions/2026-05-03-richtext-instead-of-domsanitize]]
- [[decisions/2026-05-03-worker-path-allowlist]]
- [[decisions/2026-05-03-block-coinm-in-funding-macro]]
- [[entities/pricing-ts]]
- [[entities/macro-generator-component]]
- [[entities/average-calculator]]
- [[entities/funding-macro-component]]
- [[entities/live-ticker]]
- [[entities/analytics-system]]
