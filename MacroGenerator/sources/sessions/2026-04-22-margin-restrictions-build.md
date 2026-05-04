---
title: Margin Restrictions feature build session
tags: [source, session, margin]
source: raw/sessions/530e1c25-bcc1-473f-b9a9-97ada45112ab.jsonl
date: 2026-04-22
status: active
---

# Session: Margin Restrictions feature build (1.3 MB transcript)

**Date**: 2026-04-22 20:50 → 21:42 (~52 minutes)
**Raw source**: `raw/sessions/530e1c25-bcc1-473f-b9a9-97ada45112ab.jsonl`
**Size**: 144 assistant messages, 11 user messages, 25 Edit / 4 Write tool calls

## Aim

Adding a new agent for agents: a Binance Margin restricted-asset list that instantly answers user questions such as "why can't I send CHZ from spot to margin?"

## Flow (chronological summary)

1. **20:50 — Brainstorm**: Additional feature ideas requested for the PriceLookup page
2. **20:51 — Rejected**: Agent's chart/price tool suggestion was not appreciated
3. **20:55 — Pivot**: Margin team's CHZ ticket shared; FAQ link given (https://www.binance.com/en/support/faq/detail/dca77ef963294b368b5ebad0affeda09); Margin SAPI endpoint searched
4. **20:55 — Endpoint correction**: `/sapi/v1/margin/restricted-assets` (plural) 404 → `/sapi/v1/margin/restricted-asset` (singular) correct
5. **21:06 — API key shared** ⚠️ user wrote plain key+secret in chat (see [[bugs/2026-04-22-leaked-api-credentials]])
6. **21:16 — UX rule**: Will use 50 agents — no key prompt, must be embedded
7. **21:20 — Bug**: "failed to fetch" error → CORS root cause → Vite dev proxy fix
8. **21:31 — Scope fix** (hard feedback): Agent's long/short/borrow comment is wrong — **transfer-in** question only
9. **21:35-21:39 — Cross/Isolated nuance**: MET/PNUT case; API separation questioned
10. **21:41 — Instruction**: “Read and find Binance API documents” — Research `/sapi/v1/margin/exchangeInfo` (not used in final UI)

## Done

| File | Transaction |
|---|---|
| `src/components/MarginRestrictions.tsx` | **Write** (new) |
| `src/margin/restrictedAssets.ts` | **Write** (new helper module) |
| `src/App.tsx` | **Edit** — new `margin` tab added |
| `src/locales.ts` | **Edit** — `tabMargin` tags |
| `src/vite-env.d.ts` | **Edit** — VITE_* env types |
| `vite.config.ts` | **Write** — `/api-binance` dev proxy |
| `.env.local` | **Write** — real key (gitignored) |
| `.env.example` | **Write** — template + security notes |

## Decisions (filed)

- [[decisions/2026-04-22-margin-feature-scope-transfer-in-only]]
- [[decisions/2026-04-22-use-sapi-margin-exchangeinfo]]
- [[decisions/2026-04-22-build-time-api-key]]
- [[decisions/2026-04-22-localstorage-per-agent-override]]
- [[decisions/2026-04-22-vite-dev-proxy-for-cors]]

## Issues (filed)

- [[bugs/2026-04-22-cors-failed-to-fetch]]
- [[bugs/2026-04-22-misunderstood-restriction-scope]]
- [[bugs/2026-04-22-leaked-api-credentials]] ⚠️ **HIGH PRIORITY**

## Open topics

- Production CORS proxy not yet installed (`VITE_MARGIN_PROXY` is empty) — Feature on GitHub Pages **may not be running**
- Cross vs Isolated margin distinction missing from UI — some user questions still go to margin team
- README's File Map not updated — Margin Restrictions component not documented ([[concepts/sync-on-change-protocol]] violation)
- Tool-use count: 25 Edit + 4 Write + 17 Bash — intensive iterative development

## Sources

- raw: `raw/sessions/530e1c25-bcc1-473f-b9a9-97ada45112ab.jsonl`
- referans: https://www.binance.com/en/support/faq/detail/dca77ef963294b368b5ebad0affeda09
- referans: https://developers.binance.com/docs/margin_trading/market-data/Get-Margin-Restricted-Assets

## Related

- [[entities/margin-restrictions]]
- [[entities/restricted-assets-helper]]
- [[entities/binance-sapi-margin]]
- [[entities/vite-config]]
- [[concepts/transfer-in-restriction]]
