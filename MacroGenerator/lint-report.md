---
title: Lint Report — 2026-04-25
tags: [lint, report]
source: vault scan
date: 2026-04-25
status: active
---

# Lint Report — 2026-04-25 (first pass)

All wiki pages crawled after the first full ingest. Programmatic link analysis (Node script) + manual review.

## Summary

- **Total pages**: 55 (excluding raw/)
- **Total wiki links**: 357 resolved
- **Orphan pages**: 0
- **Broken links**: 9 → 4 fixed, 5 accepted (template/placeholder)
- **Flagged conflict**: 1 (smart-detect macroId mismatch)
- **High priority findings**: 2

---

## 🔴 HIGH PRIORITY

### LINT-001 — Plaintext API credentials

**Category**: weak-source / security
**Impact**: `bugs/2026-04-22-leaked-api-credentials.md`, `raw/sessions/530e1...jsonl`

The user pasted the Binance API key+secret pair into the chat in plaintext in the session 2026-04-22. JSONL transcript is on local disk. Mitigation steps are on page [[bugs/2026-04-22-leaked-api-credentials]]. **Recommended action**: revoke the key from Binance immediately + create new read-only IP-whitelisted key.

### LINT-002 — Production CORS proxy is not configured

**Category**: deficiency / functionality
**Impact**: [[entities/restricted-assets-helper]], [[sources/docs/2026-04-22-env-example]]

`VITE_MARGIN_PROXY` env var is empty — in the production deploy, the CORS preflight of the Margin Restrictions feature to `api.binance.com` will probably be rejected. **Recommended action**: Set up a proxy with Cloudflare Worker (or equivalent), set env var, redeploy.

---

## 🟡 MEDIUM PRIORITY

### LINT-003 — README File Map is out of date (Sync-on-Change violation)

**Category**: obsolete
**Impact**: [[sources/docs/2026-03-21-readme]] (Last Updated 2026-03-21)

Margin Restrictions feature 2026-04-22'de eklendi ama README'nin File Map tablosu güncellenmedi. [[concepts/sync-on-change-protocol]] kuralı 2: "If a file's responsibility changes or a new dependency is added, the File Map above must be updated immediately."

Missing entries:
- `src/components/MarginRestrictions.tsx`
- `src/margin/restrictedAssets.ts`
- `src/components/AverageCalculator.tsx` (available but not in File Map — check)
- `vite.config.ts` proxy note (not in AI Compatibility Map)

### LINT-004 — Smart-detect macroId mismatch (marked ✅ CONFLICT)

**Category**: contradiction
**Impact**: [[entities/smart-detect]], [[entities/macros-registry]]

Checked under block `## ÇELİŞKİ` in file [[entities/smart-detect]] — The `macroId` values ​​returned by `detectMacro` (`stop_limit_not_triggered`, `high_frequency_slippage`, `limit_order_not_reached`) do not match the actual IDs (`stop_market_mark_not_reached`, `take_profit_slippage_*`, `stop_limit_*`) in the MACROS array.

**Recommended action**: Either smart-detect should be updated, mapping should be done on the calling side in MacroGenerator, or if this is an intentional UI hint system, it should be documented.

### LINT-005 — Symbol context inconsistency

**Category**: weak-source / possible bug
**Impact**: [[entities/macro-generator-component]], [[entities/app-context]]

[[entities/macro-generator-component]] keeps its default symbol as "ETHUSDT"; global `activeSymbol` "BTCUSDT" in [[entities/app-context]]. Symbol change is not synchronous between [[entities/live-ticker]] and the macro form. Whether this is intentional or a bug is unclear — it's not discussed in JSONL.

---

## 🟢 LOW PRIORITY

### LINT-006 — npm setup steps missing from README

**Category**: documentation
**Impact**: [[sources/docs/2026-03-21-readme]]

GitHub zip download gives double nested folder ([[bugs/2026-04-22-npm-wrong-cwd]]). The "Setup & Execution" section of the README does not include the `cd macro-generator-main` step — new developers experience the same bug.

### LINT-007 — LiveTicker is not precision-aware

**Category**: poor-source / minor UX bug
**Impact**: [[entities/live-ticker]]

Hardcoded `.toFixed(2)` — no value appears for low precision symbols (SHIBUSDT 0.00002345). The `getAllSymbolPrecisions()` cache in [[entities/pricing-ts]] can be used.

### LINT-008 — LiveTicker reconnect yok

**Category**: weak-source
**Impact**: [[entities/live-ticker]]

No automatic reconnection when WebSocket connection is lost. If the user keeps the page open for a long time, the price freezes.

### LINT-009 — Tab content is not lazy

**Category**: performans
**Impact**: [[entities/app-tsx]]

All 5 tabs are rendered during mount (hidden by `display: none`). Components that open WebSockets, such as LiveTicker, are always active. Tab switching has the advantage of state preservation, but the initial paint cost is high.

### LINT-010 — `.env.example` not mentioned in README

**Category**: documentation
**Impact**: [[sources/docs/2026-03-21-readme]], [[sources/docs/2026-04-22-env-example]]

Margin feature env config requires, but the README "Setup & Execution" section does not mention the `.env.local` step. It's hard to discover new developers.

---

## Broken links (accepted)

The following links appeared broken but were accepted (not deleted for the purpose of the report):

| Link | Reason |
|---|---|
| `CLAUDE.md → [[YYYY-MM-DD-slug]]` | Frontmatter template example |
| `CLAUDE.md → [[ilgili-bileşen]]` | Template placeholder |
| `CLAUDE.md → [[related-concept]]` | Template placeholder |
| `concepts/sync-on-change-protocol.md → [[wiki]]` | Statement “[[wiki]]” — conceptual |
| `index.md → [[lint-report]]` | This page (now resolved) |

---

## Fixed broken links (in this pass)

- `entities/app-tsx.md` → `[[concepts/bilingual-i18n]]` → `[[concepts/bilingual-tr-en]]` ✅
- `entities/average-calculator.md` → same fix ✅
- `entities/pricing-ts.md` → `[[concepts/binance-api-fallback]]` → `[[concepts/binance-fapi-fallback]]` (×2) ✅

---

## Category distribution

| Category | Number |
|---|---|
| High priority | 2 |
| Medium priority | 3 |
| Low priority | 5 |
| **Total** | **10** |

| Genre | Number |
|---|---|
| security | 1 |
| deficiency / functionality | 1 |
| contradiction | 1 |
| obsolete | obsolete 1 |
| weak-source | 4 |
| documentation | 2 |

---

## Suggestions for next lint pass

- **Frequency**: Monthly or after new 5+ ingest
- **Automation candidates**:
  - Wiki-link broken check (Node script was run in this pass)
  - YAML frontmatter must check (title, source, date, status)
  - Orphan detection
- **Manual review**:
  - How outdated the README is from the code
  - Do new files have an entity page?
  -Are your bugs still open?

## Sources

- vault scan (2026-04-25)
- bugs/, decisions/, entities/ all pages

## Related

- [[concepts/sync-on-change-protocol]]
- [[bugs/2026-04-22-leaked-api-credentials]]
- [[entities/smart-detect]]
- [[CLAUDE]]
