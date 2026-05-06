
# log.md — Event Log

> Append-only. Each entry is timestamped. Nothing is deleted.

Format:
```
## [YYYY-MM-DD] <işlem> | <kısa özet>
- touched files
```

---

## [2026-05-04] ingest | zh-cn-trilingual-and-ux-polish

Master session note:
- `sources/sessions/2026-05-04-zh-cn-trilingual-and-ux-polish.md`

This session's new pages (11):
- `sources/sessions/2026-05-04-zh-cn-trilingual-and-ux-polish.md`
- `decisions/2026-05-04-add-zh-cn-trilingual.md`
- `decisions/2026-05-04-vite-dev-proxy-via-worker.md`
- `decisions/2026-05-04-inline-svg-flags-not-emoji.md`
- `decisions/2026-05-04-prettify-trigger-type-token.md`
- `bugs/2026-05-04-cloudfront-fapi-flake-on-user-network.md`
- `bugs/2026-05-04-windows-emoji-flags-fall-back-to-letters.md`
- `bugs/2026-05-04-trigger-type-rendered-as-raw-token.md`
- `bugs/2026-05-04-empty-blockquote-line-renders-bar.md`
- `bugs/2026-05-04-time-token-not-zero-padded.md`
- `bugs/2026-05-04-lookup-tab-button-default-styling.md`

Updated pages (4):
- `concepts/bilingual-tr-en.md` — extended from bilingual to trilingual; documents the per-component `L(en, tr, zh)` helper convention; adds tone × lang matrix (4 × 3 = 12); adds note about Binance brand-name terms staying English in zh body. Filename kept as `bilingual-tr-en.md` for backward link stability.
- `entities/locales-ts.md` — file size grew from ~298 to ~705 lines; documents the third `zh:` block; notes that `gapExplainerTriggerMark` / `Last` were updated from raw `"MARK"` / `"LAST"` to `"Mark Price"` / `"Last Price"` across EN + TR + ZH.
- `entities/macros-helpers.md` — adds `prettyTriggerType` to public API; documents lang-aware `statusLineFriendly` (was English-only); documents zh branches in `buildFullOHLCBlock` / `buildLastPriceOHLCBlock` / `applyTone`; documents the `> ` empty-line → truly-empty-line fix in the OHLC builders.
- `entities/app-tsx.md` — `Lang` type now `'en' | 'tr' | 'zh'`; documents the third (CN) flag button with inline-SVG; brand subtitle now lang-aware. Also picks up the long-overdue `balanceLog` lazy-mount note (was only in the BL session note).

Index + log updates:
- `index.md` — new "2026-05-04 (Trilingual EN/TR/ZH + UX polish)" decisions section (4 entries); 6 new bug entries for the 2026-05-04 fixes; new session entry at the bottom of Sources/Sessions.
- `log.md` — this entry.

Files touched in code (verification: `npm run build` 6.5 s green; `npm test` 79/79 passed; `npm run test:trailing` all assertions passed):
- `vite.config.ts`
- `src/App.tsx`
- `src/locales.ts`
- `src/styles.css`
- `src/macros/helpers.ts`
- `src/macros/funding_macro.ts`
- `src/macros/stop_market_mark_not_reached.ts`
- `src/macros/stop_market_loss_higher_than_expected_mark_price.ts`
- `src/macros/stop_market_loss_higher_than_expected_last_price.ts`
- `src/macros/take_profit_slippage_mark_price.ts`
- `src/macros/take_profit_slippage_last_price.ts`
- `src/macros/stop_limit_mark_price.ts`
- `src/macros/stop_limit_last_price.ts`
- `src/components/MacroGenerator.tsx`
- `src/components/PriceLookup.tsx`
- `src/components/FundingMacro.tsx`
- `src/components/AverageCalculator.tsx`

