---
title: .env.example (Margin Restrictions env config)
tags: [source, doc, security, env]
source: .env.example
date: 2026-04-22
status: active
---

# .env.example summary

Environment variable template that should be copied to `.env.local`. For the Margin Restrictions feature.

## Defined variables

| Yes | Purpose |
|---|---|
| `VITE_BINANCE_API_KEY` | Build-time embedded Binance MARKET_DATA key — all agents share |
| `VITE_MARGIN_PROXY` | (Optional) CORS proxy URL in Production — e.g. Cloudflare Worker |

## Security notes (explicitly documented in the file)

> **WARNING:** VITE_* values are baked into the built JS bundle. If your GitHub Pages deployment is public, the key will be extractable from the client bundle by anyone who loads the page.

> For a read-only MARKET_DATA key the worst case is rate-limit abuse. If that is not acceptable, use a serverless proxy instead of baking the key in.

Recommendations written in the file:
- Read-only key
- IP-whitelisted key
- No secret needed (HMAC signature is not required for this endpoint)
- `.env.local` gitignored (`*.local` pattern)

## Dev vs Prod proxy

In Dev, Vite automatically proxy `/api-binance/* → api.binance.com` (vite.config.ts). This is not available in prod → `VITE_MARGIN_PROXY` is used or `api.binance.com` is tried directly (it explodes in CORS).

## Open topics

- `.env.example` Written for Margin Restrictions but not mentioned in the README — difficult to discover new developers
- URL `VITE_MARGIN_PROXY` not provided — margin feature in production **possibly broken**

## Sources

- `.env.example` (committed at 2026-04-22)

## Related

- [[entities/restricted-assets-helper]]
- [[entities/vite-config]]
- [[decisions/2026-04-22-build-time-api-key]]
- [[decisions/2026-04-22-localstorage-per-agent-override]]
- [[bugs/2026-04-22-leaked-api-credentials]]
- [[bugs/2026-04-22-cors-failed-to-fetch]]
