---
title: "Failed to fetch" — CORS preflight reddi (Margin SAPI)
tags: [bug, cors, networking]
source: sources/sessions/2026-04-22-margin-restrictions-build.md
date: 2026-04-22
status: fixed
---

# Bug: "failed to fetch" error from the browser to Margin SAPI

## Symptom

Session 530e, 21:20:
> "I just keep receiving error: failed to fetch..."

Margin Restrictions feature was not working on `npm run dev`. Network tab was showing CORS preflight (OPTIONS) rejection.

## Root cause

The browser automatically performs **preflight OPTIONS** when a **non-simple custom header** such as `X-MBX-APIKEY` is added to cross-origin POST/GETs. `api.binance.com` permissive Access-Control-Allow-Headers are not returned to this OPTIONS → preflight fail → actual request is not sent.

[[concepts/binance-fapi-fallback]] multi-host fallback **does not solve** this — all Binance hosts are on the same CORS policy.

## Fix

[[entities/vite-config]]'e dev-only proxy:

```ts
proxy: { "/api-binance": { target: "https://api.binance.com", changeOrigin: true, rewrite: ... } }
```

[[entities/restricted-assets-helper]] selects the base URL as `"/api-binance"` in dev mode. Vite dev adds server header server-side — bypassing the browser CORS process.

See [[decisions/2026-04-22-vite-dev-proxy-for-cors]].

## What will happen in Production?

GitHub Pages **static** — dev proxy yok. Çözüm: `VITE_MARGIN_PROXY` env var ile external CORS-enabled proxy (Cloudflare Worker önerisi). [[sources/docs/2026-04-22-env-example]].

## Course found

Fallback hosts are insufficient for endpoints with X-MBX-APIKEY header — either a proxy or a backend-mediated request is required.

## Sources

- [[sources/sessions/2026-04-22-margin-restrictions-build]]

## Related

- [[entities/vite-config]]
- [[entities/restricted-assets-helper]]
- [[decisions/2026-04-22-vite-dev-proxy-for-cors]]
- [[entities/binance-sapi-margin]]
