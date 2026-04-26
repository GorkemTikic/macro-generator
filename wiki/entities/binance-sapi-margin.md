---
title: Binance Margin COW
tags: [entity, external, api, binance, margin]
source: external
date: 2026-04-25
status: active
---

# Binance Margin COW

The data source for the Margin Restrictions feature. **Auth required** (X-MBX-APIKEY header) — `MARKET_DATA` permission level is sufficient, not signed.

## Endpoint

```
GET /sapi/v1/margin/restricted-asset
```

Reference: https://developers.binance.com/docs/margin_trading/market-data/Get-Margin-Restricted-Assets

## Path fix (session 530e)

First attempt tried `/sapi/v1/margin/restricted-assets` (plural) → 404. The correct path is singular: `restricted-asset`. See [[bugs/2026-04-22-misunderstood-restriction-scope]].

## Response shape

```json
{
  "openLongRestrictedAsset": ["MET", "PNUT", ...],
  "maxCollateralExceededAsset": ["CHZ", ...]
}
```

Two separate lists — the UI shows this as two sections.

## CORS issue

The browser cannot make a cross-origin request directly to `api.binance.com` with the `X-MBX-APIKEY` header. Solutions:

- **Dev**: [[entities/vite-config]] proxy `/api-binance` → forwards
- **Prod (GitHub Pages static)**: `VITE_MARGIN_PROXY` env var → Cloudflare Worker

## Known side endpoints (tried, not used)

- `/sapi/v1/margin/exchangeInfo` — wider cross/isolated margin metadata; The session was probed for cross/isolated distinction on 530e but final UI only uses `restricted-asset`

## Sources

- [[sources/sessions/2026-04-22-margin-restrictions-build]]

## Related

- [[entities/restricted-assets-helper]]
- [[entities/margin-restrictions]]
- [[concepts/transfer-in-restriction]]
- [[bugs/2026-04-22-misunderstood-restriction-scope]]
