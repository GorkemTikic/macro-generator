---
title: Data source /sapi/v1/margin/restricted-asset (singular)
tags: [decision, api, margin]
source: src/margin/restrictedAssets.ts
date: 2026-04-22
status: active
---

# Decision: `/sapi/v1/margin/restricted-asset` (singular) endpoint is used

## Context

Candidates in the Binance API for the Margin Restrictions feature:
- `/sapi/v1/margin/restricted-assets` (plural) — **Returns 404, wrong path**
- `/sapi/v1/margin/restricted-asset` (singular) — **true**, `MARKET_DATA` allowed
- `/sapi/v1/margin/exchangeInfo` — larger metadata, but requires signed(?)

In the first attempt, plural path was used, 404 was received (session 530e, 20:55).

## Decision

The singular `/sapi/v1/margin/restricted-asset` is used. Reason:
- Path is correct (confirmed with Binance docs)
- `MARKET_DATA` permission is sufficient — only `X-MBX-APIKEY` header is required, **No HMAC signature required**
- Answer fits exact UI requirement (`openLongRestrictedAsset`, `maxCollateralExceededAsset`)

`/sapi/v1/margin/exchangeInfo` was not used — because the scope was limited to transfer-in ([[decisions/2026-04-22-margin-feature-scope-transfer-in-only]]).

## Conclusion

`src/margin/restrictedAssets.ts` module calls this endpoint, caches 60s, keeps history.

## Sources

- [[sources/sessions/2026-04-22-margin-restrictions-build]]

## Related

- [[entities/binance-sapi-margin]]
- [[entities/restricted-assets-helper]]
- [[bugs/2026-04-22-misunderstood-restriction-scope]]