Headline outcomes:
- App is now **trilingual** (EN/TR/ZH) end-to-end: chrome + every macro output. ~230 new zh strings in `locales.ts`, plus a `zh:` translation block in each of the 8 macro template files. Brand-name terms (Mark Price / Last Price / USDⓈ-M / Stop-Market / Stop-Limit) kept in English inside zh body, matching Binance's own zh-CN UI convention.
- **Macro-output readability** pass: raw `MARK`/`LAST` token prettified to `Mark Price`/`Last Price`; chart-label/From-To layout fixed; run-on paragraphs in Stop-Market Loss Higher (Mark + Last variants) restructured into clean blocks; empty `> ` blockquote separator (which renders as a highlighted bar) replaced with truly empty line; Average Calculator parser zero-pads time tokens.
- **Average Calculator phase block redesign**: dense paragraph + tiny inline formula → structured per-position card with coloured header (green for LONG, red for SHORT), CLOSED/OPEN status badge, date range, bullet list of orders as colour-tinted chips, two visually distinct STEP 1/STEP 2 calculation cards (green for entry, blue for close, big bold result). Copy block now mirrors the card layout.
- **FLIP detection** got 4 layered visual cues (floating warning pill, Long↔Short tag, yellow gradient background, thicker border + glow) so agents can't miss it.
- **Inline-SVG flags** replace emoji (Windows had no flag glyphs and was showing GB/TR letters).
- **`.lookup-tab` CSS reset** so the Spot/Futures toggle's inactive button stops rendering with the OS-default gray fill.
- **Vite dev proxy routed through the Worker**: same fix the production environment got on 2026-04-27, now applied to dev too because `fapi.binance.com` (CloudFront) intermittently drops requests on the user's network and the numbered mirrors are now redirect-only.

Out of scope for this ingest:
- The long Trailing-Stop technical agent breakdown text in `PriceLookup.tsx`'s `buildTrailingOutput` is still EN-only — TR + ZH branches not added. Worth a follow-up.
- A short-lived experimental "DeskMate Demo" tab (Case Workspace / Missing Data Checklist / QA Guardrail / Evidence Pack / Safe Response Composer) was prototyped earlier in the session, the user disliked the UX, and the entire integration was reverted. Design spec preserved in the user's auto-memory; **not added to the wiki because it does not exist in the codebase any more** (no entity to document).

---

## [2026-05-03] ingest | full-codebase-audit-and-remediation

Master session note:
- `sources/sessions/2026-05-03-full-codebase-audit-and-remediation.md`

New pages (13):
- `sources/sessions/2026-05-03-full-codebase-audit-and-remediation.md`
- `bugs/2026-05-03-hardcoded-password-gate.md`
- `bugs/2026-05-03-average-calc-dangerously-set-html.md`
- `bugs/2026-05-03-pricing-math-max-stack-overflow.md`
- `bugs/2026-05-03-pricing-trigger-minute-end-off-by-one.md`
- `bugs/2026-05-03-live-ticker-precision-fixed-decimals.md`
- `bugs/2026-05-03-funding-macro-coin-margined-formula-mismatch.md`
- `bugs/2026-05-03-worker-open-binance-proxy-and-track-payload.md`
- `bugs/2026-05-03-admin-dashboard-401-swallowed.md`
- `decisions/2026-05-03-remove-client-password-gate.md`
- `decisions/2026-05-03-richtext-instead-of-domsanitize.md`
- `decisions/2026-05-03-worker-path-allowlist.md`
- `decisions/2026-05-03-block-coinm-in-funding-macro.md`

Updated entity pages (6):
- `entities/macro-generator-component.md` — added "Recent updates"
  block: password-gate removal, useMemo side-effect fix, modal
  Esc-to-close + aria-modal, alert→toast.
- `entities/pricing-ts.md` — added "Recent updates" block:
  argMax/argMin fold, off-by-one fix, better error messages,
  `Array.isArray` guard for delisted-symbol case.
