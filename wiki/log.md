# log.md — Event Log

> Append-only. Each entry is timestamped. Nothing is deleted.

Format:
```
## [YYYY-MM-DD] <işlem> | <kısa özet>
- touched files
```

---

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

## [2026-04-29] ingest | end-to-end-audit-pass
- sources/sessions/2026-04-28-end-to-end-audit-pass.md (new)
- bugs/2026-04-28-smart-detect-invalid-macro-ids.md (new)
- bugs/2026-04-29-smart-detect-turkish-caps.md (new)
- entities/smart-detect.md (back-linked to source + bugs)
- bugs/2026-04-28-live-ticker-stale-closure.md (source frontmatter normalized)
- decisions/2026-04-28-lazy-load-exceljs.md (source frontmatter normalized)
- index.md (new source session + 2 new bug links)
