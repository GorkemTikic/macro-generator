---
title: vite.config.ts
tags: [entity, build, vite, proxy]
source: vite.config.ts
date: 2026-04-25
status: active
---

# vite.config.ts

Vite build + dev server configuration.

## Critical settings

### `base: "/macro-generator/"`

For GitHub Pages sub-path deployment — the site is served at `https://gorkemtikic.github.io/macro-generator/`.

### Dev proxy: `/api-binance`

```ts
proxy: {
  "/api-binance": {
    target: "https://api.binance.com",
    changeOrigin: true,
    secure: true,
    rewrite: (p) => p.replace(/^\/api-binance/, ""),
  }
}
```

**Cause**: browser cannot assign cross-origin request directly to `api.binance.com` with header `X-MBX-APIKEY` (CORS preflight is rejected). In Dev, Vite proxy adds the header server-side and bypasses it.

**In Production**: this proxy does not exist (GitHub Pages static). Solution: A Cloudflare Worker URL is given in the `VITE_MARGIN_PROXY` env var; o forwards.

## Sources

- [[sources/sessions/2026-04-22-margin-restrictions-build]] — this file was added/updated in that session

## Related

- [[entities/restricted-assets-helper]] — `/api-binance` single consumer
- [[bugs/2026-04-22-cors-failed-to-fetch]]
- [[decisions/2026-04-22-vite-dev-proxy-for-cors]]
- [[sources/docs/2026-04-22-deployment-guide]]
