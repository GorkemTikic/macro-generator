---
title: src/margin/restrictedAssets.ts
tags: [entity, margin, helper, binance-sapi, cache]
source: src/margin/restrictedAssets.ts
date: 2026-04-30
status: active
---

# src/margin/restrictedAssets.ts

Helper module that retrieves Binance Margin **restricted-asset** data, caches it, and tracks the change history. Data layer for [[entities/margin-restrictions]].

## Endpoint

`GET /sapi/v1/margin/restricted-asset` — `MARKET_DATA` permission (only `X-MBX-APIKEY` header required, not signed).

## Payload

```ts
type RestrictedPayload = {
  openLongRestrictedAsset: string[];     // Margin Buy (Long) Risk Control
  maxCollateralExceededAsset: string[];  // Platform-wide collateral cap hit
};
```

## Base URL / proxy resolution (updated 2026-04-30)

```
DEV  → ["/api-binance"]
         Vite proxy CORS bypass; VITE_BINANCE_API_KEY sent by browser to Binance via proxy.

PROD + VITE_ANALYTICS_URL set  → [WORKER_URL]   (USE_WORKER_PROXY = true)
         Cloudflare Worker /sapi/* route injects BINANCE_API_KEY from Worker secret.
         Frontend sends NO X-MBX-APIKEY header.

PROD + only VITE_MARGIN_PROXY set  → [MARGIN_PROXY]
         Legacy path; custom proxy must handle Binance auth.

PROD fallback  → [api.binance.com, api1, api2, api3]
         Direct calls — will fail CORS in browsers. Only reached if no proxy configured.
```

`USE_WORKER_PROXY` is derived at build time: `!DEV && Boolean(VITE_ANALYTICS_URL || VITE_MARGIN_PROXY)`.

## API key management

| Condition | `hasApiKey()` | `hasSharedKey()` | Key panel shown |
|---|---|---|---|
| Worker proxy active | `true` | `true` | hidden |
| Build-time key present | `true` | `true` | hidden (override button visible) |
| localStorage override only | `true` | `false` | hidden |
| No key at all | `false` | `false` | shown |

`isUsingWorkerProxy()` exported for the component to distinguish proxy mode from build-time shared key mode.

## Storage keys (localStorage)

| Key | Content |
|---|---|
| `binance_api_key_v1` | Per-agent override key (overrides build-time key) |
| `margin_restricted_cache_v1` | Last response + `fetchedAt` timestamp |
| `margin_restricted_history_v1` | Diff history: added/removed assets per snapshot (max 50) |

## Cache strategy

`CACHE_TTL_MS = 60_000` — 60 s. Rate-limit-friendly; forced refresh bypasses it.

## History tracking

On each successful fetch, compares to the previous snapshot and records diffs:
- `added.openLong` / `added.maxCollateral` — newly restricted
- `removed.openLong` / `removed.maxCollateral` — restriction lifted

## Business logic: `diagnoseTransfer` / `AssetRestriction`

Returns `AssetRestriction` (formerly typed as `TransferDiagnosis`). Key fields:

- `canBuyLong` — false when `OPEN_LONG_RESTRICTED`
- `canTransferIn` — false when either restriction is active
- `reasonCode` — `"OPEN_LONG_RESTRICTED" | "MAX_COLLATERAL_EXCEEDED" | "BOTH" | "NONE"`
- `plainEnglish` — agent-facing explanation
- `customerReply` — copy-paste customer reply (updated 2026-04-30 to reflect Margin Buy Long Risk Control, not just transfer-in)

FAQ URL: `https://www.binance.com/en/support/faq/detail/0ec778021b7a4f14b1b334f74b764b77`

## Sources

- [[sources/sessions/2026-04-22-margin-restrictions-build]]

## Related

- [[entities/margin-restrictions]]
- [[entities/binance-sapi-margin]]
- [[entities/vite-config]] — `/api-binance` dev proxy definition
- [[entities/analytics-system]] — Worker also serves `/sapi/*` route now
- [[decisions/2026-04-22-build-time-api-key]]
- [[decisions/2026-04-22-localstorage-per-agent-override]]
- [[decisions/2026-04-27-worker-as-binance-cors-proxy]]
