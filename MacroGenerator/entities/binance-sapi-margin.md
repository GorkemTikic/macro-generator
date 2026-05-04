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

## CORS issue — resolution (2026-04-30)

The browser cannot call `api.binance.com/sapi/*` with `X-MBX-APIKEY` cross-origin — Binance does not return the needed CORS headers for this header.

Current solution:
- **Dev**: Vite proxy `/api-binance` → `api.binance.com` (CORS bypassed server-side). `VITE_BINANCE_API_KEY` is sent by the browser through the proxy.
- **Prod**: The `macro-analytics` Cloudflare Worker exposes a `/sapi/*` route. The Worker injects `BINANCE_API_KEY` (a Worker secret) and forwards to `api.binance.com`. The frontend sends **no** `X-MBX-APIKEY` header to the Worker. `VITE_ANALYTICS_URL` is the Worker base URL; no separate `VITE_MARGIN_PROXY` needed. See [[decisions/2026-04-27-worker-as-binance-cors-proxy]] (now extended to SAPI).

## Known side endpoints (tried, not used)

- `/sapi/v1/margin/exchangeInfo` — wider cross/isolated margin metadata; The session was probed for cross/isolated distinction on 530e but final UI only uses `restricted-asset`

## Sources

- [[sources/sessions/2026-04-22-margin-restrictions-build]]

## Related

- [[entities/restricted-assets-helper]]
- [[entities/margin-restrictions]]
- [[concepts/transfer-in-restriction]]
- [[bugs/2026-04-22-misunderstood-restriction-scope]]