- `entities/analytics-system.md` — D1 schema box updated for
  AUTOINCREMENT-removal-on-new-DBs + new composite
  `idx_events_tab_ts`. Added a "Public Binance Proxy Routes" path
  allowlist subsection. Added a "/track hardening" subsection
  describing the body cap, event allowlist, and props limits.
  Added `/sapi/*` row to the proxy table.
- `entities/funding-macro-component.md` — coin-margined block
  + toast UX.
- `entities/live-ticker.md` — outdated "2 dp hardcoded" note
  rewritten to current behaviour (per-symbol precision +
  visibility-aware polling + dev-only logging).
- `entities/average-calculator.md` — dangerouslySetInnerHTML
  removal + double-isFlipped shadow fix.

Index + log updates:
- `index.md` — new session under Sources; new decisions block
  "2026-05-03 (Audit + remediation pass)"; 8 new bug entries.
- `log.md` — this entry.

Files touched in code (verification: `npm run build` 6.29 s green;
`npm test` 79/79 passed):
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

---

## [2026-05-03] ingest | Balance Log merge + Futures DeskMate redesign + BL wiki absorbed

Master session note:
- `sources/sessions/2026-05-03-merge-into-macro-generator-and-redesign.md`

This session's new pages (8):
- `decisions/2026-05-03-merged-into-macro-generator-tab.md`
- `decisions/2026-05-03-futures-deskmate-rename.md`
- `decisions/2026-05-03-station-design-system-adoption.md`
- `entities/balance-log-feature.md`
- `entities/balance-log-overrides-css.md`
- `concepts/css-token-bridge.md`
- `bugs/2026-05-03-circular-css-var-broke-drawer-button.md`
- `bugs/2026-05-03-vite-dev-proxy-cors-bypass.md`

Pages absorbed from the standalone Balance Log wiki (which had been
created at `Balance Log/balance-log-analyzer-main/.../wiki/` — now
deleted) and translated into MacroGenerator vault conventions
(date-prefixed filenames, `bugs/` not `issues/`, MG front-matter
shape, paths repointed at `src/features/balance-log/`):
- `decisions/2026-05-03-bl-usds-m-only-scope.md`
- `decisions/2026-05-03-bl-hidden-types-model.md`
- `decisions/2026-05-03-bl-decimal-safe-narrative-accumulation.md`
- `decisions/2026-05-03-bl-visible-row-filters.md` — archived
  (Row Filters card removed later in same session)
- `bugs/2026-05-03-bl-hidden-filters-silent-row-loss.md` — fixed
  (Codex P1)
- `bugs/2026-05-03-bl-typefilter-toggle-semantics.md` — fixed
  (Codex P2)
- `concepts/usds-m-reconciliation-math.md`
- `concepts/dynamic-balance-log-types.md`
- `concepts/balance-log-parser-heuristics.md`
- `syntheses/balance-log-feature-overview.md`

Skipped from BL wiki (meta / wiki-tooling pages redundant in this
vault): `concepts/llm-wiki.md`,
`decisions/wiki-follows-knowledge-pipeline.md`,
`sources/external/2026-05-03-knowledge-pipeline.md`,
`issues/open-codex-review-items.md`.

Index + cross-link updates:
- `index.md` — new "2026-05-03" decision section, BL bug entries,
  Sessions entry, Entities entries, Concepts entries, Syntheses
  entry, Vault note about the merge.

Cleanup:
- Removed earlier intermediate vault at
  `macro-generator-main/macro-generator-main/wiki/` that was a
  byproduct of an earlier ingest attempt (the user clarified the
  canonical vault location is `MacroGenerator/`, not `wiki/`).
- Removed source wiki at
  `Balance Log/balance-log-analyzer-main/balance-log-analyzer-main/wiki/`
  per the user's instruction to consolidate into a single vault.

