---
title: End-to-end audit pass (multi-turn)
tags: [source, session, audit]
source: in-conversation audit (no raw transcript)
date: 2026-04-28
status: active
---

# Session: End-to-end audit pass

**Date**: 2026-04-28 → 2026-04-29 (multi-turn, in-conversation)
**Raw source**: none — these were live audit turns; no JSONL was added to `raw/`.
**Scope rule each turn**: read only `wiki/CLAUDE.md` + `wiki/index.md`, then audit code first and trust the wiki only after verifying.

## Aim

Find concrete bugs and stale docs in the current repo. Prioritize:
- user-visible bugs
- runtime / production risks
- stale closures / hooks misuse
- bundle weight / unnecessary eager loading
- mojibake / encoding-corrupted text
- wiki / README drift that would mislead future sessions

## Flow

### Turn 1 (2026-04-28) — eager-loading & hooks

1. Confirmed app is React 18 + Vite + TS, with 5 user tabs + a localStorage-gated Admin tab, and a Cloudflare Worker (`/track`, `/admin/*`, `/fapi/*`, `/api/*`) — see [[entities/analytics-system]], [[decisions/2026-04-27-worker-as-binance-cors-proxy]].
2. Found stale closure in [[entities/live-ticker]]: `ws.onmessage` captured `prevPrice` once and never re-saw updates — color flash never lit. Fix → `useRef`. See [[bugs/2026-04-28-live-ticker-stale-closure]].
3. Found `useState` used where `useEffect` was meant in `AdminDashboard.tsx:378`. Replaced with `useEffect(() => { ... }, [])`.
4. `exceljs` was statically imported by `AdminDashboard`, so it shipped to every visitor. Switched to dynamic `import()` inside `handleExport`. Main bundle dropped from ~1297 KB / 372 KB gzip to 344 KB / 96 KB gzip; exceljs split into a 953 KB / 276 KB gzip on-demand chunk. See [[decisions/2026-04-28-lazy-load-exceljs]].

### Turn 2 (2026-04-28) — text/data correctness

1. Verified each macro `id:` literal under `src/macros/`; cross-checked against the `macroId` strings returned by [[entities/smart-detect]] (`detectMacro`). Four IDs were entirely missing from the registry. The wiki entity had already flagged this as a `## CONTRADICTION`. Fix → use real registry IDs. See [[bugs/2026-04-28-smart-detect-invalid-macro-ids]].
2. Polished user-facing locale strings in `src/locales.ts`:
   - EN+TR `errorTip` referenced `src/pricing.js` and a "PROXY constant" — both stale; rewritten to point at `VITE_BINANCE_PROXY`.
   - TR `tabAverage` was left as the EN string; translated to `Pozisyon Geçmişi Ort. Giriş & Çıkış Fiyatı`.
3. Updated [[entities/smart-detect]]: removed the `## CONTRADICTION` marker; rewrote the table.

### Turn 3 (2026-04-29) — Turkish caps mojibake-of-logic

1. Confirmed `src/locales.ts`, `smart_detect.ts`, and the touched wiki page were clean UTF-8 — no actual mojibake bytes.
2. Found a real text-matching bug: `detectMacro` used JS default `toLowerCase()`, which is not Turkish-locale-aware. All-caps Turkish complaints (`ÇALIŞMADI`, `DOLMADI`, `TETİKLENMEDİ`, `DEĞMEDİ`, `FARKLI FİYAT`) silently missed every keyword. Naive `toLocaleLowerCase('tr')` fixed Turkish but broke English literals containing ASCII `I` (e.g. `not trigger`, `didn't hit`). Fix → `toLocaleLowerCase('tr')` then collapse `ı` → `i`, applied to both input and literals. See [[bugs/2026-04-29-smart-detect-turkish-caps]].
3. Verified with a node sanity script across 19 inputs (Turkish caps, sentence case, English caps, English mixed, nonsense). 17/19 pass. Two pre-existing fails on `"didn't trigger"` because the literal is `'not trigger'` (substring miss) — pre-existing, left as remaining risk.

## Done

| File | Change |
|---|---|
| `src/components/LiveTicker.tsx` | Edit — `prevPrice` state → `useRef` |
| `src/components/AdminDashboard.tsx` | Edit — `useState`→`useEffect` for auto-load; `import type` + dynamic `import()` for exceljs |
| `src/macros/smart_detect.ts` | Edit — real registry IDs; `norm()` helper for tr-locale lower + ı→i |
| `src/locales.ts` | Edit — `errorTip` EN+TR rewritten; TR `tabAverage` translated |
| `wiki/bugs/2026-04-28-live-ticker-stale-closure.md` | New |
| `wiki/decisions/2026-04-28-lazy-load-exceljs.md` | New |
| `wiki/bugs/2026-04-28-smart-detect-invalid-macro-ids.md` | New (this ingest) |
| `wiki/bugs/2026-04-29-smart-detect-turkish-caps.md` | New (this ingest) |
| `wiki/entities/smart-detect.md` | Edit — CONTRADICTION resolved; Turkish-aware lowercasing section added |
| `wiki/index.md` | Edit — links added |
| `wiki/log.md` | Append entries |

## Verification

- `tsc --noEmit` and `vite build` after each fix.
- Bundle: 344 KB / 96 KB gzip (main) + 954 KB / 276 KB gzip (exceljs, on-demand).
- Mojibake scan (`grep -E "Ã|Â|â€|ï¿½|Ä|Å"`) on edited files: zero hits.
- Smart-detect node test: 17/19 inputs match expected; 2 pre-existing fails noted.

## Open / TODOs (not addressed)

- `MacroGenerator` placeholder advertises `"Stop didn't trigger"` but the matcher literal is `'not trigger'` — the example phrase doesn't actually trigger detection. One-line broadening could fix it.
- Smart Detect's funding hint sets only `confidence`/`reason` (no `macroId`); `MacroGenerator` only displays detections that come with a `macroId`, so the hint never reaches the user.
- README + `package.json` description still say "Pure frontend, GitHub Pages ready" with no mention of the Worker, margin tab, admin tab, or exceljs. Wiki already documents these — README drift only.
- Hard-coded password `"112233"` in `MacroGenerator.tsx:229` (soft gate, anyone can read the bundle). Pre-existing, behavioral.
- `.env.local` contains a real `VITE_BINANCE_API_KEY` — already an open wiki bug ([[bugs/2026-04-22-leaked-api-credentials]]).

## Sources

- in-conversation audit, 3 turns, 2026-04-28 to 2026-04-29.

## Related

- [[bugs/2026-04-28-live-ticker-stale-closure]]
- [[bugs/2026-04-28-smart-detect-invalid-macro-ids]]
- [[bugs/2026-04-29-smart-detect-turkish-caps]]
- [[decisions/2026-04-28-lazy-load-exceljs]]
- [[entities/smart-detect]]
- [[entities/live-ticker]]
- [[entities/analytics-system]]
