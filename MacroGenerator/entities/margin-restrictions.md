---
title: src/components/MarginRestrictions.tsx
tags: [entity, component, ui, margin, binance-sapi]
source: src/components/MarginRestrictions.tsx
date: 2026-04-30
status: active
---

# src/components/MarginRestrictions.tsx

Tab that shows **Binance Margin Buy (Long) Risk Control** restrictions and max-collateral limits, so agents can instantly answer questions like "why can't I open a long on CHZ in cross margin?" or "why can't I transfer XRP into margin?"

## Data source

[[entities/restricted-assets-helper]] → Binance `/sapi/v1/margin/restricted-asset` via Cloudflare Worker proxy in production. See [[entities/binance-sapi-margin]].

## Business logic: what the restrictions actually mean (updated 2026-04-30)

### `openLongRestrictedAsset` — Margin Buy (Long) Risk Control

During high volatility Binance activates platform-wide risk controls:
- Users **cannot open new long positions** or **increase existing long exposure** in the affected asset.
- **Reduce-only**: buy market orders are capped at the net liabilities amount.
  - Net Liabilities = Total Debt of asset − Total Asset of asset (PM mode also adds negative balances).
  - If net liabilities ≤ 0, buy orders are rejected entirely.
- **Close position** (reduce long / sell) and **repay debt** flows remain fully allowed.
- This is temporary — lifted when Binance determines conditions have stabilised.

### `maxCollateralExceededAsset` — Platform collateral cap

- No additional units of the asset can be **transferred in** as collateral until the cap frees up.
- Existing balance, trading, and borrowing in margin are **unaffected**.

## Three modes

| Mode | Purpose |
|---|---|
| Restriction Check | Type an asset ticker; shows restriction status + copy-paste customer reply |
| Full List | Filtered scrollable list of both restricted sets |
| Changes | Per-snapshot diff history (localStorage) |

## API key / proxy handling

- **Production** (Worker proxy active): No API key needed on frontend. Component auto-loads on mount. Shows "🔑 Server-side API key active (Cloudflare Worker)." Banner. No override button (browser key is meaningless when Worker handles auth).
- **Dev / build-time key**: Shows "🔑 Shared API key in use." with optional override.
- **No key**: Shows red warning banner; Refresh button disabled.

## Previous incorrect framing (pre-2026-04-30)

Earlier versions labelled `openLongRestrictedAsset` as "transfer-in blocked" only. The Margin team clarified that the primary restriction is Margin Buy (Long) Risk Control (cannot open/increase long). Transfer-in is also blocked as a consequence, but it is not the primary meaning. UI copy was corrected in 2026-04-30.

## Sources

- [[sources/sessions/2026-04-22-margin-restrictions-build]]

## Related

- [[entities/restricted-assets-helper]]
- [[entities/binance-sapi-margin]]
- [[decisions/2026-04-22-margin-feature-scope-transfer-in-only]] — original scope (now superseded by Margin team clarification)
- [[decisions/2026-04-27-worker-as-binance-cors-proxy]] — SAPI now also routed through Worker
- [[bugs/2026-04-22-cors-failed-to-fetch]]
- [[bugs/2026-04-22-leaked-api-credentials]]
