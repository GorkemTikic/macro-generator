---
title: Vite dev proxy /api-binance (CORS bypass)
tags: [decision, dev, cors]
source: vite.config.ts
date: 2026-04-22
status: active
---

# Decision: `/api-binance/*` Vite forwarded to api.binance.com via proxy in Dev

## Context

Margin SAPI endpoint requires `X-MBX-APIKEY` header. Browser cannot cross-origin this header to `api.binance.com` (CORS preflight is rejected). [[bugs/2026-04-22-cors-failed-to-fetch]].

Result: "failed to fetch" error on `npm run dev`.

## Decision

`vite.config.ts`'e dev-only proxy eklendi:

```ts
proxy: {
  "/api-binance": {
    target: "https://api.binance.com",
    changeOrigin: true,
    rewrite: (p) => p.replace(/^\/api-binance/, ""),
  }
}
```

[[entities/restricted-assets-helper]] selects base as `"/api-binance"` in dev; Vite forwards the request transparently, CORS is bypassed in the browser (server-server communication).

## Production status

GitHub Pages **static** — No Vite proxy. Two ways for Production:

1. `VITE_MARGIN_PROXY` env var → external CORS-enabled proxy URL (örn. Cloudflare Worker)
2. Try direct to `api.binance.com` hosts (it explodes on CORS — the documentation clearly states this)

## Sources

- [[sources/sessions/2026-04-22-margin-restrictions-build]]

## Related

- [[entities/vite-config]]
- [[entities/restricted-assets-helper]]
- [[bugs/2026-04-22-cors-failed-to-fetch]]
