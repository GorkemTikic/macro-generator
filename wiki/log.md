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