## [2026-04-25] setup | vault installed (phase 1 — skeleton)
- raw/sessions/.gitkeep, raw/docs/.gitkeep
- sources/sessions/.gitkeep, entities/.gitkeep, concepts/.gitkeep
- decisions/.gitkeep, bugs/.gitkeep, syntheses/.gitkeep, archive/.gitkeep
- index.md, log.md, CLAUDE.md (skeleton)

## [2026-04-25] move | moved to vault wiki/ subfolder
- raw/, sources/, entities/, concepts/, decisions/, bugs/, syntheses/, archive/ → wiki/
- CLAUDE.md, index.md, log.md → wiki/
- CLAUDE.md path references updated (sed)

## [2026-04-25] ingest | 530e1c25-margin-restrictions-build (1.3MB JSONL)
- sources/sessions/2026-04-22-margin-restrictions-build.md
- entities/margin-restrictions.md, restricted-assets-helper.md, vite-config.md, binance-sapi-margin.md
- decisions/2026-04-22-margin-feature-scope-transfer-in-only.md
- decisions/2026-04-22-use-sapi-margin-exchangeinfo.md
- decisions/2026-04-22-multi-base-fallback.md
- decisions/2026-04-22-build-time-api-key.md
- decisions/2026-04-22-localstorage-per-agent-override.md
- decisions/2026-04-22-vite-dev-proxy-for-cors.md
- bugs/2026-04-22-cors-failed-to-fetch.md
- bugs/2026-04-22-misunderstood-restriction-scope.md
- bugs/2026-04-22-leaked-api-credentials.md ⚠️ HIGH
- concepts/transfer-in-restriction.md, binance-fapi-fallback.md

## [2026-04-25] ingest | 8d9d-npm-wrong-cwd (24KB JSONL)
- sources/sessions/2026-04-22-npm-dev-wrong-cwd.md
- bugs/2026-04-22-npm-wrong-cwd.md

## [2026-04-25] ingest | 31380-obsidian-vault-setup (current session)
- sources/sessions/2026-04-25-obsidian-vault-setup.md

## [2026-04-25] ingest | README.md
- sources/docs/2026-03-21-readme.md
- entities/app-tsx.md, app-context.md, pricing-ts.md
- entities/macro-generator-component.md, funding-macro-component.md, price-lookup.md
- entities/average-calculator.md, live-ticker.md
- entities/macros-registry.md, macros-helpers.md, smart-detect.md
- entities/locales-ts.md, binance-fapi.md
- concepts/stateless-macro-engine.md, glassmorphism-design.md, sync-on-change-protocol.md
- concepts/running-inventory-algorithm.md, mark-vs-last-price.md
- concepts/trailing-stop-simulation.md, bilingual-tr-en.md, smart-detect-nlp.md
- decisions/architecture-stateless-pure-functions.md, vanilla-css-glass.md
- decisions/github-pages-deploy.md, precision-truncation-not-rounding.md
- decisions/language-via-prop-not-context.md

## [2026-04-25] ingest | DEPLOYMENT_GUIDE.md
- sources/docs/2026-04-22-deployment-guide.md

## [2026-04-25] ingest | .env.example
- sources/docs/2026-04-22-env-example.md

## [2026-04-25] synthesis | architecture / macro-system / data-flow / design-system
- syntheses/architecture.md
- syntheses/macro-system.md
- syntheses/data-flow.md
- syntheses/design-system.md

## [2026-04-25] index-update | all pages added to index.md
- index.md

## [2026-04-25] lint | first pass — bulgular lint-report.md'de
- lint-report.md

## [2026-04-26] ingest | 0a6faf58-analytics-build (944KB JSONL)
- sources/sessions/2026-04-26-analytics-build.md
- entities/analytics-system.md (updated: sources + related links)
- decisions/2026-04-26-cloudflare-workers-d1-analytics-backend.md
- decisions/2026-04-26-ip-hash-privacy.md
- decisions/2026-04-26-localstorage-admin-token-gate.md
- index.md (analytics section + 3 decisions + session + doc)
- sources/docs/2026-04-26-analytics-setup.md (pre-existing, linked)

