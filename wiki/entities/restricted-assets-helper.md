---
title: src/margin/restrictedAssets.ts
tags: [entity, margin, helper, binance-sapi, cache]
source: src/margin/restrictedAssets.ts
date: 2026-04-25
status: active
---

# src/margin/restrictedAssets.ts

Helper module that retrieves Binance margin **restricted-asset** data, caches it and keeps the change history. Data layer of component [[entities/margin-restrictions]].

## Endpoint

`GET /sapi/v1/margin/restricted-asset` — `MARKET_DATA` permission level (only `X-MBX-APIKEY` header required, not signed).

## Payload

```ts
type RestrictedPayload = {
  openLongRestrictedAsset: string[];
  maxCollateralExceededAsset: string[];
};
```

Two separate lists — the UI shows them as two sections.

## Storage keys (localStorage)

| Key | Content |
|---|---|
| `binance_api_key_v1` | Per-agent override key (varsa build-time key'i ezer) |
| `margin_restricted_cache_v1` | Son response + `fetchedAt` timestamp |
| `margin_restricted_history_v1` | Diff history: lists of added/removed assets for each snapshot |

## Cache strategy

`CACHE_TTL_MS = 60_000` — 60 seconds. To avoid calling again in the same window. Rate limit friendly.

## Base URL selection

```ts
DEV → ["/api-binance"]                 // Vite proxy CORS bypass
PROD + VITE_MARGIN_PROXY → [PROXY]     // Cloudflare Worker vb.
PROD fallback → [api.binance.com, api1, api2, api3]  // CORS'ta patlar
```

## Key source priority

```
localStorage["binance_api_key_v1"]   →  varsa override
        else
import.meta.env.VITE_BINANCE_API_KEY  →  build-time
```

`hasSharedKey()` check if there is a build-time key; If this does not happen, the UI shows the "enter your own key" prompt.

## History tracking

On each successful fetch, it is compared to the previous snapshot:
- `added.openLong` / `added.maxCollateral` → new additions this time
- `removed.openLong` / `removed.maxCollateral` → shields this time

The agent can give the user an approximate answer to the question "When was the restriction of coin X removed?"

## Sources

- [[sources/sessions/2026-04-22-margin-restrictions-build]]

## Related

- [[entities/margin-restrictions]]
- [[entities/binance-sapi-margin]]
- [[entities/vite-config]] — `/api-binance` dev proxy definition
- [[decisions/2026-04-22-build-time-api-key]]
- [[decisions/2026-04-22-localstorage-per-agent-override]]
- [[concepts/transfer-in-restriction]]