## [2026-04-28] ingest | 2026-04-27 price-lookup closest-miss + gap-explainer + worker proxy (in-conversation session)
- sources/sessions/2026-04-27-price-lookup-closest-miss-gap-explainer.md (new)
- decisions/2026-04-27-worker-as-binance-cors-proxy.md (new)
- decisions/2026-04-27-gap-explainer-checked-event.md (new)
- bugs/2026-04-27-binance-fapi-cors-on-pages.md (new — fixed)
- entities/price-lookup.md (updated — gapExplainer mode, Closest Miss, analytics)
- entities/pricing-ts.md (updated — findClosestMiss, analyzeMarkVsLastGap, PROXY default to Worker)
- entities/analytics-system.md (updated — gap_explainer_checked event, /fapi/* + /api/* Worker routes, lookup_query schema extension)
- concepts/binance-fapi-fallback.md (updated — CORS section now points to Worker proxy)
- concepts/mark-vs-last-price.md (updated — Gap Explainer is the agent-facing surface)
- index.md (added session, decisions, bug entry)

## [2026-04-26] ingest | analytics-workbook-export (in-conversation session)
- sources/sessions/2026-04-26-analytics-workbook-export.md
- entities/export-workbook.md (new — ExcelJS workbook builder, /admin/export endpoint)
- entities/analytics-dashboard-guide.md (new — leadership PDF + generation pipeline)
- entities/analytics-system.md (updated — added /admin/export, /admin/devices, workbook + PDF cross-links, full admin API surface table)
- decisions/2026-04-26-xlsx-workbook-over-csv.md
- decisions/2026-04-26-admin-export-endpoint.md
- decisions/2026-04-26-devices-not-users-framing.md
- decisions/2026-04-26-edge-headless-pdf-pipeline.md
- index.md (new analytics entities + new decisions section)

## [2026-04-28] audit | end-to-end audit pass; fixed LiveTicker stale closure, AdminDashboard useState→useEffect, and lazy-loaded exceljs
- src/components/LiveTicker.tsx (prevPrice → useRef)
- src/components/AdminDashboard.tsx (useState→useEffect; lazy import exportWorkbook)
- wiki/bugs/2026-04-28-live-ticker-stale-closure.md (new)
- wiki/decisions/2026-04-28-lazy-load-exceljs.md (new)
- wiki/index.md (linked new bug + decision)

## [2026-04-28] audit | second-pass audit; fixed smart_detect invalid macro IDs and small locale fixes
- src/macros/smart_detect.ts (4 macroIds → real registry IDs; funding now hint-only)
- src/locales.ts (errorTip EN+TR rewritten for VITE_BINANCE_PROXY; TR tabAverage translated)
- wiki/entities/smart-detect.md (CONTRADICTION resolved, table updated)

## [2026-04-29] audit | third-pass; fixed Turkish caps mojibake-of-logic in smart-detect (toLowerCase mishandles I/İ/ı)
- src/macros/smart_detect.ts (norm() helper: tr-locale lower + ı→i collapse)
- wiki/entities/smart-detect.md (added Turkish-aware lowercasing section)

## [2026-04-30] fix | Margin Restrictions CORS + Margin Buy Long Risk Control copy
- worker/index.ts — added /sapi/* GET route; BINANCE_API_KEY injected server-side; multi-base fallback
- worker/wrangler.toml — documented BINANCE_API_KEY secret
- src/margin/restrictedAssets.ts — prod routes through VITE_ANALYTICS_URL Worker; USE_WORKER_PROXY flag; no X-MBX-APIKEY from browser in prod; isUsingWorkerProxy() export; updated openLongRestrictedAsset copy to Margin Buy Long Risk Control; updated FAQ URL to 0ec778021b7a4f14b1b334f74b764b77; updated customer reply
- src/components/MarginRestrictions.tsx — "Transfer Check" → "Restriction Check"; updated status bar and list labels; server-side key banner; override button hidden when Worker proxy active; whiteSpace: pre-wrap on reply
- .env.example — updated proxy documentation
- wiki/entities/margin-restrictions.md — updated (Margin Buy Long semantics, proxy flow)
- wiki/entities/restricted-assets-helper.md — updated (proxy resolution table, isUsingWorkerProxy, AssetRestriction)
- wiki/entities/binance-sapi-margin.md — CORS section updated with Worker /sapi/* route

## [2026-04-29] ingest | end-to-end-audit-pass
- sources/sessions/2026-04-28-end-to-end-audit-pass.md (new)
- bugs/2026-04-28-smart-detect-invalid-macro-ids.md (new)
- bugs/2026-04-29-smart-detect-turkish-caps.md (new)
- entities/smart-detect.md (back-linked to source + bugs)
- bugs/2026-04-28-live-ticker-stale-closure.md (source frontmatter normalized)
- decisions/2026-04-28-lazy-load-exceljs.md (source frontmatter normalized)
- index.md (new source session + 2 new bug links)

## [2026-05-02] ingest | trailing-stop-clusdt-tick-precision
- sources/sessions/2026-05-02-trailing-stop-clusdt-tick-precision.md (new)
- bugs/2026-05-02-trailing-stop-fictional-trough.md (new)
- decisions/2026-05-02-skip-1s-klines-on-futures.md (new)
- concepts/trailing-stop-simulation.md (Saniye precision section rewritten; trigger ≠ fill paragraph; back-links)
- entities/pricing-ts.md (per-market trailing-stop data-source table; back-links)
- entities/price-lookup.md (2026-05-02 bug-history entry; back-links)
- index.md (new source + bug + decision; new 2026-05-02 decisions section)

## [2026-05-05] ingest | automated-progress-reporting-gemini
- Added GitHub Actions workflow (`.github/workflows/generate_progress_report.yml`) to run daily.
- Added `scripts/generate_report.mjs` using `@google/genai` to summarize commits for both `macro-generator` and `screenshot-library`.
- Copied `PROJECT_PROGRESS_REPORT.md` and `render-progress-report-pdf.mjs` into `reports/` folder.
- Configured workflow to automatically open a Pull Request with the AI summary and updated PDF.

---

## [2026-05-05] ingest | ux-polish-icons-new-badge

Master session note:
- `sources/sessions/2026-05-05-ux-polish-icons-new-badge.md`

New pages (1):
- `sources/sessions/2026-05-05-ux-polish-icons-new-badge.md`

Updated pages (2):
- `entities/price-lookup.md` — added 2026-05-05 bug-history entry: emoji icons on Trigger 🎯 / Range 📊 / Last 1s ⏱️ tabs; added session back-link in Sources.
- `entities/app-tsx.md` — added 2026-05-05 Recent updates entry: "NEW" badge on `balanceLog` tab; added session back-link in Sources.

Index + log updates:
- `index.md` — two new session entries.
- `log.md` — this entry.

Files touched in code:
- `src/components/PriceLookup.tsx` — emoji icons on 3 mode-tab buttons
- `src/App.tsx` — "NEW" badge on Balance Log tab label

---

## [2026-05-06] ingest | balance-story-flag-dropdown

Master session note:
- `sources/sessions/2026-05-06-balance-story-flag-dropdown.md`

New pages (1):
- `sources/sessions/2026-05-06-balance-story-flag-dropdown.md`

Updated pages (1):
- `entities/balance-log-feature.md` — added Recent updates section with 2026-05-06 `LangSelect` component detail; added session back-link in Sources.

Index + log updates:
- `index.md` — new session entry.
- `log.md` — this entry.

Files touched in code:
- `src/features/balance-log/components/StoryDrawer.tsx` — replaced `<select>` with custom `LangSelect` headless dropdown using `flagcdn.com` flag images (107 insertions). `LANGUAGE_OPTIONS` gained a `flag` (ISO 3166-1 alpha-2) field for each of the 10 languages.

Headline outcomes:
- Balance Story drawer language picker now matches the visual quality of the main app's flag switcher. Uses `flagcdn.com/20x15/{code}.png` real flag images in both the trigger button and the option rows.
- Closes via `onBlur` + 150 ms delay so `onMouseDown` on options fires before the blur collapses the list (avoids selection-race bug).
- Styled entirely through `--bl-*` CSS tokens — consistent with the [[concepts/css-token-bridge]] pattern.

---

## [2026-05-06] ingest | faq-searcher-deploy

Master session note:
- `sources/sessions/2026-05-06-faq-searcher-deploy.md`

New pages (2):
- `sources/sessions/2026-05-06-faq-searcher-deploy.md`
- `entities/faq-searcher.md`

Updated pages (4):
- `index.md` - added FAQ Searcher to the top-level product map, source sessions, and UI entities.
- `entities/app-tsx.md` - updated tab count/mapping with the new `faq` tab, "NEW" badge, and FD brand reset fix.
- `entities/analytics-system.md` - added `faq_search` and `faq_copy` events to the event catalog.
- `entities/locales-ts.md` - added `tabFaq` EN/TR/ZH note.

Files touched in code:
- `src/App.tsx` - `faq` tab, lazy-mounted `FaqSearcher`, "NEW" badge, corrected brand click target.
- `src/components/FaqSearcher.tsx` - keyword-first FAQ UI.
- `src/faqCatalog.ts` - curated official reference catalog.
- `src/faqSearch.ts` - normalization, alias expansion, ranking, citation-pack builder.
- `src/faqSearch.test.ts` - Turkish liquidation, Chinese error-code, STP, and citation-pack tests.
- `src/analytics/index.ts` - `faq` tab + FAQ copy/search events.
- `src/locales.ts` - `tabFaq` in EN/TR/ZH.
- `src/styles.css` - FAQ layout/result-card/search styles.
- `outputs/PROJECT_PROGRESS_REPORT.md` - May 6 row updated with FAQ keyword search contribution.

Verification and deploy:
- `npm test` passed with 83 tests.
- `npm run build` passed.
- GitHub Pages deploy succeeded from `main`.
- Generate Progress Report workflow succeeded.
- Live bundle was verified to contain `FAQ Searcher`, `faq_search`, and the FAQ "NEW" badge.

Headline outcomes:
- Restored missing FAQ work from the older project copy into the current root project.
- Removed extra FAQ filter/tab concepts and shipped the intended keyword-first support workflow.
- Gives agents faster access to official references and citation-ready copy packs.

---

## [2026-05-06] ingest | header-resource-links

Master session note:
- `sources/sessions/2026-05-06-header-resource-links.md`

New pages (1):
- `sources/sessions/2026-05-06-header-resource-links.md`

Updated pages (3):
- `index.md` - added the session entry and updated the `app-tsx` entity description from "6 tabs" to "7 tabs + guide/video links".
- `entities/app-tsx.md` - documented the header `How to Use` and `Video Guides` links, destinations, and styling surface.
- `log.md` - this entry.

Files touched in code:
- `src/App.tsx` - added `resource-links` nav with `How to Use` and `Video Guides` external anchors.
- `src/styles.css` - added `.resource-links` and `.resource-link` chip styles.

Verification and deploy:
- `npm run build` passed.
- Commit `72e33f1` - `feat: add guide links to header`.
- GitHub Pages deploy succeeded from `main`.
- Generate Progress Report workflow succeeded.
- Live bundle was verified to contain both guide URLs and the `Video Guides` label.

Headline outcomes:
- Agents can open the written guide and video guide collection directly from the live app header.
- Reduces onboarding friction and repeated "where is the guide?" routing.
- Keeps resource access visible without adding more tabs to the main workspace.
